import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Activity, Bell, Clock, Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/queue")({
  head: () => ({ meta: [{ title: "Live Queue — Mediqueue" }] }),
  component: QueuePage,
});

const departments = [
  { id: "card", name: "Cardiology", waiting: 8, avg: 14 },
  { id: "gen", name: "General Medicine", waiting: 12, avg: 9 },
  { id: "ped", name: "Pediatrics", waiting: 5, avg: 7 },
  { id: "der", name: "Dermatology", waiting: 4, avg: 11 },
];

function QueuePage() {
  const [tab, setTab] = useState(departments[0].id);
  const [position, setPosition] = useState(3);
  const [now, setNow] = useState(41);

  useEffect(() => {
    const t = setInterval(() => {
      setNow((n) => n + 1);
      setPosition((p) => (p > 0 ? p - (Math.random() > 0.7 ? 1 : 0) : 0));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const dept = departments.find((d) => d.id === tab)!;
  const wait = Math.max(2, position * Math.round(dept.avg * 0.9));

  return (
    <AppLayout title="Live queue" subtitle="Real-time updates from every department.">
      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{dept.name} · Floor 3</div>
              <div className="mt-2 text-sm text-muted-foreground">Your queue number</div>
              <div className="mt-1 text-6xl md:text-7xl font-semibold tracking-tight">A‑042</div>
            </div>
            <div className="rounded-2xl bg-success/10 text-success px-4 py-3 text-right">
              <div className="text-xs">On track</div>
              <div className="text-2xl font-semibold inline-flex items-center gap-1"><Clock className="size-5" /> {wait} min</div>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{position} patients ahead of you</span>
              <span className="font-medium">{Math.round(((dept.waiting - position) / dept.waiting) * 100)}%</span>
            </div>
            <div className="mt-2 h-2.5 rounded-full bg-muted overflow-hidden">
              <motion.div className="h-full bg-primary"
                animate={{ width: `${Math.round(((dept.waiting - position) / dept.waiting) * 100)}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }} />
            </div>
          </div>

          <AnimatePresence>
            {position <= 1 && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-6 flex items-center gap-3 rounded-xl bg-primary/10 text-primary border border-primary/20 px-4 py-3">
                <Bell className="size-4" />
                <span className="text-sm font-medium">You're up next — please head to room 304.</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { l: "Now serving", v: `A‑0${now - 1}`, tone: "muted" },
              { l: "In room", v: `A‑0${now}`, tone: "primary" },
              { l: "Next", v: `A‑0${now + 1}`, tone: "muted" },
            ].map((c, i) => (
              <div key={i} className={cn("rounded-xl border p-4 text-center",
                c.tone === "primary" ? "border-primary bg-primary/5" : "border-border bg-surface")}>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.l}</div>
                <div className="mt-1 text-2xl font-semibold">{c.v}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="text-sm font-semibold mb-3">Departments</div>
            <ul className="space-y-1">
              {departments.map((d) => (
                <li key={d.id}>
                  <button onClick={() => setTab(d.id)}
                    className={cn("w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors",
                      tab === d.id ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground")}>
                    <span className="font-medium">{d.name}</span>
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Users className="size-3" /> {d.waiting}
                      <ChevronRight className="size-3.5" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-semibold"><Activity className="size-4 text-primary" /> Hospital activity</div>
            <dl className="mt-4 space-y-3 text-sm">
              <Stat k="Patients seen today" v="284" />
              <Stat k="Average wait" v="11 min" />
              <Stat k="Live queues" v="9" />
            </dl>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-semibold text-foreground">{v}</dd>
    </div>
  );
}
