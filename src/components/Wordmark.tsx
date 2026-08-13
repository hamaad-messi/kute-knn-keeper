import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Wordmark({ className, to = "/" }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={cn("group inline-flex items-baseline gap-1.5", className)}>
      <span className="font-serif text-[1.35rem] leading-none font-semibold tracking-tight text-foreground">
        Skill<span className="text-primary">Bridge</span>
      </span>
      <span className="hidden h-[13px] border-l border-border-strong pl-1.5 text-[10px] leading-none tracking-[0.16em] text-muted-foreground uppercase sm:inline">
        Digital Skill Bootcamp
      </span>
    </Link>
  );
}
