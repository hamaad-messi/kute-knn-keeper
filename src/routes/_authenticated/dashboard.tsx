import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { DashboardShell, StatCard } from "@/components/DashboardShell";
import { useAuth } from "@/lib/auth";
import {
  courseProgress, fetchApplications, fetchCertificates, fetchEnrollments, fetchIsAdmin,
  fetchJobs, fetchLessonsForCourses, fetchProfile, fetchProgress, fetchQuizzes,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Learner Dashboard — SkillBridge" },
      { name: "description", content: "Your course progress, upcoming assessments and recommended vacancies." },
      { property: "og:title", content: "Learner Dashboard — SkillBridge" },
      { property: "og:description", content: "Track training progress and placement activity." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const uid = user!.id;

  const { data: profile } = useQuery({ queryKey: ["profile", uid], queryFn: () => fetchProfile(uid) });
  const { data: isAdmin } = useQuery({ queryKey: ["isAdmin", uid], queryFn: () => fetchIsAdmin(uid) });
  const { data: enrollments } = useQuery({ queryKey: ["enrollments", uid], queryFn: () => fetchEnrollments(uid) });
  const { data: progress } = useQuery({ queryKey: ["progress", uid], queryFn: () => fetchProgress(uid) });
  const { data: certificates } = useQuery({ queryKey: ["certificates", uid], queryFn: () => fetchCertificates(uid) });
  const { data: applications } = useQuery({ queryKey: ["applications", uid], queryFn: () => fetchApplications(uid) });
  const { data: quizzes } = useQuery({ queryKey: ["quizzes"], queryFn: fetchQuizzes });
  const { data: jobs } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });

  const courseIds = (enrollments ?? []).map((e) => e.course_id);
  const { data: lessons } = useQuery({
    queryKey: ["lessonsFor", courseIds],
    queryFn: () => fetchLessonsForCourses(courseIds),
    enabled: courseIds.length > 0,
  });

  const enrolledCategories = new Set((enrollments ?? []).map((e) => e.courses?.category));
  const recommended = (jobs ?? []).filter((j) => enrolledCategories.has(j.category)).slice(0, 3);
  const pendingQuizzes = (quizzes ?? []).filter((q) => courseIds.includes(q.course_id)).slice(0, 4);
  const firstName = (profile?.full_name || user?.email || "learner").split(" ")[0];

  return (
    <DashboardShell
      title="Dashboard"
      description="Programme overview"
      isAdmin={isAdmin ?? false}
    >
      <div className="border border-border bg-surface p-7">
        <p className="eyebrow">Welcome back</p>
        <h2 className="mt-2 font-serif text-2xl font-semibold">{firstName}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink">
          {courseIds.length === 0
            ? "You have not enrolled in a course track yet. Browse the catalog to begin the programme."
            : "Continue where you left off. Assessments unlock as soon as you are enrolled, and certificates are issued on a passing score."}
        </p>
        {courseIds.length === 0 && (
          <Link
            to="/courses"
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Browse courses <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Enrolled courses" value={String(courseIds.length)} />
        <StatCard label="Lessons completed" value={String(progress?.length ?? 0)} />
        <StatCard label="Certificates earned" value={String(certificates?.length ?? 0)} />
        <StatCard label="Applications" value={String(applications?.length ?? 0)} />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <h3 className="text-lg">Course progress</h3>
          <div className="mt-4 divide-y divide-border border border-border">
            {(enrollments ?? []).map((e) => {
              const p = courseProgress(e.course_id, lessons ?? [], progress ?? []);
              return (
                <div key={e.id} className="p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">{e.courses?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.done} of {p.total} lessons · {p.percent}%
                    </p>
                  </div>
                  <div className="mt-3 h-1.5 w-full bg-surface">
                    <div className="h-1.5 bg-primary" style={{ width: `${p.percent}%` }} />
                  </div>
                  <Link
                    to="/learn/$slug"
                    params={{ slug: e.courses!.slug }}
                    className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
                  >
                    Continue course
                  </Link>
                </div>
              );
            })}
            {(enrollments ?? []).length === 0 && (
              <p className="p-5 text-sm text-muted-foreground">No enrolments yet.</p>
            )}
          </div>

          <h3 className="mt-10 text-lg">Upcoming assessments</h3>
          <div className="mt-4 divide-y divide-border border border-border">
            {pendingQuizzes.map((q) => (
              <div key={q.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="text-sm font-medium">{q.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {q.courses?.title} · {q.time_limit_min} minutes · pass mark {q.pass_percentage}%
                  </p>
                </div>
                <Link
                  to="/quiz/$quizId"
                  params={{ quizId: q.id }}
                  className="rounded-md border border-border-strong px-4 py-2 text-xs font-medium hover:bg-surface"
                >
                  Start
                </Link>
              </div>
            ))}
            {pendingQuizzes.length === 0 && (
              <p className="p-5 text-sm text-muted-foreground">
                Assessments appear once you enrol in a course.
              </p>
            )}
          </div>
        </section>

        <aside>
          <h3 className="text-lg">Recommended vacancies</h3>
          <div className="mt-4 divide-y divide-border border border-border">
            {(recommended.length > 0 ? recommended : (jobs ?? []).slice(0, 3)).map((job) => (
              <Link
                key={job.id}
                to="/jobs/$jobId"
                params={{ jobId: job.id }}
                className="block p-5 hover:bg-surface"
              >
                <p className="eyebrow">{job.category}</p>
                <p className="mt-2 text-sm font-medium">{job.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {job.company} · {job.location} · {job.job_type}
                </p>
              </Link>
            ))}
          </div>
          <Link to="/jobs" className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline">
            Open job portal <ArrowRight className="h-4 w-4" />
          </Link>
        </aside>
      </div>
    </DashboardShell>
  );
}
