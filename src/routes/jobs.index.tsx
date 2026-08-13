import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CATEGORIES, fetchJobs } from "@/lib/queries";

export const Route = createFileRoute("/jobs/")({
  head: () => ({
    meta: [
      { title: "Job Portal — SkillBridge Placements" },
      {
        name: "description",
        content:
          "Entry-level roles from SkillBridge partner employers across web development, design, marketing, administration and AI operations.",
      },
      { property: "og:title", content: "Job Portal — SkillBridge Placements" },
      { property: "og:description", content: "Search partner vacancies and track your applications." },
    ],
  }),
  component: JobsPage,
});

const TYPES = ["Full-time", "Part-time", "Internship", "Contract"];

function JobsPage() {
  const { data: jobs } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [type, setType] = useState("All");
  const [location, setLocation] = useState("All");

  const locations = useMemo(
    () => Array.from(new Set((jobs ?? []).map((j) => j.location))).sort(),
    [jobs],
  );

  const list = (jobs ?? []).filter((j) => {
    const text = `${j.title} ${j.company} ${j.category}`.toLowerCase();
    return (
      (q === "" || text.includes(q.toLowerCase())) &&
      (category === "All" || j.category === category) &&
      (type === "All" || j.job_type === type) &&
      (location === "All" || j.location === location)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="border-b border-border">
        <div className="container-page py-14">
          <p className="eyebrow">Placement</p>
          <h1 className="mt-4 text-3xl leading-tight font-semibold md:text-4xl">Job portal</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink">
            Vacancies shared by partner employers who recruit from SkillBridge cohorts. Certified
            learners are shortlisted first.
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            Looking for interview and CV advice?{" "}
            <Link to="/career-guidance" className="text-primary hover:underline">
              Read the career guidance resources
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="container-page py-10">
        <div className="grid gap-3 border border-border p-4 md:grid-cols-4">
          <div className="flex items-center gap-2 rounded-md border border-input px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              maxLength={80}
              placeholder="Search role or company"
              className="w-full bg-transparent py-2.5 text-sm outline-none"
            />
          </div>
          <Select value={category} onChange={setCategory} options={["All", ...CATEGORIES]} label="Category" />
          <Select value={type} onChange={setType} options={["All", ...TYPES]} label="Job type" />
          <Select value={location} onChange={setLocation} options={["All", ...locations]} label="Location" />
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          {list.length} {list.length === 1 ? "vacancy" : "vacancies"}
        </p>

        <div className="mt-4 divide-y divide-border border border-border">
          {list.map((job) => (
            <Link
              key={job.id}
              to="/jobs/$jobId"
              params={{ jobId: job.id }}
              className="block p-6 transition-colors hover:bg-surface"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">{job.category}</p>
                  <h2 className="mt-2 text-lg font-semibold">{job.title}</h2>
                  <p className="mt-1 text-sm text-ink">{job.company}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5 sm:justify-end">
                    <MapPin className="h-3.5 w-3.5" strokeWidth={1.6} />
                    {job.location}
                  </p>
                  <p className="mt-1">{job.job_type}</p>
                  <p className="mt-1">{job.salary_range}</p>
                </div>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink">{job.description}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                Posted {new Date(job.posted_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </Link>
          ))}
          {list.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">No vacancies match these filters.</p>
          )}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function Select({
  value, onChange, options, label,
}: { value: string; onChange: (v: string) => void; options: readonly string[]; label: string }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o === "All" ? `${label}: all` : o}</option>
        ))}
      </select>
    </label>
  );
}
