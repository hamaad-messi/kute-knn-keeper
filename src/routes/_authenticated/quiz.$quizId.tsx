import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchIsAdmin } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/quiz/$quizId")({
  head: () => ({
    meta: [
      { title: "Assessment — SkillBridge" },
      { name: "description", content: "Complete the multiple-choice course assessment and receive an automatic score." },
      { property: "og:title", content: "Assessment — SkillBridge" },
      { property: "og:description", content: "SkillBridge graded assessment." },
    ],
  }),
  component: QuizPage,
});

type Result = { score: number; total: number; passed: boolean };

function QuizPage() {
  const { quizId } = Route.useParams();
  const { user } = useAuth();
  const uid = user!.id;
  const queryClient = useQueryClient();

  const { data: isAdmin } = useQuery({ queryKey: ["isAdmin", uid], queryFn: () => fetchIsAdmin(uid) });
  const { data: quiz } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes").select("*, courses(id, title, slug)").eq("id", quizId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: questions } = useQuery({
    queryKey: ["quizQuestions", quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_questions").select("*").eq("quiz_id", quizId).order("position");
      if (error) throw error;
      return data;
    },
  });

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (quiz && seconds === null) setSeconds(quiz.time_limit_min * 60);
  }, [quiz, seconds]);

  useEffect(() => {
    if (seconds === null || result) return;
    if (seconds <= 0) {
      void submit();
      return;
    }
    const t = setTimeout(() => setSeconds((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  });

  async function submit() {
    if (!quiz || !questions || busy || result) return;
    setBusy(true);
    const total = questions.length;
    const score = questions.filter((q) => answers[q.id] === q.correct_index).length;
    const percent = total === 0 ? 0 : Math.round((score / total) * 100);
    const passed = percent >= quiz.pass_percentage;

    const { error } = await supabase.from("quiz_attempts").insert({
      user_id: uid,
      quiz_id: quiz.id,
      course_id: quiz.course_id,
      score,
      total,
      passed,
      answers: questions.map((q) => ({ question_id: q.id, selected: answers[q.id] ?? null })),
    });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    if (passed) {
      await supabase.from("certificates")
        .upsert({ user_id: uid, course_id: quiz.course_id }, { onConflict: "user_id,course_id", ignoreDuplicates: true });
    }
    queryClient.invalidateQueries();
    setResult({ score, total, passed });
    setBusy(false);
  }

  if (!quiz || !questions) {
    return (
      <DashboardShell title="Assessment" isAdmin={isAdmin ?? false}>
        <p className="text-sm text-muted-foreground">Loading assessment…</p>
      </DashboardShell>
    );
  }

  const percent = result ? Math.round((result.score / result.total) * 100) : 0;

  if (result) {
    return (
      <DashboardShell title="Assessment result" description={quiz.title} isAdmin={isAdmin ?? false}>
        <div className="max-w-3xl">
          <div className="border border-border p-7">
            <p className="eyebrow">{result.passed ? "Passed" : "Not passed"}</p>
            <p className="mt-3 font-serif text-4xl font-semibold">{percent}%</p>
            <p className="mt-2 text-sm text-ink">
              {result.score} of {result.total} correct · pass mark {quiz.pass_percentage}%
            </p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink">
              {result.passed
                ? "Your certificate has been issued and is available in the Certificates section."
                : "You can retake this assessment. Review the flagged questions below and the related modules before your next attempt."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {result.passed ? (
                <Link
                  to="/certificates/$courseId"
                  params={{ courseId: quiz.course_id }}
                  className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  View certificate
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => { setResult(null); setAnswers({}); setSeconds(quiz.time_limit_min * 60); }}
                  className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Retake assessment
                </button>
              )}
              <Link
                to="/assessments"
                className="rounded-md border border-border-strong px-5 py-2.5 text-sm font-medium hover:bg-surface"
              >
                Back to assessments
              </Link>
            </div>
          </div>

          <h2 className="mt-10 text-lg">Question breakdown</h2>
          <ol className="mt-4 divide-y divide-border border border-border">
            {questions.map((q, i) => {
              const chosen = answers[q.id];
              const correct = chosen === q.correct_index;
              return (
                <li key={q.id} className="p-5">
                  <div className="flex items-start gap-3">
                    {correct ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                    ) : (
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
                    )}
                    <div>
                      <p className="text-sm font-medium">{i + 1}. {q.prompt}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Your answer: {chosen === undefined ? "Not answered" : q.options[chosen]}
                      </p>
                      {!correct && (
                        <p className="mt-1 text-xs text-ink">Correct answer: {q.options[q.correct_index]}</p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </DashboardShell>
    );
  }

  const answered = Object.keys(answers).length;
  const mm = seconds === null ? 0 : Math.floor(seconds / 60);
  const ss = seconds === null ? 0 : seconds % 60;

  return (
    <DashboardShell
      title={quiz.title}
      description={quiz.courses?.title}
      isAdmin={isAdmin ?? false}
      actions={
        <div className="text-right">
          <p className="eyebrow">Time remaining</p>
          <p className="font-serif text-lg leading-none">
            {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
          </p>
        </div>
      }
    >
      <div className="max-w-3xl">
        <div className="border border-border bg-surface p-5 text-sm text-ink">
          {quiz.description} Answer all {questions.length} questions. Pass mark {quiz.pass_percentage}%.
        </div>

        <ol className="mt-6 space-y-4">
          {questions.map((q, i) => (
            <li key={q.id} className="border border-border p-5">
              <p className="text-sm font-medium">{i + 1}. {q.prompt}</p>
              <div className="mt-4 space-y-2">
                {q.options.map((opt, idx) => (
                  <label
                    key={opt}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md border px-4 py-2.5 text-sm transition-colors",
                      answers[q.id] === idx ? "border-primary bg-surface" : "border-border hover:bg-surface",
                    )}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === idx}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: idx }))}
                      className="accent-[var(--color-primary)]"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">{answered} of {questions.length} answered</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Submitting…" : "Submit assessment"}
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
