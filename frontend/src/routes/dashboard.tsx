import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Calendar, Clock, FileText, Bell, Activity, Download, X, RotateCcw, ChevronRight, HeartPulse } from "lucide-react";
import { doctors } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "My Dashboard — Mediqueue" }] }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <AppLayout
      title="Welcome back, Sara"
      subtitle="Here's your care at a glance for today."
      actions={
        <Link to="/book" className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2">
          <Calendar className="size-4" /> Book new
        </Link>
      }
    >
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Queue card */}
        <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Active queue · Cardiology</div>
              <div className="mt-2 flex items-end gap-3">
                <div className="text-5xl font-semibold tracking-tight">A‑042</div>
                <span className="mb-1.5 text-sm text-success inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-success" /> On track
                </span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">Estimated wait — about 12 minutes</div>
            </div>
            <Link to="/queue" className="text-sm font-medium text-primary inline-flex items-center gap-1">View live queue <ChevronRight className="size-4" /></Link>
          </div>
          <div className="mt-6 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full w-2/3 bg-primary rounded-full" />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>3 ahead of you</span><span>You arrived 18 min ago</span>
          </div>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { i: Download, l: "Ticket" },
              { i: RotateCcw, l: "Reschedule" },
              { i: X, l: "Cancel" },
              { i: Bell, l: "Notify me" },
            ].map((a) => (
              <button key={a.l} className="h-11 rounded-xl border border-border bg-surface hover:bg-muted text-sm font-medium inline-flex items-center justify-center gap-2">
                <a.i className="size-4" /> {a.l}
              </button>
            ))}
          </div>
        </section>

        {/* Health reminders */}
        <aside className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-semibold"><HeartPulse className="size-4 text-primary" /> Health reminders</div>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              { t: "Annual check-up due", d: "Last visit was 11 months ago." },
              { t: "Refill: Lisinopril 10mg", d: "Refill request opens Jan 22." },
              { t: "Flu vaccine recommended", d: "Free at any branch." },
            ].map((r) => (
              <li key={r.t} className="rounded-xl border border-border bg-surface p-3">
                <div className="font-medium">{r.t}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{r.d}</div>
              </li>
            ))}
          </ul>
        </aside>

        {/* Upcoming */}
        <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Upcoming appointments</div>
            <Link to="/book" className="text-xs text-primary font-medium">Manage</Link>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {doctors.slice(0, 3).map((d, i) => (
              <li key={d.id} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
                <img src={d.photo} alt="" className="size-12 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{d.name}</div>
                  <div className="text-xs text-muted-foreground">{d.specialty} · Room 30{i + 2}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{d.nextAvailable.split("·")[1]?.trim() ?? d.nextAvailable}</div>
                  <div className="text-xs text-muted-foreground">{d.nextAvailable.split("·")[0]?.trim()}</div>
                </div>
                <span className={cn("hidden sm:inline-flex text-[11px] px-2 py-1 rounded-full font-medium",
                  i === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                  {i === 0 ? "Today" : "Upcoming"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Timeline */}
        <aside className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="text-sm font-semibold inline-flex items-center gap-2"><Activity className="size-4 text-primary" /> Recent visits</div>
          <ol className="mt-4 relative border-l border-border ml-2 space-y-5">
            {[
              { d: "Dec 12", t: "Lab results ready", n: "Cholesterol panel within range." },
              { d: "Nov 28", t: "Follow-up — Cardiology", n: "Blood pressure stable; continue medication." },
              { d: "Oct 04", t: "Annual physical", n: "All vitals normal." },
            ].map((e) => (
              <li key={e.d} className="ml-4">
                <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full bg-primary" />
                <div className="text-xs text-muted-foreground">{e.d}</div>
                <div className="text-sm font-medium mt-0.5">{e.t}</div>
                <div className="text-xs text-muted-foreground">{e.n}</div>
              </li>
            ))}
          </ol>
        </aside>

        {/* Doctor notes */}
        <section className="lg:col-span-3 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold inline-flex items-center gap-2"><FileText className="size-4 text-primary" /> Latest doctor note</div>
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Clock className="size-3" /> Updated 3 days ago</span>
          </div>
          <p className="mt-4 text-sm text-foreground leading-relaxed max-w-3xl">
            Patient is responding well to current treatment. Continue Lisinopril 10mg once daily and maintain low-sodium diet.
            Recommend follow-up in six weeks with repeat lipid panel. No new symptoms reported.
          </p>
          <div className="mt-3 text-xs text-muted-foreground">— Dr. Daniel Weiss, Cardiology</div>
        </section>
      </div>
    </AppLayout>
  );
}
