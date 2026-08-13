import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardShell, StatCard } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchApplications, fetchIsAdmin } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({
    meta: [
      { title: "My Applications — SkillBridge" },
      { name: "description", content: "Track the status of every job application you submitted through SkillBridge." },
      { property: "og:title", content: "My Applications — SkillBridge" },
      { property: "og:description", content: "Application tracker for SkillBridge learners." },
    ],
  }),
  component: Applications,
});

const STATUS_STYLE: Record<string, string> = {
  Applied: "border-border text-ink",
  "Under Review": "border-border-strong text-foreground",
  Interview: "border-primary text-primary",
  Offer: "border-primary text-primary",
  Rejected: "border-border text-muted-foreground",
};

function Applications() {
  const { user } = useAuth();
  const uid = user!.id;
  const queryClient = useQueryClient();
  const { data: isAdmin } = useQuery({ queryKey: ["isAdmin", uid], queryFn: () => fetchIsAdmin(uid) });
  const { data: applications } = useQuery({ queryKey: ["applications", uid], queryFn: () => fetchApplications(uid) });

  const withdraw = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("applications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications", uid] });
      toast.success("Application withdrawn");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = applications ?? [];
  const active = list.filter((a) => a.status !== "Rejected").length;
  const interviews = list.filter((a) => a.status === "Interview" || a.status === "Offer").length;

  return (
    <DashboardShell title="My Applications" description="Placement pipeline" isAdmin={isAdmin ?? false}>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total applications" value={String(list.length)} />
        <StatCard label="Active" value={String(active)} note="Not rejected" />
        <StatCard label="Interviews / offers" value={String(interviews)} />
      </div>

      <div className="mt-8 overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface text-left">
            <tr>
              {["Role", "Company", "Applied", "Status", ""].map((h) => (
                <th key={h} className="px-5 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((a) => (
              <tr key={a.id}>
                <td className="px-5 py-4">
                  <Link to="/jobs/$jobId" params={{ jobId: a.job_id }} className="font-medium hover:underline">
                    {a.jobs?.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">{a.jobs?.location} · {a.jobs?.job_type}</p>
                </td>
                <td className="px-5 py-4 text-ink">{a.jobs?.company}</td>
                <td className="px-5 py-4 text-muted-foreground">
                  {new Date(a.applied_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-block border px-2.5 py-1 text-xs ${STATUS_STYLE[a.status] ?? "border-border text-ink"}`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => withdraw.mutate(a.id)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Withdraw
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-sm text-muted-foreground">
                  You have not applied to any roles yet.{" "}
                  <Link to="/jobs" className="text-primary hover:underline">Browse the job portal</Link>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
