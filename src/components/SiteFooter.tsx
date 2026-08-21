import { Link } from "@tanstack/react-router";
import { Linkedin, Twitter, Youtube } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div>
          <p className="font-serif text-lg font-semibold">
            Skill<span className="text-primary">Loop</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            A digital skill bootcamp preparing unemployed youth for entry-level roles in the
            technology and services economy.
          </p>
        </div>
        <div>
          <p className="eyebrow">Programme</p>
          <ul className="mt-4 space-y-2.5 text-sm text-ink">
            <li><Link to="/courses" className="hover:text-primary">Course catalog</Link></li>
            <li><Link to="/about" className="hover:text-primary">About the programme</Link></li>
            <li><Link to="/career-guidance" className="hover:text-primary">Career guidance</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Placement</p>
          <ul className="mt-4 space-y-2.5 text-sm text-ink">
            <li><Link to="/jobs" className="hover:text-primary">Job portal</Link></li>
            <li><Link to="/auth" search={{ mode: "signup" }} className="hover:text-primary">Register as a learner</Link></li>
            <li><Link to="/auth" search={{ mode: "login" }} className="hover:text-primary">Learner login</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Contact</p>
          <ul className="mt-4 space-y-2.5 text-sm text-ink">
            <li>Unit 402, Prestige Centre</li>
            <li>Bengaluru 560001, India</li>
            <li>admissions@skillloop.org</li>
            <li>+91 80 4712 9080</li>
          </ul>
          <div className="mt-5 flex gap-4 text-muted-foreground">
            <a href="https://linkedin.com" aria-label="LinkedIn" className="hover:text-foreground"><Linkedin className="h-4 w-4" /></a>
            <a href="https://twitter.com" aria-label="X" className="hover:text-foreground"><Twitter className="h-4 w-4" /></a>
            <a href="https://youtube.com" aria-label="YouTube" className="hover:text-foreground"><Youtube className="h-4 w-4" /></a>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>© 2026 SkillLoop Foundation. All rights reserved.</p>
          <p>Registered skilling partner — placeholder registration no. SB/2021/00418</p>
        </div>
      </div>
    </footer>
  );
}
