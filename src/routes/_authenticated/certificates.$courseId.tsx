import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { Wordmark } from "@/components/Wordmark";
import { useAuth } from "@/lib/auth";
import { fetchCertificates, fetchIsAdmin, fetchProfile } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/certificates/$courseId")({
  head: () => ({
    meta: [
      { title: "Certificate of Completion — SkillLoop" },
      { name: "description", content: "Official SkillLoop certificate of completion with verification code." },
      { property: "og:title", content: "Certificate of Completion — SkillLoop" },
      { property: "og:description", content: "A verified SkillLoop training certificate." },
    ],
  }),
  component: CertificateView,
});

function CertificateView() {
  const { courseId } = Route.useParams();
  const { user } = useAuth();
  const uid = user!.id;
  const { data: isAdmin } = useQuery({ queryKey: ["isAdmin", uid], queryFn: () => fetchIsAdmin(uid) });
  const { data: certificates } = useQuery({ queryKey: ["certificates", uid], queryFn: () => fetchCertificates(uid) });
  const { data: profile } = useQuery({ queryKey: ["profile", uid], queryFn: () => fetchProfile(uid) });

  const cert = (certificates ?? []).find((c) => c.course_id === courseId);
  const name = profile?.full_name?.trim() || user?.email || "SkillLoop Learner";

  return (
    <DashboardShell
      title="Certificate"
      description={cert?.courses?.title}
      isAdmin={isAdmin ?? false}
      actions={
        cert ? (
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Download className="h-4 w-4" strokeWidth={1.6} />
            Download PDF
          </button>
        ) : undefined
      }
    >
      <Link to="/certificates" className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All certificates
      </Link>

      {!cert ? (
        <p className="text-sm text-muted-foreground">
          No certificate has been issued for this course yet.
        </p>
      ) : (
        <>
          <div className="print-certificate mx-auto max-w-3xl border border-border-strong bg-card p-10 sm:p-14">
            <div className="border border-border p-8 text-center sm:p-12">
              <div className="flex justify-center"><Wordmark /></div>
              <p className="eyebrow mt-8">Certificate of Completion</p>
              <p className="mt-6 text-sm text-ink">This certifies that</p>
              <p className="mt-3 font-serif text-3xl font-semibold sm:text-4xl">{name}</p>
              <p className="mt-6 text-sm text-ink">has successfully completed the training programme</p>
              <p className="mt-3 font-serif text-2xl font-semibold">{cert.courses?.title}</p>
              <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-ink">
                including all required modules and the final graded assessment, meeting the
                SkillLoop standard for job-ready {cert.courses?.category} competency.
              </p>

              <div className="mt-12 grid gap-8 border-t border-border pt-8 text-left sm:grid-cols-3">
                <div>
                  <p className="eyebrow">Issued on</p>
                  <p className="mt-1 text-sm">
                    {new Date(cert.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div>
                  <p className="eyebrow">Certificate ID</p>
                  <p className="mt-1 text-sm">{cert.code}</p>
                </div>
                <div>
                  <p className="eyebrow">Programme Director</p>
                  <p className="mt-1 font-serif text-lg">A. Mensah</p>
                  <p className="text-xs text-muted-foreground">SkillLoop Institute</p>
                </div>
              </div>
            </div>
          </div>
          <p className="mx-auto mt-6 max-w-3xl text-center text-xs text-muted-foreground">
            Verify this certificate using ID {cert.code}. Employers may confirm authenticity through the
            SkillLoop placement office.
          </p>
        </>
      )}
    </DashboardShell>
  );
}
