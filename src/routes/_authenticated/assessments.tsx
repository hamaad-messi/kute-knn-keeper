import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashboardShell } from "@/components/DashboardShell";
import { useAuth } from "@/lib/auth";
import { fetchAttempts, fetchEnrollments, fetchIsAdmin, fetchQuizzes } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/assessments")({
  head: () => ({
    meta: [
      { title: "Assessments — SkillBridge" },
      { name: "description", content: "Course assessments available to you and your previous attempt history." },
      { property: "og:title", content: "Assessments — SkillBridge" },
      { property: "og:description", content: "Take graded SkillBridge course assessments." },
    ],
  }),
  component: Assessments,
});

function Assessments() {
  const { user } = useAuth();
  const uid = user!.id;
  const { data: isAdmin } = useQuery({ queryKey: ["isAdmin", uid], queryFn: () => fetchIsAdmin(uid) });
  const { data: quizzes } = useQuery({ queryKey: ["quizzes"], queryFn: fetchQuizzes });
  const { data: enrollments } = useQuery({ queryKey: ["enrollments", uid], queryFn: () => fetchEnrollments(uid) });
  const { data: attempts } = useQuery({ queryKey: ["attempts", uid], queryFn: () => fetchAttempts(uid) });

  const courseIds = (enrollments ?? []).map((e) => e.course_id);
  const available = (quizzes ?? []).filter((q) => courseIds.includes(q.course_id));

  return (
    <DashboardShell title="Assessments" description="Graded course evaluations" isAdmin={isAdmin ?? false}>
      <section>
        <h2 className="text-lg">Available assessments</h2>
        <div className="mt-4 divide-y divide-border border border-border">
          {available.map((q) => {
            const best = (attempts ?? []).filter((a) => a.quiz_id === q.id)
              .reduce<number | null>((acc, a) => Math.max(acc ?? 0, Math.round((a.score / a.total) * 100)), null);
            return (
              <div key={q.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-sm font-medium">{q.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {q.courses?.title} · {q.time_limit_min} minute limit · pass mark {q.pass_percentage}%
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {best === null ? "Not attempted" : `Best score ${best}%`}
                  </p>
                </div>
                <Link
                  to="/quiz/$quizId"
                  params={{ quizId: q.id }}
                  className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  {best === null ? "Start assessment" : "Retake"}
                </Link>
              </div>
            );
          })}
          {available.length === 0 && (
            <p className="p-5 text-sm text-muted-foreground">
              Enrol in a course to unlock its assessment.
            </p>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg">Attempt history</h2>
        <div className="mt-4 overflow-x-auto border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface text-left">
              <tr>
                {["Assessment", "Course", "Score", "Result", "Date"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(attempts ?? []).map((a) => (
                <tr key={a.id}>
                  <td className="px-5 py-3">{a.quizzes?.title}</td>
                  <td className="px-5 py-3 text-ink">{a.courses?.title}</td>
                  <td className="px-5 py-3">{a.score}/{a.total} ({Math.round((a.score / a.total) * 100)}%)</td>
                  <td className="px-5 py-3">
                    <span className={a.passed ? "text-primary" : "text-destructive"}>
                      {a.passed ? "Passed" : "Not passed"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
              {(attempts ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-5 py-4 text-sm text-muted-foreground">No attempts recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}
