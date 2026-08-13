import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { fetchCourses } from "@/lib/queries";
import heroImage from "@/assets/hero-classroom.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SkillBridge — Digital Skills Training and Placement" },
      {
        name: "description",
        content:
          "SkillBridge trains unemployed youth in job-ready digital skills across web development, design, marketing, office software and AI, then connects graduates to employers.",
      },
      { property: "og:title", content: "SkillBridge — Digital Skills Training and Placement" },
      {
        property: "og:description",
        content: "Structured training, assessment, certification and placement support for first-time job seekers.",
      },
    ],
  }),
  component: Landing,
});

const STEPS = [
  { n: "01", title: "Register", body: "Create a learner profile with your education background and current skills." },
  { n: "02", title: "Learn", body: "Work through structured video and reading modules at your own pace." },
  { n: "03", title: "Get certified", body: "Pass the course assessment to earn a verifiable SkillBridge certificate." },
  { n: "04", title: "Get placed", body: "Apply to partner employers through the job portal and track every application." },
];

const STATS = [
  { value: "12,480", label: "Learners trained since 2021" },
  { value: "5", label: "Career-aligned course tracks" },
  { value: "3,912", label: "Job placements confirmed" },
  { value: "68%", label: "Placement rate within six months" },
];

const TESTIMONIALS = [
  {
    quote:
      "I finished my B.Com in 2024 and spent eight months without an interview. The front-end track gave me something concrete to show. I joined Meridian as a junior developer in March.",
    name: "Sneha Kulkarni",
    role: "Junior Front-End Developer, Meridian Digital Systems",
  },
  {
    quote:
      "The assessments were harder than I expected, which is why the certificate meant something in interviews. My employer asked to see the module list.",
    name: "Abdul Rahman",
    role: "Social Media Executive, Kavach Consumer Goods",
  },
  {
    quote:
      "I already knew basic Excel. The workplace module taught me pivot tables and reporting standards, and that is exactly what my current role runs on.",
    name: "Meera Joshi",
    role: "Office Administrator, Sundar Infra Projects",
  },
];

function Landing() {
  const { data: courses } = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="border-b border-border">
        <div className="container-page grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <p className="eyebrow">Digital Skill Bootcamp — Admissions open</p>
            <h1 className="mt-5 text-4xl leading-[1.1] font-semibold md:text-5xl">
              Closing the digital skills gap for young people without work.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink">
              SkillBridge is a structured, no-cost bootcamp that takes first-time job seekers from
              foundational digital skills to assessed certification and employer introductions. Five
              career tracks, one continuous pathway from registration to placement.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Start Learning <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/courses"
                className="inline-flex items-center rounded-md border border-border-strong px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface"
              >
                Browse Courses
              </Link>
            </div>
            <ul className="mt-10 grid gap-2.5 text-sm text-ink sm:grid-cols-2">
              {["No tuition fee for eligible applicants", "Assessed certification, not attendance", "Employer-reviewed curriculum", "Placement support for twelve months"].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="border border-border">
            <img
              src={heroImage}
              alt="Learners working at computers in a SkillBridge training classroom"
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="container-page py-16">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 max-w-2xl text-2xl md:text-3xl">
            One pathway, four stages, tracked end to end.
          </h2>
          <div className="mt-10 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <div key={step.n} className="bg-background p-6">
                <p className="font-serif text-xl text-muted-foreground">{step.n}</p>
                <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Course tracks</p>
            <h2 className="mt-3 text-2xl md:text-3xl">Five tracks aligned to hiring demand</h2>
          </div>
          <Link to="/courses" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            View full catalog <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(courses ?? []).map((course) => (
            <Link
              key={course.id}
              to="/courses/$slug"
              params={{ slug: course.slug }}
              className="group flex flex-col border border-border bg-card p-6 transition-colors hover:border-border-strong"
            >
              <p className="eyebrow">{course.category}</p>
              <h3 className="mt-3 text-lg leading-snug font-semibold group-hover:text-primary">
                {course.title}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink">{course.summary}</p>
              <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
                {course.level} · {course.duration_weeks} weeks
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="container-page grid gap-px bg-border py-0 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="bg-surface px-6 py-10">
              <p className="font-serif text-3xl font-semibold md:text-4xl">{stat.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-16">
        <p className="eyebrow">Learner outcomes</p>
        <h2 className="mt-3 text-2xl md:text-3xl">In their words</h2>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="flex flex-col border border-border p-6">
              <blockquote className="flex-1 font-serif text-[1.0625rem] leading-relaxed text-foreground">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-6 border-t border-border pt-4">
                <p className="text-sm font-medium">{t.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-primary">
        <div className="container-page flex flex-col items-start justify-between gap-6 py-14 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl text-primary-foreground">Applications for the September cohort close 12 September 2026.</h2>
            <p className="mt-2 text-sm text-primary-foreground/80">
              Registration takes under five minutes. No prior experience required.
            </p>
          </div>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex items-center gap-2 rounded-md bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface"
          >
            Register now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
