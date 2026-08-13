import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { useAuth } from "@/lib/auth";
import { fetchCertificates, fetchIsAdmin } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/certificates/")({
  head: () => ({
    meta: [
      { title: "Certificates — SkillBridge" },
      { name: "description", content: "Certificates issued for the SkillBridge assessments you have passed." },
      { property: "og:title", content: "Certificates — SkillBridge" },
      { property: "og:description", content: "Download and verify your SkillBridge certificates." },
    ],
  }),
  component: Certificates,
});

function Certificates() {
  const { user } = useAuth();
  const uid = user!.id;
  const { data: isAdmin } = useQuery({ queryKey: ["isAdmin", uid], queryFn: () => fetchIsAdmin(uid) });
  const { data: certificates } = useQuery({ queryKey: ["certificates", uid], queryFn: () => fetchCertificates(uid) });

  return (
    <DashboardShell title="Certificates" description="Verified completion records" isAdmin={isAdmin ?? false}>
      {(certificates ?? []).length === 0 ? (
        <div className="border border-border p-8">
          <Award className="h-6 w-6 text-muted-foreground" strokeWidth={1.4} />
          <p className="mt-4 text-sm text-ink">
            No certificates yet. Pass a course assessment to have your certificate issued automatically.
          </p>
          <Link to="/assessments" className="mt-4 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            View assessments
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {(certificates ?? []).map((c) => (
            <div key={c.id} className="border border-border p-6">
              <p className="eyebrow">{c.courses?.category}</p>
              <h2 className="mt-2 text-lg font-semibold">{c.courses?.title}</h2>
              <dl className="mt-4 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between"><dt>Certificate ID</dt><dd className="text-ink">{c.code}</dd></div>
                <div className="flex justify-between">
                  <dt>Issued</dt>
                  <dd className="text-ink">
                    {new Date(c.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </dd>
                </div>
              </dl>
              <Link
                to="/certificates/$courseId"
                params={{ courseId: c.course_id }}
                className="mt-5 inline-block rounded-md border border-border-strong px-4 py-2 text-xs font-medium hover:bg-surface"
              >
                View certificate
              </Link>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
