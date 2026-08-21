import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell, StatCard } from "@/components/DashboardShell";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "Platform Insights — SkillLoop" },
      {
        name: "description",
        content:
          "Reporting section for programme staff: enrolments by category, assessment pass rates and monthly placement outcomes.",
      },
      { property: "og:title", content: "Platform Insights — SkillLoop" },
      {
        property: "og:description",
        content: "Reporting section for enrolments, assessment performance and placements.",
      },
    ],
  }),
  component: Insights,
});

const PANELS = [
  { title: "Enrolments by category", note: "Bar chart — learners per course track" },
  { title: "Assessment pass rate", note: "Pie chart — outcome share across assessments" },
  { title: "Monthly placements", note: "Line chart — learners placed per month", wide: true },
];

function Panel({ title, note }: { title: string; note: string }) {
  return (
    <section className="border border-border bg-card p-6">
      <h3 className="text-base">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      <div className="mt-5 flex h-64 w-full items-center justify-center border border-dashed border-border-strong bg-surface">
        <p className="text-xs text-muted-foreground">No data yet</p>
      </div>
    </section>
  );
}

function Insights() {
  return (
    <DashboardShell title="Insights" description="Platform-wide statistics">
      <div className="border-l-2 border-accent bg-surface p-6">
        <p className="eyebrow">Prototype section</p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink">
          Reporting layout only. Charts and figures will be connected later.
        </p>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total enrolments" value="—" />
        <StatCard label="Assessment pass rate" value="—" />
        <StatCard label="Placements" value="—" />
        <StatCard label="Certificates issued" value="—" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {PANELS.map((p) => (
          <div key={p.title} className={p.wide ? "lg:col-span-2" : undefined}>
            <Panel title={p.title} note={p.note} />
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
