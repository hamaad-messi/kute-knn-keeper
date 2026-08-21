import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Wordmark } from "@/components/Wordmark";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode: Mode } => ({
    mode: search['mode'] === "signup" ? "signup" : "login",
  }),
  head: () => ({
    meta: [
      { title: "Learner Access — SkillLoop" },
      { name: "description", content: "Sign in to your SkillLoop learner account or register for the next cohort." },
      { property: "og:title", content: "Learner Access — SkillLoop" },
      { property: "og:description", content: "Learner login and registration for the SkillLoop bootcamp." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (fullName.trim().length < 2) throw new Error("Please enter your full name.");
        if (password.length < 8) throw new Error("Password must be at least 8 characters.");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setCheckEmail(true);
          return;
        }
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("Signed in");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in is unavailable right now.");
      return;
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="border-b border-border bg-background">
        <div className="container-page flex h-16 items-center justify-between">
          <Wordmark />
          <Link to="/" className="text-sm text-ink hover:text-primary">Back to site</Link>
        </div>
      </div>

      <div className="container-page flex justify-center py-14">
        <div className="w-full max-w-md border border-border bg-background p-8">
          <div className="flex border border-border">
            {(["login", "signup"] as Mode[]).map((m) => (
              <Link
                key={m}
                to="/auth"
                search={{ mode: m }}
                className={cn(
                  "flex-1 py-2.5 text-center text-sm",
                  mode === m ? "bg-primary text-primary-foreground font-medium" : "text-ink hover:bg-surface",
                )}
              >
                {m === "login" ? "Login" : "Sign Up"}
              </Link>
            ))}
          </div>

          {checkEmail ? (
            <div className="mt-8">
              <h1 className="text-xl">Confirm your email</h1>
              <p className="mt-3 text-sm leading-relaxed text-ink">
                We sent a confirmation link to <span className="font-medium">{email}</span>. Open it
                to activate your learner account, then return here to sign in.
              </p>
            </div>
          ) : (
            <>
              <h1 className="mt-8 text-xl">
                {mode === "login" ? "Learner login" : "Create your learner account"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "login"
                  ? "Access your courses, assessments and applications."
                  : "Registration takes under five minutes."}
              </p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                {mode === "signup" && (
                  <Field label="Full name">
                    <input
                      required
                      maxLength={100}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder="Priya Sharma"
                    />
                  </Field>
                )}
                <Field label="Email address">
                  <input
                    required
                    type="email"
                    maxLength={255}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                    placeholder="you@example.com"
                  />
                </Field>
                <Field label="Password">
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                    placeholder="At least 8 characters"
                  />
                </Field>

                {mode === "login" && (
                  <div className="text-right">
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                      Forgot your password?
                    </Link>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
                </button>
              </form>

              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>

              <button
                type="button"
                onClick={google}
                className="w-full rounded-md border border-border-strong py-3 text-sm font-medium text-foreground hover:bg-surface"
              >
                Continue with Google
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}
