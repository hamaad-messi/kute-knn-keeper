import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/Wordmark";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Your Password — SkillBridge" },
      { name: "description", content: "Request a password reset link for your SkillBridge learner account." },
      { property: "og:title", content: "Reset Your Password — SkillBridge" },
      { property: "og:description", content: "Password recovery for SkillBridge learners." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="border-b border-border bg-background">
        <div className="container-page flex h-16 items-center justify-between">
          <Wordmark />
          <Link to="/auth" search={{ mode: "login" }} className="text-sm text-ink hover:text-primary">
            Back to login
          </Link>
        </div>
      </div>
      <div className="container-page flex justify-center py-14">
        <div className="w-full max-w-md border border-border bg-background p-8">
          <h1 className="text-xl">Reset your password</h1>
          {sent ? (
            <p className="mt-4 text-sm leading-relaxed text-ink">
              If an account exists for {email}, a reset link has been sent. The link expires in 60
              minutes.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <p className="text-sm leading-relaxed text-ink">
                Enter the email address registered to your learner account and we will send a reset
                link.
              </p>
              <input
                required
                type="email"
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {busy ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
