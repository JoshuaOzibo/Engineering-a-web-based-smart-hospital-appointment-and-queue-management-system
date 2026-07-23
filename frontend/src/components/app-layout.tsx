import { Link, useRouterState } from "@tanstack/react-router";
import {
  Calendar,
  LayoutDashboard,
  Users,
  Activity,
  Bell,
  Stethoscope,
  ShieldCheck,
  Hospital,
  Search,
  LogOut,
  LogIn,
  User,
} from "lucide-react";
import { ReactNode, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { doctorApi } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";

const nav = [
  { to: "/patient", label: "Overview", icon: LayoutDashboard, group: "Patient" },
  { to: "/book", label: "Book Appointment", icon: Calendar, group: "Patient" },
  { to: "/queue", label: "Live Queue", icon: Activity, group: "Patient" },
  { to: "/notifications", label: "Notifications", icon: Bell, group: "Patient" },
  { to: "/profile", label: "My Profile", icon: User, group: "Patient" },
  { to: "/doctor", label: "Doctor Console", icon: Stethoscope, group: "Doctor" },
  { to: "/doctor-appointments", label: "My Appointments", icon: Calendar, group: "Doctor" },
] as const;

export function AppLayout({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, isAuthenticated, logout } = useAuth();

  const showAvailableDoctors =
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/doctor") &&
    !pathname.startsWith("/doctor-appointments");

  // Retrieve doctors to check if user's email belongs to an approved doctor or to show available doctors for patients
  const { data: doctorData } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => doctorApi.getAll(),
    staleTime: 1000 * 60 * 5,
    enabled: (isAuthenticated && !!user?.email) || showAvailableDoctors,
  });

  const availableDoctorsCount = useMemo(() => {
    return (doctorData?.doctor ?? []).filter((d) => d.status && d.isAvailable).length;
  }, [doctorData]);

  const matchedDoctor = (doctorData?.doctor ?? []).find(
    (d) => d.email.toLowerCase() === user?.email?.toLowerCase(),
  );
  const isDoctor = !!matchedDoctor;
  const isApprovedDoctor = matchedDoctor?.status === true;
  const roleLabel = isDoctor
    ? isApprovedDoctor
      ? "Doctor"
      : "Doctor (Pending Approval)"
    : "Patient";

  // Filter groups & navigation links based on role
  const groups = isDoctor ? (["Patient", "Doctor"] as const) : (["Patient"] as const);

  const filteredNav = nav.filter((item) => {
    if (item.group === "Doctor") {
      return isDoctor;
    }
    return true;
  });

  // Derive initials from name
  const initials = user ? `${user.name[0] ?? ""}${user.last_name[0] ?? ""}`.toUpperCase() : "?";

  return (
    <div className="min-h-screen flex w-full bg-surface">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar h-screen sticky top-0 overflow-hidden">
        <Link
          to="/"
          className="flex items-center gap-2 px-6 h-16 border-b border-sidebar-border shrink-0"
        >
          <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center">
            <Hospital className="size-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-sidebar-foreground">Mediqueue</div>
            <div className="text-[11px] text-muted-foreground">St. Helena Medical Center</div>
          </div>
        </Link>
        <nav className="flex-1 px-3 py-5 space-y-6">
          {groups.map((g) => (
            <div key={g}>
              <div className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {g}
              </div>
              <ul className="space-y-1">
                {filteredNav
                  .filter((n) => n.group === g)
                  .map((item) => {
                    const active = pathname === item.to || pathname.startsWith(item.to + "/");
                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-sidebar-foreground hover:bg-sidebar-accent",
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

        {/* Pinned Sign Out / Auth at the bottom of the sidebar */}
        <div className="border-t border-sidebar-border p-4 shrink-0 bg-sidebar">
          {isAuthenticated && user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-full bg-primary/10 text-primary grid place-items-center text-sm font-bold shrink-0">
                  {initials}
                </div>
                <div className="leading-tight flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {user.name} {user.last_name}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{roleLabel}</div>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full h-10 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-destructive flex items-center justify-center gap-2 text-xs font-semibold transition-colors shadow-soft"
              >
                <LogOut className="size-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="w-full h-10 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground flex items-center justify-center gap-2 text-xs font-semibold transition-colors shadow-md"
            >
              <LogIn className="size-4" />
              <span>Sign In to Account</span>
            </Link>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between gap-4 px-6">
          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              placeholder="Search doctors, departments, appointments…"
              className="w-full h-10 rounded-lg border border-input bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring"
            />
          </div>
          <div className="flex items-center justify-end md:justify-between gap-4 w-auto md:w-48 shrink-0">
            <ThemeToggle />
            <Link
              to="/notifications"
              className="relative size-10 grid place-items-center rounded-lg hover:bg-muted"
            >
              <Bell className="size-4 text-foreground" />
              {filteredNav.some((n) => n.to === "/notifications") && (
                <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive" />
              )}
            </Link>
            {showAvailableDoctors && (
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                <Users className="size-4" />
                <span>
                  {availableDoctorsCount} doctor{availableDoctorsCount !== 1 ? "s" : ""} available
                </span>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 md:py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl md:text-[28px] font-semibold text-foreground tracking-tight">
                  {title}
                </h1>
                {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-sidebar border-t border-sidebar-border flex items-center justify-around px-1 z-50 shadow-lg">
        {filteredNav.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-1 py-1 text-[9px] sm:text-[10px] font-semibold transition-colors whitespace-nowrap shrink-0 min-w-0",
                active ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="size-4.5 sm:size-5 shrink-0" />
              <span className="whitespace-nowrap truncate max-w-[65px]">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
        {isAuthenticated ? (
          <button
            onClick={logout}
            className="flex flex-col items-center justify-center gap-0.5 px-1 py-1 text-[9px] sm:text-[10px] font-semibold text-muted-foreground hover:text-destructive whitespace-nowrap shrink-0 min-w-0"
          >
            <LogOut className="size-4.5 sm:size-5 shrink-0" />
            <span className="whitespace-nowrap">Sign Out</span>
          </button>
        ) : (
          <Link
            to="/login"
            className="flex flex-col items-center justify-center gap-0.5 px-1 py-1 text-[9px] sm:text-[10px] font-semibold text-primary whitespace-nowrap shrink-0 min-w-0"
          >
            <LogIn className="size-4.5 sm:size-5 shrink-0" />
            <span className="whitespace-nowrap">Sign In</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
