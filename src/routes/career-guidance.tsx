import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/career-guidance")({
  head: () => ({
    meta: [
      { title: "Career Guidance — SkillLoop" },
      {
        name: "description",
        content:
          "Interview preparation, CV structure and first-job advice for SkillLoop learners entering the digital workforce.",
      },
      { property: "og:title", content: "Career Guidance — SkillLoop" },
      { property: "og:description", content: "Practical guidance on CVs, interviews and early career decisions." },
    ],
  }),
  component: CareerGuidance,
});

const ARTICLES = [
  {
    tag: "Interviews",
    title: "Answering “tell me about yourself” without rambling",
    read: "6 min read",
    body: "Structure the answer in three parts: what you have trained in, what you have built, and what role you are looking for. Ninety seconds is enough. Interviewers use this question to calibrate your communication, not to hear your life history.",
  },
  {
    tag: "CV",
    title: "A one-page CV structure for first-time job seekers",
    read: "5 min read",
    body: "Lead with a two-line summary, then projects, then education. Without work history, projects carry the weight — describe what you built, the tools used, and the outcome. Include links that actually open.",
  },
  {
    tag: "Portfolio",
    title: "What employers actually check in a junior portfolio",
    read: "7 min read",
    body: "Three finished pieces beat nine unfinished ones. Hiring managers look for evidence of completion: a deployed site, a delivered design system, a reported campaign. Explain your decisions in one short paragraph per piece.",
  },
  {
    tag: "Interviews",
    title: "Preparing for a practical skills test",
    read: "6 min read",
    body: "Most entry-level assessments are timed and narrow. Practise the fundamentals under time pressure rather than memorising trivia, and ask clarifying questions before you begin — that is assessed too.",
  },
  {
    tag: "Workplace",
    title: "Your first ninety days in a junior role",
    read: "8 min read",
    body: "Document what you learn, ask questions in writing where possible, and confirm expectations weekly with your manager. Early reliability matters more than early brilliance.",
  },
  {
    tag: "Negotiation",
    title: "Discussing salary for an entry-level offer",
    read: "5 min read",
    body: "Research the band for the role and city before the conversation. Give a range with a reason attached, and ask about review cycles — for a first role, the review timeline is often more negotiable than the base figure.",
  },
];

function CareerGuidance() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="border-b border-border">
        <div className="container-page py-14">
          <p className="eyebrow">Resources</p>
          <h1 className="mt-4 text-3xl leading-tight font-semibold md:text-4xl">Career guidance</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink">
            Written by our placement team from recurring questions in mock interviews and employer
            feedback across cohorts.
          </p>
        </div>
      </section>
      <section className="container-page py-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ARTICLES.map((a) => (
            <article key={a.title} className="flex flex-col border border-border p-6">
              <div className="flex items-center justify-between">
                <p className="eyebrow">{a.tag}</p>
                <p className="text-xs text-muted-foreground">{a.read}</p>
              </div>
              <h2 className="mt-3 text-base leading-snug font-semibold">{a.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink">{a.body}</p>
            </article>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
