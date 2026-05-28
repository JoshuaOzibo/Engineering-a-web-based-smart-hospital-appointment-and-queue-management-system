import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { useQuery } from "@tanstack/react-query";
import { Bell, Calendar, Clock, MessageSquare, Phone, AlertCircle, Loader2, CheckCircle2, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { appointmentApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Mediqueue" }] }),
  component: NotificationsPage,
});

const toneMap: Record<string, string> = {
  primary:     "bg-primary/10 text-primary",
  warning:     "bg-warning/20 text-warning-foreground",
  info:        "bg-blue-500/10 text-blue-500",
  destructive: "bg-destructive/10 text-destructive",
  success:     "bg-success/15 text-success",
  muted:       "bg-muted text-muted-foreground",
};

function NotificationsPage() {
  const { user, isAuthenticated } = useAuth();

  // Fetch real appointments to build live reminders
  const { data: apptData, isLoading } = useQuery({
    queryKey: ["my-appointments"],
    queryFn: () => appointmentApi.getMyAppointments(),
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  });

  const appointments = apptData?.appointments ?? [];
  const upcoming = appointments.filter((a) => !a.status);
  const approved = appointments.filter((a) => a.status);

  // Build dynamic notification items from real appointments
  const liveItems = [
    // Upcoming appointment reminders
    ...upcoming.map((a) => ({
      icon: Calendar,
      tone: "primary",
      title: `Upcoming appointment with Dr. ${a.docFirstName}`,
      desc: `${a.appointmentDate ? formatDate(a.appointmentDate) : "Date TBD"}${a.problemDescription ? ` · ${a.problemDescription}` : ""}`,
      when: "Pending confirmation",
    })),
    // Approved appointments
    ...approved.map((a) => ({
      icon: CheckCircle2,
      tone: "success",
      title: `Appointment confirmed — Dr. ${a.docFirstName}`,
      desc: `${a.appointmentDate ? formatDate(a.appointmentDate) : "Date TBD"} · Your appointment has been approved.`,
      when: "Confirmed",
    })),
  ];

  const allItems = liveItems;

  return (
    <AppLayout title="Notifications" subtitle="Reminders, appointment updates and messages from your care team.">
      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Main feed ────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="text-sm font-semibold">
              All notifications
              {liveItems.length > 0 && (
                <span className="ml-2 inline-flex items-center h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {liveItems.length} new
                </span>
              )}
            </div>
            <button className="text-xs text-primary font-medium hover:underline">Mark all as read</button>
          </div>

          {!isAuthenticated ? (
            <div className="flex flex-col items-center py-16 text-center gap-4 px-6">
              <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center"><LogIn className="size-6" /></div>
              <div>
                <div className="font-medium">Sign in to see your notifications</div>
                <div className="text-sm text-muted-foreground mt-1">Appointment reminders and queue alerts will appear here.</div>
              </div>
              <Link to="/login" className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2">
                <LogIn className="size-4" /> Sign in
              </Link>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {allItems.map((n, i) => (
                <li key={i} className={cn("p-5 flex gap-4 hover:bg-muted/30 transition-colors", i < liveItems.length && "bg-primary/5")}>
                  <div className={cn("size-10 rounded-xl grid place-items-center shrink-0", toneMap[n.tone])}>
                    <n.icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-medium text-sm">{n.title}</div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">{n.when}</div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.desc}</p>
                    {i < liveItems.length && (
                      <span className="mt-1 inline-block text-[10px] font-medium text-primary">● Live</span>
                    )}
                  </div>
                </li>
              ))}
              {allItems.length === 0 && (
                <li className="px-5 py-12 text-center text-muted-foreground text-sm">No notifications yet.</li>
              )}
            </ul>
          )}
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="space-y-6">
          {/* Summary */}
          {isAuthenticated && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="text-sm font-semibold mb-4">Your summary</div>
              <dl className="space-y-3 text-sm">
                <SummaryRow k="Pending appointments" v={upcoming.length} tone="warning" />
                <SummaryRow k="Confirmed appointments" v={approved.length} tone="success" />
                <SummaryRow k="Total appointments" v={appointments.length} tone="muted" />
              </dl>
              <Link to="/patient" className="mt-4 flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                View dashboard →
              </Link>
            </div>
          )}

          {/* Notification channels (static UI) */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="text-sm font-semibold">Channels</div>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                { i: MessageSquare, l: "Email reminders",        v: true  },
                { i: Bell,          l: "Push notifications",     v: true  },
                { i: Phone,         l: "Phone call (urgent only)", v: false },
              ].map((c) => (
                <li key={c.l} className="flex items-center justify-between rounded-xl bg-surface px-3 py-2.5">
                  <div className="inline-flex items-center gap-2">
                    <c.i className="size-4 text-muted-foreground" />
                    <span>{c.l}</span>
                  </div>
                  <span className={cn("inline-flex items-center h-6 px-2 rounded-full text-[11px] font-medium",
                    c.v ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                    {c.v ? "On" : "Off"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* SMS preview */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="text-sm font-semibold">Preview SMS</div>
            <div className="mt-4 rounded-xl bg-surface p-4 text-sm">
              <div className="text-xs text-muted-foreground">St. Helena Medical · automated</div>
              <p className="mt-2">
                Hi {user?.name ?? "Patient"}, you have an upcoming appointment. Log in to Mediqueue to view details. Reply STOP to opt out.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}

function SummaryRow({ k, v, tone }: { k: string; v: number; tone: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={cn("font-semibold px-2 py-0.5 rounded-full text-xs", toneMap[tone])}>{v}</dd>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
