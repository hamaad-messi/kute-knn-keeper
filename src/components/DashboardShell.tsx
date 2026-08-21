import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutGrid, User, BookOpen, ClipboardCheck, Award, Briefcase,
  Settings, LogOut, Menu, X, FileText, BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/Wordmark";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/profile", label: "My Profile", icon: User },
  { to: "/my-courses", label: "My Courses", icon: BookOpen },
  { to: "/assessments", label: "Assessments", icon: ClipboardCheck },
  { to: "/certificates", label: "Certificates", icon: Award },
  { to: "/jobs", label: "Job Portal", icon: Briefcase },
  { to: "/applications", label: "Applications", icon: FileText },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function DashboardShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
  isAdmin?: boolean | undefined;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <Wordmark />
        </div>
        <nav className="flex flex-col gap-0.5 p-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{
                className: "bg-sidebar-accent text-sidebar-primary font-medium border border-sidebar-border",
              }}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="p-3">
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.6} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        {sidebar}
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-sidebar-border bg-sidebar">
            {sidebar}
          </aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="flex h-16 items-center justify-between border-b border-border px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg leading-tight font-semibold">{title}</h1>
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
          </div>
          {actions}
        </header>
        <main className={cn("px-5 py-8 lg:px-8")}>{children}</main>
      </div>
    </div>
  );
}

export function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border border-border bg-card p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-serif text-3xl leading-none font-semibold">{value}</p>
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
