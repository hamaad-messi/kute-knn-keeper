
-- roles
CREATE TYPE public.app_role AS ENUM ('admin','instructor','learner');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  age int,
  education text,
  skills text[] NOT NULL DEFAULT '{}',
  resume_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.email,''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'learner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- courses
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL,
  summary text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  level text NOT NULL DEFAULT 'Beginner',
  duration_weeks int NOT NULL DEFAULT 6,
  instructor_name text NOT NULL DEFAULT '',
  instructor_title text NOT NULL DEFAULT '',
  instructor_bio text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses public read" ON public.courses FOR SELECT USING (true);
CREATE POLICY "courses admin write" ON public.courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'video',
  duration_min int NOT NULL DEFAULT 12,
  position int NOT NULL DEFAULT 1,
  body text NOT NULL DEFAULT ''
);
GRANT SELECT ON public.lessons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons public read" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "lessons admin write" ON public.lessons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own enrollments" ON public.enrollments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own progress" ON public.lesson_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- quizzes
CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  pass_percentage int NOT NULL DEFAULT 60,
  time_limit_min int NOT NULL DEFAULT 10
);
GRANT SELECT ON public.quizzes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quizzes public read" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "quizzes admin write" ON public.quizzes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 1,
  prompt text NOT NULL,
  options text[] NOT NULL,
  correct_index int NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions read" ON public.quiz_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "questions admin write" ON public.quiz_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  score int NOT NULL,
  total int NOT NULL,
  passed boolean NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attempts" ON public.quiz_attempts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE DEFAULT ('SB-' || upper(substr(md5(random()::text),1,8))),
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own certificates" ON public.certificates FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- jobs
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company text NOT NULL,
  location text NOT NULL,
  job_type text NOT NULL DEFAULT 'Full-time',
  category text NOT NULL,
  salary_range text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  requirements text[] NOT NULL DEFAULT '{}',
  company_about text NOT NULL DEFAULT '',
  posted_at date NOT NULL DEFAULT current_date
);
GRANT SELECT ON public.jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs public read" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "jobs admin write" ON public.jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'Applied',
  note text NOT NULL DEFAULT '',
  applied_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own applications" ON public.applications FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- seed courses
INSERT INTO public.courses (slug,title,category,summary,description,level,duration_weeks,instructor_name,instructor_title,instructor_bio) VALUES
('front-end-web-development-fundamentals','Front-End Web Development Fundamentals','Web Development','Build and deploy responsive websites using HTML, CSS and JavaScript.','A structured introduction to building for the web. You will write semantic HTML, style responsive layouts with modern CSS, add interactivity with JavaScript, and publish a portfolio site by the end of the programme.','Beginner',8,'Anita Deshpande','Senior Front-End Engineer','Ten years building consumer web products; previously led the front-end guild at a Pune-based product studio.'),
('introduction-to-graphic-design','Introduction to Graphic Design with Canva & Figma','Graphic Design','Learn layout, typography and brand basics using industry tools.','Design fundamentals taught through practical briefs. Covers composition, colour theory, typographic hierarchy, and delivery of print and digital assets using Canva and Figma.','Beginner',6,'Rahul Menon','Design Lead','Brand and product designer with a decade of agency experience across FMCG and public-sector campaigns.'),
('digital-marketing-social-media-essentials','Digital Marketing & Social Media Essentials','Digital Marketing','Plan, run and measure campaigns across search and social.','From audience research to reporting. Learn content planning, paid social basics, search fundamentals, and how to read an analytics dashboard and defend a budget.','Intermediate',6,'Fatima Sheikh','Growth Marketing Consultant','Former performance marketing manager; has run acquisition budgets for three funded D2C brands.'),
('ms-office-for-the-workplace','MS Office for the Workplace','MS Office','Practical Word, Excel and PowerPoint skills employers test for.','Workplace-ready document, spreadsheet and presentation skills. Includes formulas, pivot tables, mail merge, and formatting standards used in corporate reporting.','Beginner',4,'Joseph Kariuki','Corporate Trainer','Delivers workplace productivity training to public-sector and BPO teams.'),
('ai-tools-for-everyday-productivity','AI Tools for Everyday Productivity','AI Basics','Use AI assistants responsibly for research, writing and analysis.','A grounded introduction to generative AI at work. Covers prompt construction, verification habits, document and data workflows, and the limits and ethics of AI-assisted output.','Beginner',4,'Priya Nair','Applied AI Instructor','Data scientist turned educator, focused on practical AI literacy for non-technical roles.');

