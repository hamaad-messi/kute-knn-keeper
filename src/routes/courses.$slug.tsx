import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { fetchCourseBySlug, fetchLessons } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/courses/$slug")({
  head: () => ({
    meta: [
      { title: "Course Detail — SkillBridge" },
      { name: "description", content: "Syllabus, instructor and enrolment details for this SkillBridge course track." },
      { property: "og:title", content: "Course Detail — SkillBridge" },
      { property: "og:description", content: "Module list, instructor background and assessment requirements." },
    ],
  }),
  component: CourseDetail,
});

function CourseDetail() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", slug],
    queryFn: () => fetchCourseBySlug(slug),
  });
  const { data: lessons } = useQuery({
    queryKey: ["lessons", course?.id],
    queryFn: () => fetchLessons(course!.id),
    enabled: Boolean(course?.id),
  });
  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", course?.id, user?.id],
    enabled: Boolean(course?.id && user?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments").select("id").eq("course_id", course!.id).eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const enroll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("enrollments").insert({ course_id: course!.id, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Enrolment confirmed");
      navigate({ to: "/learn/$slug", params: { slug } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <p className="container-page py-24 text-sm text-muted-foreground">Loading course…</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container-page py-24">
          <h1 className="text-2xl">Course not found</h1>
          <Link to="/courses" className="mt-4 inline-block text-sm text-primary hover:underline">
            Back to catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="border-b border-border bg-surface">
        <div className="container-page py-14">
          <p className="eyebrow">{course.category}</p>
          <h1 className="mt-4 max-w-3xl text-3xl leading-tight font-semibold md:text-4xl">
            {course.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink">{course.summary}</p>
          <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-6 border-t border-border pt-6 sm:grid-cols-4">
            {[
              ["Level", course.level],
              ["Duration", `${course.duration_weeks} weeks`],
              ["Modules", String(lessons?.length ?? 0)],
              ["Assessment", "Graded"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="eyebrow">{k}</dt>
                <dd className="mt-1 text-sm text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="text-xl">About this course</h2>
          <p className="mt-4 leading-relaxed text-ink">{course.description}</p>

          <h2 className="mt-12 text-xl">Syllabus</h2>
          <ol className="mt-5 divide-y divide-border border border-border">
            {(lessons ?? []).map((lesson, i) => (
              <li key={lesson.id} className="flex items-start gap-4 p-4">
                <span className="w-6 shrink-0 text-sm text-muted-foreground">{i + 1}</span>
                {lesson.kind === "pdf" ? (
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
                ) : (
                  <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
                )}
                <div>
                  <p className="text-sm font-medium">{lesson.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {lesson.kind === "pdf" ? "Reading" : "Video"} · {lesson.duration_min} min
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <aside className="space-y-8">
          <div className="border border-border p-6">
            <p className="eyebrow">Enrolment</p>
            {enrollment ? (
              <>
                <p className="mt-3 text-sm text-ink">You are enrolled in this course.</p>
                <Link
                  to="/learn/$slug"
                  params={{ slug }}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Continue learning
                </Link>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm text-ink">
                  No fee for eligible applicants. Enrolment gives immediate access to all modules and
                  the course assessment.
                </p>
                <button
                  type="button"
                  disabled={enroll.isPending}
                  onClick={() => {
                    if (!user) {
                      navigate({ to: "/auth", search: { mode: "signup" } });
                      return;
                    }
                    enroll.mutate();
                  }}
                  className="mt-4 w-full rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {enroll.isPending ? "Enrolling…" : "Enroll"}
                </button>
              </>
            )}
          </div>

          <div className="border border-border p-6">
            <p className="eyebrow">Instructor</p>
            <p className="mt-3 font-serif text-lg">{course.instructor_name}</p>
            <p className="text-xs text-muted-foreground">{course.instructor_title}</p>
            <p className="mt-3 text-sm leading-relaxed text-ink">{course.instructor_bio}</p>
          </div>
        </aside>
      </div>
      <SiteFooter />
    </div>
  );
}
