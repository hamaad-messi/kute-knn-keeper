import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardShell } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchIsAdmin } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Account Settings — SkillLoop" },
      { name: "description", content: "Change your SkillLoop account password and review account details." },
      { property: "og:title", content: "Account Settings — SkillLoop" },
      { property: "og:description", content: "Manage your SkillLoop learner account." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const { data: isAdmin } = useQuery({ queryKey: ["isAdmin", user!.id], queryFn: () => fetchIsAdmin(user!.id) });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPassword("");
    setConfirm("");
    toast.success("Password changed");
  }

  return (
    <DashboardShell title="Settings" description="Account and security" isAdmin={isAdmin ?? false}>
      <div className="grid max-w-4xl gap-8 lg:grid-cols-2">
        <form onSubmit={submit} className="space-y-4 border border-border p-6">
          <h2 className="text-lg">Change password</h2>
          <p className="text-sm text-ink">Use at least eight characters. You stay signed in after the change.</p>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="input-line"
          />
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            className="input-line"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>

        <div className="border border-border p-6">
          <h2 className="text-lg">Account</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="eyebrow">Email address</dt>
              <dd className="mt-1">{user?.email}</dd>
            </div>
            <div>
              <dt className="eyebrow">Account role</dt>
              <dd className="mt-1">{isAdmin ? "Administrator" : "Learner"}</dd>
            </div>
            <div>
              <dt className="eyebrow">Registered</dt>
              <dd className="mt-1">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </DashboardShell>
  );
}