-- lessons
INSERT INTO public.lessons (course_id,title,kind,duration_min,position,body)
SELECT c.id, l.title, l.kind, l.duration_min, l.position, l.body FROM public.courses c
JOIN (VALUES
 ('front-end-web-development-fundamentals','How the Web Works','video',14,1,'Clients, servers, DNS and what actually happens when a page loads.'),
 ('front-end-web-development-fundamentals','Semantic HTML Structure','video',18,2,'Document outlines, landmarks and accessible markup.'),
 ('front-end-web-development-fundamentals','CSS Layout: Flexbox and Grid','video',22,3,'Building responsive layouts without hacks.'),
 ('front-end-web-development-fundamentals','Reference: CSS Layout Cheatsheet','pdf',10,4,'A printable summary of layout properties and use cases.'),
 ('front-end-web-development-fundamentals','JavaScript Fundamentals','video',26,5,'Variables, functions, arrays and the DOM.'),
 ('front-end-web-development-fundamentals','Deploying Your Portfolio','video',16,6,'Version control basics and publishing to a static host.'),
 ('introduction-to-graphic-design','Design Principles and Composition','video',15,1,'Balance, contrast, alignment and repetition in practice.'),
 ('introduction-to-graphic-design','Typography for Beginners','video',18,2,'Choosing typefaces and setting readable hierarchy.'),
 ('introduction-to-graphic-design','Colour Theory in Application','video',14,3,'Building palettes that survive real-world printing and screens.'),
 ('introduction-to-graphic-design','Reference: Brand Asset Checklist','pdf',8,4,'What to deliver when handing off a small brand system.'),
 ('introduction-to-graphic-design','Figma Workflow Essentials','video',20,5,'Frames, components and shared libraries.'),
 ('digital-marketing-social-media-essentials','Audience Research and Positioning','video',16,1,'Defining who you are speaking to before you spend.'),
 ('digital-marketing-social-media-essentials','Content Planning and Calendars','video',14,2,'Building a sustainable publishing rhythm.'),
 ('digital-marketing-social-media-essentials','Paid Social Fundamentals','video',20,3,'Campaign structure, targeting and creative testing.'),
 ('digital-marketing-social-media-essentials','Reference: Campaign Reporting Template','pdf',9,4,'A reporting structure you can reuse with clients.'),
 ('digital-marketing-social-media-essentials','Measuring What Matters','video',18,5,'Attribution basics and avoiding vanity metrics.'),
 ('ms-office-for-the-workplace','Professional Documents in Word','video',15,1,'Styles, templates and mail merge.'),
 ('ms-office-for-the-workplace','Excel Formulas and Functions','video',22,2,'Lookup, logic and text functions used daily.'),
 ('ms-office-for-the-workplace','Pivot Tables and Charts','video',18,3,'Summarising data for management reporting.'),
 ('ms-office-for-the-workplace','Reference: Excel Shortcut Sheet','pdf',6,4,'Keyboard shortcuts that measurably speed up work.'),
 ('ms-office-for-the-workplace','Presentations That Hold Attention','video',14,5,'Slide structure, restraint and delivery.'),
 ('ai-tools-for-everyday-productivity','What Generative AI Can and Cannot Do','video',13,1,'A realistic mental model of current systems.'),
 ('ai-tools-for-everyday-productivity','Writing Effective Prompts','video',17,2,'Context, constraints and iteration.'),
 ('ai-tools-for-everyday-productivity','Verification and Responsible Use','video',15,3,'Checking output and handling sensitive information.'),
 ('ai-tools-for-everyday-productivity','Reference: Workplace AI Policy Primer','pdf',7,4,'Questions to ask before using AI on company data.')
) AS l(slug,title,kind,duration_min,position,body) ON l.slug = c.slug;

