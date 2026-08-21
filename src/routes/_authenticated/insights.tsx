import { createFileRoute } from "@tanstack/react-router";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { DashboardShell, StatCard } from "@/components/DashboardShell";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "Platform Insights — SkillLoop" },
      {
        name: "description",
        content:
          "Platform-wide training analytics: enrolments by category, assessment pass rates and monthly placement outcomes.",
      },
      { property: "og:title", content: "Platform Insights — SkillLoop" },
      {
        property: "og:description",
        content: "Illustrative analytics on enrolments, assessment performance and placements.",
      },
    ],
  }),
  component: Insights,
});

const NAVY = "var(--primary)";
const GOLD = "var(--accent)";
const GREY = "var(--muted-foreground)";
const CHARCOAL = "var(--foreground)";
const BORDER = "var(--border)";

const enrolments = [
  { category: "Web Dev", learners: 184 },
  { category: "Design", learners: 132 },
  { category: "Marketing", learners: 96 },
  { category: "Office", learners: 118 },
  { category: "AI Skills", learners: 74 },
];

const passRate = [
  { name: "Passed first attempt", value: 58 },
  { name: "Passed on retake", value: 24 },
  { name: "Not yet passed", value: 18 },
];

const PIE_COLORS = [NAVY, GOLD, GREY];

const placements = [
  { month: "Jan", placements: 12 },
  { month: "Feb", placements: 18 },
  { month: "Mar", placements: 15 },
  { month: "Apr", placements: 24 },
  { month: "May", placements: 31 },
  { month: "Jun", placements: 28 },
  { month: "Jul", placements: 37 },
  { month: "Aug", placements: 42 },
];

const axis = { stroke: GREY, fontSize: 11 };
const tooltipStyle = {
  backgroundColor: "var(--card)",
  border: `1px solid ${BORDER}`,
  borderRadius: 4,
  fontSize: 12,
  color: CHARCOAL,
};

function Panel({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="border border-border bg-card p-6">
      <h3 className="text-base">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      <div className="mt-5 h-64 w-full">{children}</div>
    </section>
  );
}

function Insights() {
  return (
    <DashboardShell title="Insights" description="Platform-wide statistics">
      <div className="border-l-2 border-accent bg-surface p-6">
        <p className="eyebrow">Illustrative data</p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink">
          These panels preview the reporting view for programme staff. Figures shown are placeholders
          and mirror the analytics prepared separately for the programme report.
        </p>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total enrolments" value="604" note="Across five tracks" />
        <StatCard label="Assessment pass rate" value="82%" note="Including retakes" />
        <StatCard label="Placements YTD" value="207" note="Verified offers" />
        <StatCard label="Certificates issued" value="341" note="Passing scores only" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Enrolments by category" note="Learners registered per course track">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={enrolments} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={BORDER} vertical={false} />
              <XAxis dataKey="category" tickLine={false} axisLine={{ stroke: BORDER }} tick={axis} />
              <YAxis tickLine={false} axisLine={false} tick={axis} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface)" }} />
              <Bar dataKey="learners" fill={NAVY} radius={[2, 2, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Assessment pass rate" note="Share of learners by assessment outcome">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={passRate}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={84}
                paddingAngle={2}
                stroke="var(--card)"
              >
                {passRate.map((slice, i) => (
                  <Cell key={slice.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11, color: GREY }} />
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <div className="lg:col-span-2">
          <Panel title="Monthly placements" note="Learners placed into entry-level roles">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={placements} margin={{ top: 4, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={BORDER} vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: BORDER }} tick={axis} />
                <YAxis tickLine={false} axisLine={false} tick={axis} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="placements"
                  stroke={GOLD}
                  strokeWidth={2}
                  dot={{ r: 3, fill: NAVY, stroke: NAVY }}
                  activeDot={{ r: 5, fill: GOLD, stroke: NAVY }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
