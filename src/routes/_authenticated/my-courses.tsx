import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashboardShell } from "@/components/DashboardShell";
import { useAuth } from "@/lib/auth";
import { courseProgress, fetchEnrollments, fetchIsAdmin, fetchLessonsForCourses, fetchProgress } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/my-courses")({
  head: () => ({
    meta: [
      { title: "My Courses — SkillBridge" },
      { name: "description", content: "Every course track you are enrolled in, with completion progress." },
      { property: "og:title", content: "My Courses — SkillBridge" },
      { property: "og:description", content: "Continue your SkillBridge training modules." },
    ],
  }),
  component: MyCourses,
});

function MyCourses() {
  const { user } = useAuth();
  const uid = user!.id;
  const { data: isAdmin } = useQuery({ queryKey: ["isAdmin", uid], queryFn: () => fetchIsAdmin(uid) });
  const { data: enrollments } = useQuery({ queryKey: ["enrollments", uid], queryFn: () => fetchEnrollments(uid) });
  const { data: progress } = useQuery({ queryKey: ["progress", uid], queryFn: () => fetchProgress(uid) });
  const courseIds = (enrollments ?? []).map((e) => e.course_id);
  const { data: lessons } = useQuery({
    queryKey: ["lessonsFor", courseIds],
    queryFn: () => fetchLessonsForCourses(courseIds),
    enabled: courseIds.length > 0,
  });

  return (
    <DashboardShell title="My Courses" description="Enrolled tracks" isAdmin={isAdmin ?? false}>
      {(enrollments ?? []).length === 0 ? (
        <div className="border border-border p-8">
          <p className="text-sm text-ink">You are not enrolled in any course yet.</p>
          <Link to="/courses" className="mt-4 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Browse the catalog
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {(enrollments ?? []).map((e) => {
            const p = courseProgress(e.course_id, lessons ?? [], progress ?? []);
            return (
              <div key={e.id} className="flex flex-col border border-border p-6">
                <p className="eyebrow">{e.courses?.category}</p>
                <h2 className="mt-2 text-lg font-semibold">{e.courses?.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink">{e.courses?.summary}</p>
                <div className="mt-5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{p.done} of {p.total} lessons complete</span>
                    <span>{p.percent}%</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-surface">
                    <div className="h-1.5 bg-primary" style={{ width: `${p.percent}%` }} />
                  </div>
                </div>
                <div className="mt-5 flex gap-3">
                  <Link
                    to="/learn/$slug"
                    params={{ slug: e.courses!.slug }}
                    className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
                  >
                    {p.percent === 0 ? "Start course" : "Continue"}
                  </Link>
                  <Link
                    to="/courses/$slug"
                    params={{ slug: e.courses!.slug }}
                    className="rounded-md border border-border-strong px-4 py-2 text-xs font-medium hover:bg-surface"
                  >
                    Course details
                  </Link>
                </div>
                <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                  Enrolled {new Date(e.enrolled_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