-- quizzes
INSERT INTO public.quizzes (course_id,title,description,pass_percentage,time_limit_min)
SELECT c.id, q.title, q.description, 60, q.tl FROM public.courses c
JOIN (VALUES
 ('front-end-web-development-fundamentals','Front-End Fundamentals Assessment','Covers HTML structure, CSS layout and core JavaScript concepts.',10),
 ('introduction-to-graphic-design','Design Fundamentals Assessment','Covers composition, typography and colour theory.',8),
 ('digital-marketing-social-media-essentials','Digital Marketing Assessment','Covers audience research, campaign structure and measurement.',8),
 ('ms-office-for-the-workplace','Workplace MS Office Assessment','Covers Word, Excel formulas and presentation practice.',8),
 ('ai-tools-for-everyday-productivity','AI Literacy Assessment','Covers capabilities, prompting and responsible use.',8)
) AS q(slug,title,description,tl) ON q.slug = c.slug;

INSERT INTO public.quiz_questions (quiz_id,position,prompt,options,correct_index)
SELECT qz.id, x.position, x.prompt, x.options, x.correct_index
FROM public.quizzes qz
JOIN public.courses c ON c.id = qz.course_id
JOIN (VALUES
 ('front-end-web-development-fundamentals',1,'Which element best describes the main navigation region of a page?',ARRAY['<div class="nav">','<nav>','<section>','<aside>'],1),
 ('front-end-web-development-fundamentals',2,'Which CSS layout method is designed for one-dimensional alignment?',ARRAY['Grid','Float','Flexbox','Table'],2),
 ('front-end-web-development-fundamentals',3,'What does the "box-sizing: border-box" declaration do?',ARRAY['Includes padding and border in the element width','Removes all margins','Adds a visible border','Centres the element'],0),
 ('front-end-web-development-fundamentals',4,'Which method selects a single element by CSS selector in JavaScript?',ARRAY['document.getElements()','document.querySelector()','document.selectAll()','document.find()'],1),
 ('front-end-web-development-fundamentals',5,'A media query is primarily used to:',ARRAY['Load video files','Apply styles conditionally by viewport','Compress images','Validate forms'],1),
 ('introduction-to-graphic-design',1,'Visual hierarchy is primarily achieved through:',ARRAY['Using more colours','Contrast, scale and spacing','Adding more text','Centring everything'],1),
 ('introduction-to-graphic-design',2,'Kerning refers to:',ARRAY['Space between individual letters','Line height','Paragraph indentation','Font weight'],0),
 ('introduction-to-graphic-design',3,'Which colour model is used for print production?',ARRAY['RGB','HSL','CMYK','HEX'],2),
 ('introduction-to-graphic-design',4,'In Figma, a component is best described as:',ARRAY['A single exported image','A reusable design element with instances','A colour swatch','A comment thread'],1),
 ('digital-marketing-social-media-essentials',1,'A buyer persona is used to:',ARRAY['Set the advertising budget','Describe a representative target customer','Design the logo','Measure page speed'],1),
 ('digital-marketing-social-media-essentials',2,'Click-through rate is calculated as:',ARRAY['Clicks divided by impressions','Impressions divided by clicks','Spend divided by clicks','Conversions divided by spend'],0),
 ('digital-marketing-social-media-essentials',3,'Which is a vanity metric in most campaigns?',ARRAY['Cost per acquisition','Follower count','Conversion rate','Return on ad spend'],1),
 ('digital-marketing-social-media-essentials',4,'A/B testing requires:',ARRAY['Changing several variables at once','Isolating one variable between variants','Running for one hour','Using only organic traffic'],1),
 ('ms-office-for-the-workplace',1,'Which Excel function returns a value from a table by matching a key?',ARRAY['CONCAT','VLOOKUP','TRIM','TODAY'],1),
 ('ms-office-for-the-workplace',2,'A pivot table is primarily used to:',ARRAY['Format cells','Summarise and group large datasets','Print worksheets','Protect a workbook'],1),
 ('ms-office-for-the-workplace',3,'Mail merge in Word is used to:',ARRAY['Send email attachments','Generate personalised documents from a data source','Merge two documents into one','Compress a file'],1),
 ('ms-office-for-the-workplace',4,'Absolute cell reference in Excel is written as:',ARRAY['A1','$A$1','A$','#A1'],1),
 ('ai-tools-for-everyday-productivity',1,'A language model generates responses by:',ARRAY['Searching a verified database','Predicting likely text from patterns','Copying from a fixed answer list','Running a spreadsheet formula'],1),
 ('ai-tools-for-everyday-productivity',2,'"Hallucination" in AI output means:',ARRAY['A rendering error','Confident but factually incorrect content','A slow response','An encrypted answer'],1),
 ('ai-tools-for-everyday-productivity',3,'A well-constructed prompt usually includes:',ARRAY['Only a single keyword','Context, task and constraints','All capital letters','Multiple unrelated questions'],1),
 ('ai-tools-for-everyday-productivity',4,'Before pasting company data into a public AI tool you should:',ARRAY['Check your organisation''s data policy','Translate it first','Convert it to PDF','Nothing, it is always safe'],0)
) AS x(slug,position,prompt,options,correct_index) ON x.slug = c.slug;

