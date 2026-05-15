import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Bell, Calendar, Clock, MessageSquare, Phone, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Mediqueue" }] }),
  component: NotificationsPage,
});

const items = [
  { i: Bell, tone: "primary", t: "Your turn is next", d: "Cardiology · Room 304. Please head to the waiting area.", w: "Just now" },
  { i: Clock, tone: "warning", t: "Slight delay", d: "Dr. Weiss is running ~10 minutes behind schedule. Sorry for the wait.", w: "12 min ago" },
  { i: Calendar, tone: "info", t: "Appointment reminder", d: "Tomorrow at 10:30 AM with Dr. Mei Tanaka — General Medicine.", w: "2 hours ago" },
  { i: MessageSquare, tone: "muted", t: "Lab results ready", d: "Your cholesterol panel is available in your patient dashboard.", w: "Yesterday" },
  { i: AlertCircle, tone: "destructive", t: "Action needed", d: "Please confirm your insurance details before your next visit.", w: "2 days ago" },
];

const toneMap: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/20 text-warning-foreground",
  info: "bg-info/15 text-info-foreground",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

function NotificationsPage() {
  return (
    <AppLayout title="Notifications" subtitle="Reminders, queue alerts and messages from your care team.">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="text-sm font-semibold">All notifications</div>
            <button className="text-xs text-primary font-medium">Mark all as read</button>
          </div>
          <ul className="divide-y divide-border">
            {items.map((n, i) => (
              <li key={i} className="p-5 flex gap-4 hover:bg-muted/30">
                <div className={cn("size-10 rounded-xl grid place-items-center shrink-0", toneMap[n.tone])}>
                  <n.i className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium">{n.t}</div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">{n.w}</div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="text-sm font-semibold">Channels</div>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                { i: MessageSquare, l: "SMS reminders", v: true },
                { i: Bell, l: "Push notifications", v: true },
                { i: Phone, l: "Phone call (urgent only)", v: false },
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

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="text-sm font-semibold">Preview — SMS</div>
            <div className="mt-4 rounded-xl bg-surface p-4 text-sm">
              <div className="text-xs text-muted-foreground">St. Helena Medical · today 10:18</div>
              <p className="mt-2">Hi Sara, you're next in queue A‑042 (Cardiology). Please head to Room 304. Reply STOP to opt out.</p>
            </div>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}
