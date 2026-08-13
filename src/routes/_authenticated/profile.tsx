import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UploadCloud, X } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchIsAdmin, fetchProfile } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — SkillBridge" },
      { name: "description", content: "Maintain the learner profile employers see when you apply." },
      { property: "og:title", content: "My Profile — SkillBridge" },
      { property: "og:description", content: "Education, skills and CV details for your SkillBridge account." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const uid = user!.id;
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["profile", uid], queryFn: () => fetchProfile(uid) });
  const { data: isAdmin } = useQuery({ queryKey: ["isAdmin", uid], queryFn: () => fetchIsAdmin(uid) });

  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [education, setEducation] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState("");
  const [resumeName, setResumeName] = useState("");

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setAge(profile.age ? String(profile.age) : "");
    setEducation(profile.education ?? "");
    setSkills(profile.skills ?? []);
    setResumeName(profile.resume_name ?? "");
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      if (fullName.trim().length < 2) throw new Error("Please enter your full name.");
      const parsedAge = age === "" ? null : Number(age);
      if (parsedAge !== null && (Number.isNaN(parsedAge) || parsedAge < 15 || parsedAge > 80)) {
        throw new Error("Enter a valid age between 15 and 80.");
      }
      const { error } = await supabase.from("profiles").update({
        full_name: fullName.trim().slice(0, 100),
        age: parsedAge,
        education: education.trim().slice(0, 200),
        skills,
        resume_name: resumeName || null,
      }).eq("id", uid);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", uid] });
      toast.success("Profile updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function addSkill() {
    const value = skillDraft.trim().slice(0, 40);
    if (!value || skills.includes(value) || skills.length >= 15) {
      setSkillDraft("");
      return;
    }
    setSkills([...skills, value]);
    setSkillDraft("");
  }

  return (
    <DashboardShell title="My Profile" description="Shared with employers when you apply" isAdmin={isAdmin ?? false}>
      <div className="grid max-w-4xl gap-8 lg:grid-cols-[1fr_260px]">
        <form
          onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
          className="space-y-5 border border-border p-6"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name">
              <input
                value={fullName}
                maxLength={100}
                onChange={(e) => setFullName(e.target.value)}
                className="input-line"
              />
            </Field>
            <Field label="Email address">
              <input value={profile?.email ?? user?.email ?? ""} readOnly className="input-line bg-surface text-muted-foreground" />
            </Field>
            <Field label="Age">
              <input
                value={age}
                inputMode="numeric"
                maxLength={2}
                onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
                className="input-line"
                placeholder="23"
              />
            </Field>
            <Field label="Highest education">
              <input
                value={education}
                maxLength={200}
                onChange={(e) => setEducation(e.target.value)}
                className="input-line"
                placeholder="B.Com, Savitribai Phule Pune University, 2024"
              />
            </Field>
          </div>

          <Field label="Skills">
            <div className="rounded-md border border-input p-3">
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1 text-xs text-ink">
                    {s}
                    <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} aria-label={`Remove ${s}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                value={skillDraft}
                maxLength={40}
                onChange={(e) => setSkillDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSkill(); }
                }}
                onBlur={addSkill}
                placeholder="Type a skill and press Enter"
                className="mt-2 w-full bg-transparent text-sm outline-none"
              />
            </div>
          </Field>

          <Field label="Curriculum vitae">
            <label className="flex cursor-pointer items-center justify-between rounded-md border border-dashed border-border-strong px-4 py-4 text-sm hover:bg-surface">
              <span className="flex items-center gap-3 text-ink">
                <UploadCloud className="h-4 w-4" strokeWidth={1.6} />
                {resumeName || "Select a PDF or DOCX file"}
              </span>
              <span className="text-xs text-muted-foreground">Browse</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => setResumeName(e.target.files?.[0]?.name ?? "")}
              />
            </label>
            <p className="mt-1.5 text-xs text-muted-foreground">
              File name is recorded on your profile. Document storage is not enabled in this build.
            </p>
          </Field>

          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {save.isPending ? "Saving…" : "Save changes"}
          </button>
        </form>

        <aside className="border border-border p-6">
          <p className="eyebrow">Profile photo</p>
          <div className="mt-4 flex h-28 w-28 items-center justify-center border border-border bg-surface font-serif text-3xl text-muted-foreground">
            {(fullName || "S").trim().charAt(0).toUpperCase()}
          </div>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-primary hover:underline">
            <UploadCloud className="h-3.5 w-3.5" />
            Upload photo
            <input type="file" accept="image/*" className="hidden" onChange={() => toast.info("Photo upload is a placeholder in this build.")} />
          </label>
          <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            A complete profile improves shortlisting. Employers see your name, education, skills and
            earned certificates.
          </p>
        </aside>
      </div>
    </DashboardShell>
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
