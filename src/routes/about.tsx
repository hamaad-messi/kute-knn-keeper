import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About the Programme — SkillLoop" },
      {
        name: "description",
        content:
          "SkillLoop is a not-for-profit digital skilling programme working with employers and public bodies to move unemployed youth into first jobs.",
      },
      { property: "og:title", content: "About the Programme — SkillLoop" },
      {
        property: "og:description",
        content: "Our mission, programme structure and partner organisations.",
      },
    ],
  }),
  component: About,
});

const PARTNERS = [
  "Meridian Digital Systems",
  "Kavach Consumer Goods",
  "Anvaya Brand Studio",
  "Northline Technologies",
  "Trellis Analytics",
  "State Skill Development Mission",
];

function About() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="border-b border-border">
        <div className="container-page max-w-3xl py-16 lg:py-24">
          <p className="eyebrow">About SkillLoop</p>
          <h1 className="mt-5 text-3xl leading-tight font-semibold md:text-4xl">
            Employment is the outcome we measure. Everything else is a means to it.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-ink">
            SkillLoop was established in 2021 as a not-for-profit skilling initiative after a
            regional labour survey found that 41% of graduates in our operating districts had not
            held formal employment eighteen months after finishing their degree. The gap was rarely
            aptitude. It was the absence of demonstrable, current digital skills and a credible
            route to an employer.
          </p>
          <p className="mt-4 text-base leading-relaxed text-ink">
            We run five course tracks, each designed with input from hiring managers at partner
            organisations and revised every two cohorts. Learners are assessed rather than simply
            marked present, and every certificate carries a verifiable identifier that employers can
            check against our records.
          </p>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="container-page py-16">
          <p className="eyebrow">Programme overview</p>
          <div className="mt-8 grid gap-px border border-border bg-border md:grid-cols-3">
            {[
              {
                title: "Eligibility",
                body: "Applicants aged 18–29 who have completed secondary education and are not currently in full-time employment. No prior technical background required.",
              },
              {
                title: "Structure",
                body: "Four to eight weeks per track, delivered online with recorded modules, downloadable references and a summative assessment.",
              },
              {
                title: "Placement support",
                body: "Access to the partner job portal, application tracking, interview preparation resources and referral for twelve months after certification.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-background p-7">
                <h2 className="text-lg font-semibold">{item.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-ink">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <p className="eyebrow">Partner organisations</p>
        <h2 className="mt-3 text-2xl md:text-3xl">Employers and institutions we work with</h2>
        <div className="mt-10 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {PARTNERS.map((name) => (
            <div key={name} className="flex h-28 items-center justify-center bg-background px-6">
              <span className="text-center font-serif text-base text-muted-foreground">{name}</span>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Partner marks shown as text placeholders pending brand approval.
        </p>
      </section>
      <SiteFooter />
    </div>
  );
}
