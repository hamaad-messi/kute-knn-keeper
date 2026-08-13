import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CATEGORIES, fetchCourses } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "Course Catalog — SkillBridge" },
      {
        name: "description",
        content:
          "Browse SkillBridge course tracks in web development, graphic design, digital marketing, MS Office and AI basics.",
      },
      { property: "og:title", content: "Course Catalog — SkillBridge" },
      { property: "og:description", content: "Five assessed digital skill tracks with certification." },
    ],
  }),
  component: Catalog,
});

function Catalog() {
  const [filter, setFilter] = useState<string>("All");
  const { data: courses, isLoading } = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });
  const list = (courses ?? []).filter((c) => filter === "All" || c.category === filter);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="border-b border-border">
        <div className="container-page py-14">
          <p className="eyebrow">Catalog</p>
          <h1 className="mt-4 max-w-2xl text-3xl leading-tight font-semibold md:text-4xl">
            Course tracks
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink">
            Each track combines recorded modules, downloadable references and a graded assessment.
            Certification requires a passing assessment score.
          </p>
        </div>
      </section>

      <section className="container-page py-10">
        <div className="flex flex-wrap gap-2 border-b border-border pb-6">
          {["All", ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={cn(
                "rounded-md border px-4 py-2 text-sm transition-colors",
                filter === cat
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-ink hover:bg-surface",
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="py-16 text-sm text-muted-foreground">Loading catalog…</p>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {list.map((course) => (
              <Link
                key={course.id}
                to="/courses/$slug"
                params={{ slug: course.slug }}
                className="group flex flex-col border border-border bg-card transition-colors hover:border-border-strong"
              >
                <div className="flex h-32 items-end justify-between border-b border-border bg-surface p-5">
                  <span className="font-serif text-2xl leading-none text-muted-foreground">
                    {course.category.split(" ").map((w) => w[0]).join("")}
                  </span>
                  <span className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                    {course.category}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="text-base leading-snug font-semibold group-hover:text-primary">
                    {course.title}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink">{course.summary}</p>
                  <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                    {course.level} · {course.duration_weeks} weeks · {course.instructor_name}
                  </p>
                </div>
              </Link>
            ))}
            {list.length === 0 && (
              <p className="text-sm text-muted-foreground">No courses in this category yet.</p>
            )}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