-- jobs
INSERT INTO public.jobs (title,company,location,job_type,category,salary_range,description,requirements,company_about,posted_at) VALUES
('Junior Front-End Developer','Meridian Digital Systems','Bengaluru, India','Full-time','Web Development','₹4.2 – 6.0 LPA','Join a six-person product team building customer dashboards. You will implement responsive interfaces from design files and take ownership of small features end to end.',ARRAY['HTML, CSS and JavaScript proficiency','Familiarity with a component framework','Understanding of responsive design','Portfolio of at least two projects'],'Meridian Digital Systems builds workflow software for logistics operators across South Asia. Founded 2016, 140 employees.','2026-07-28'),
('Web Development Intern','Northline Technologies','Remote','Internship','Web Development','₹15,000 / month','A six-month structured internship with weekly mentorship. Contribute to internal tooling and the public marketing site.',ARRAY['Completed a front-end course or equivalent','Basic version control knowledge','Available 30 hours per week'],'Northline Technologies is a services firm delivering web and cloud projects for mid-market clients.','2026-08-02'),
('Graphic Designer','Anvaya Brand Studio','Pune, India','Full-time','Graphic Design','₹3.6 – 5.4 LPA','Produce social, print and packaging assets for retail clients. Work directly with the design lead on brand refresh projects.',ARRAY['Figma and Adobe Creative Suite','Strong typographic sense','Portfolio demonstrating brand work','Ability to take structured feedback'],'Anvaya Brand Studio is an independent branding practice working with food, retail and cultural clients.','2026-07-19'),
('Social Media Executive','Kavach Consumer Goods','Hyderabad, India','Full-time','Digital Marketing','₹3.0 – 4.5 LPA','Own the day-to-day publishing calendar across three brand handles and report weekly on engagement and reach.',ARRAY['Content planning experience','Comfort with analytics dashboards','Clear written English','Basic design tool familiarity'],'Kavach Consumer Goods manufactures household care products distributed across nine states.','2026-08-05'),
('Digital Marketing Associate','Brightpath Learning','Remote','Contract','Digital Marketing','₹35,000 / month','Support paid acquisition for an education client. Manage campaign setup, creative rotation and monthly reporting.',ARRAY['Understanding of paid social platforms','Spreadsheet reporting skills','Attention to budget detail'],'Brightpath Learning is an online skills provider serving 40,000 learners.','2026-07-30'),
('Office Administrator','Sundar Infra Projects','Chennai, India','Full-time','MS Office','₹2.8 – 3.6 LPA','Maintain project documentation, prepare weekly management reports and coordinate site correspondence.',ARRAY['Advanced Excel including pivot tables','Professional document formatting','Organised record keeping'],'Sundar Infra Projects delivers civil infrastructure contracts for state and private clients.','2026-08-08'),
('Data Entry & Reporting Assistant','Civicline Services','Nagpur, India','Part-time','MS Office','₹18,000 / month','Process intake records and produce standardised weekly reports for programme managers.',ARRAY['Accurate data entry','Excel formulas','Confidentiality awareness'],'Civicline Services administers citizen-facing programmes on behalf of public bodies.','2026-08-01'),
('AI Operations Assistant','Trellis Analytics','Remote','Full-time','AI Basics','₹4.8 – 6.5 LPA','Support analysts by preparing documents, running assisted research workflows and verifying AI-generated summaries.',ARRAY['Comfort using AI assistants','Strong verification habits','Clear written communication','Basic spreadsheet skills'],'Trellis Analytics provides research and reporting services to consulting firms.','2026-08-06');
