import { Link, useRouterState } from "@tanstack/react-router";
import { Calendar, LayoutDashboard, Users, Activity, Bell, Stethoscope, ShieldCheck, Hospital, Search } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, group: "Patient" },
  { to: "/book", label: "Book Appointment", icon: Calendar, group: "Patient" },
  { to: "/queue", label: "Live Queue", icon: Activity, group: "Patient" },
  { to: "/notifications", label: "Notifications", icon: Bell, group: "Patient" },
  { to: "/doctor", label: "Doctor Console", icon: Stethoscope, group: "Staff" },
  { to: "/admin", label: "Admin Center", icon: ShieldCheck, group: "Staff" },
] as const;

export function AppLayout({ children, title, subtitle, actions }: { children: ReactNode; title: string; subtitle?: string; actions?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const groups = ["Patient", "Staff"] as const;

  return (
    <div className="min-h-screen flex w-full bg-surface">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
        <Link to="/" className="flex items-center gap-2 px-6 h-16 border-b border-sidebar-border">
          <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center">
            <Hospital className="size-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-sidebar-foreground">Mediqueue</div>
            <div className="text-[11px] text-muted-foreground">St. Helena Medical Center</div>
          </div>
        </Link>
        <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
          {groups.map((g) => (
            <div key={g}>
              <div className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{g}</div>
              <ul className="space-y-1">
                {nav.filter((n) => n.group === g).map((item) => {
                  const active = pathname === item.to || pathname.startsWith(item.to + "/");
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-sidebar-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        <item.icon className="size-4" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="m-3 rounded-xl border border-sidebar-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-accent text-accent-foreground grid place-items-center text-sm font-semibold">SA</div>
            <div className="leading-tight">
              <div className="text-sm font-medium text-foreground">Sara Ahmed</div>
              <div className="text-xs text-muted-foreground">Patient · ID 10428</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center gap-4 px-6">
          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              placeholder="Search doctors, departments, appointments…"
              className="w-full h-10 rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring"
            />
          </div>
          <Link to="/notifications" className="relative size-10 grid place-items-center rounded-lg hover:bg-muted">
            <Bell className="size-4 text-foreground" />
            <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive" />
          </Link>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="size-4" />
            <span>4 staff online</span>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 md:py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl md:text-[28px] font-semibold text-foreground tracking-tight">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
