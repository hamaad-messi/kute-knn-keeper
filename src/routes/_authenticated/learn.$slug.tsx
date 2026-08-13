import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FileText, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchCourseBySlug, fetchIsAdmin, fetchLessons, fetchProgress, fetchQuizzes } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/learn/$slug")({
  head: () => ({
    meta: [
      { title: "Course Player — SkillBridge" },
      { name: "description", content: "Work through course modules and mark lessons complete." },
      { property: "og:title", content: "Course Player — SkillBridge" },
      { property: "og:description", content: "SkillBridge learning view with module list and progress." },
    ],
  }),
  component: LearnView,
});

function LearnView() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const uid = user!.id;
  const queryClient = useQueryClient();
  const [activeIndex, setActiveIndex] = useState(0);

  const { data: isAdmin } = useQuery({ queryKey: ["isAdmin", uid], queryFn: () => fetchIsAdmin(uid) });
  const { data: course } = useQuery({ queryKey: ["course", slug], queryFn: () => fetchCourseBySlug(slug) });
  const { data: lessons } = useQuery({
    queryKey: ["lessons", course?.id],
    queryFn: () => fetchLessons(course!.id),
    enabled: Boolean(course?.id),
  });
  const { data: progress } = useQuery({ queryKey: ["progress", uid], queryFn: () => fetchProgress(uid) });
  const { data: quizzes } = useQuery({ queryKey: ["quizzes"], queryFn: fetchQuizzes });

  const list = lessons ?? [];
  const active = list[activeIndex];
  const doneIds = new Set((progress ?? []).map((p) => p.lesson_id));
  const done = list.filter((l) => doneIds.has(l.id)).length;
  const percent = list.length === 0 ? 0 : Math.round((done / list.length) * 100);
  const quiz = (quizzes ?? []).find((q) => q.course_id === course?.id);

  const complete = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase.from("lesson_progress").insert({
        user_id: uid, course_id: course!.id, lesson_id: lessonId,
      });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress", uid] });
      toast.success("Lesson marked complete");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DashboardShell
      title={course?.title ?? "Course"}
      description={`${done} of ${list.length} lessons complete`}
      isAdmin={isAdmin ?? false}
    >
      <div className="mb-6">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Course progress</span>
          <span>{percent}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full bg-surface">
          <div className="h-1.5 bg-primary" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="border border-border">
          <p className="eyebrow border-b border-border p-4">Modules</p>
          <ol className="divide-y divide-border">
            {list.map((lesson, i) => (
              <li key={lesson.id}>
                <button
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    "flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-surface",
                    i === activeIndex && "bg-surface",
                  )}
                >
                  {doneIds.has(lesson.id) ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                  ) : lesson.kind === "pdf" ? (
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
                  ) : (
                    <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
                  )}
                  <span>
                    <span className="block text-sm">{lesson.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {lesson.kind === "pdf" ? "Reading" : "Video"} · {lesson.duration_min} min
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {quiz && (
            <div className="border-t border-border p-4">
              <Link to="/quiz/$quizId" params={{ quizId: quiz.id }} className="text-xs font-medium text-primary hover:underline">
                Take the course assessment
              </Link>
            </div>
          )}
        </aside>

        <section>
          {active ? (
            <>
              <div className="border border-border">
                {active.kind === "pdf" ? (
                  <div className="bg-surface p-10">
                    <div className="mx-auto max-w-2xl border border-border bg-background p-10">
                      <p className="eyebrow">Reading material</p>
                      <h2 className="mt-3 text-xl">{active.title}</h2>
                      <p className="mt-4 leading-relaxed text-ink">{active.body}</p>
                      <p className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
                        Document viewer placeholder — page 1 of 6
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-foreground/90">
                    <div className="text-center">
                      <PlayCircle className="mx-auto h-14 w-14 text-background/70" strokeWidth={1.2} />
                      <p className="mt-4 text-sm text-background/70">
                        Video player placeholder · {active.duration_min}:00
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="eyebrow">Lesson {activeIndex + 1} of {list.length}</p>
                  <h2 className="mt-2 text-xl">{active.title}</h2>
                  <p className="mt-3 leading-relaxed text-ink">{active.body}</p>
                </div>
                <button
                  type="button"
                  disabled={doneIds.has(active.id) || complete.isPending}
                  onClick={() => complete.mutate(active.id)}
                  className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:bg-surface disabled:text-muted-foreground"
                >
                  {doneIds.has(active.id) ? "Completed" : "Mark as Complete"}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Loading modules…</p>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
