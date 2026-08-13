import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/jobs/$jobId")({
  head: () => ({
    meta: [
      { title: "Vacancy Detail — SkillBridge Job Portal" },
      { name: "description", content: "Role description, requirements and employer information for this SkillBridge partner vacancy." },
      { property: "og:title", content: "Vacancy Detail — SkillBridge Job Portal" },
      { property: "og:description", content: "Apply to partner employers through SkillBridge." },
    ],
  }),
  component: JobDetail,
});

function JobDetail() {
  const { jobId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: application } = useQuery({
    queryKey: ["application", jobId, user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("applications").select("*").eq("job_id", jobId).eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const apply = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("applications").insert({ job_id: jobId, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Application submitted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !job) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <p className="container-page py-24 text-sm text-muted-foreground">
          {isLoading ? "Loading vacancy…" : "This vacancy is no longer listed."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="border-b border-border bg-surface">
        <div className="container-page py-12">
          <Link to="/jobs" className="text-xs text-primary hover:underline">← All vacancies</Link>
          <p className="eyebrow mt-6">{job.category}</p>
          <h1 className="mt-3 text-3xl leading-tight font-semibold">{job.title}</h1>
          <p className="mt-2 text-base text-ink">{job.company} · {job.location}</p>
          <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-6 border-t border-border pt-6 sm:grid-cols-3">
            {[
              ["Job type", job.job_type],
              ["Compensation", job.salary_range],
              ["Posted", new Date(job.posted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="eyebrow">{k}</dt>
                <dd className="mt-1 text-sm">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="text-xl">Role description</h2>
          <p className="mt-4 leading-relaxed text-ink">{job.description}</p>
          <h2 className="mt-10 text-xl">Requirements</h2>
          <ul className="mt-4 space-y-2.5">
            {job.requirements.map((r) => (
              <li key={r} className="flex items-start gap-2 text-sm text-ink">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} />
                {r}
              </li>
            ))}
          </ul>
        </div>
        <aside className="space-y-8">
          <div className="border border-border p-6">
            <p className="eyebrow">Application</p>
            {application ? (
              <>
                <p className="mt-3 text-sm text-ink">
                  Applied on{" "}
                  {new Date(application.applied_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
                  Current status: <span className="font-medium">{application.status}</span>.
                </p>
                <Link
                  to="/applications"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-md border border-border-strong px-5 py-3 text-sm font-medium hover:bg-surface"
                >
                  View application tracker
                </Link>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm leading-relaxed text-ink">
                  Your learner profile, completed courses and certificates are shared with the
                  employer when you apply.
                </p>
                <button
                  type="button"
                  disabled={apply.isPending}
                  onClick={() => {
                    if (!user) {
                      navigate({ to: "/auth", search: { mode: "login" } });
                      return;
                    }
                    apply.mutate();
                  }}
                  className="mt-4 w-full rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {apply.isPending ? "Submitting…" : "Apply Now"}
                </button>
              </>
            )}
          </div>
          <div className="border border-border p-6">
            <p className="eyebrow">About the company</p>
            <p className="mt-3 font-serif text-lg">{job.company}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink">{job.company_about}</p>
          </div>
        </aside>
      </div>
      <SiteFooter />
    </div>
  );
}
