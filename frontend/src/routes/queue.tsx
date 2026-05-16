import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Bell, Clock, Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { departmentApi } from "@/lib/api";

export const Route = createFileRoute("/queue")({
  head: () => ({ meta: [{ title: "Live Queue — Mediqueue" }] }),
  component: QueuePage,
});

function QueuePage() {
  const { data: deptData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentApi.getAll(),
    staleTime: 1000 * 60 * 5,
  });

  // Build live department list from API; fallback to static while loading
  const departments = useMemo(() => {
    const api = deptData ?? [];
    if (api.length === 0) return STATIC_DEPTS;
    return api.slice(0, 6).map((d, i) => ({
      id: d._id,
      name: d.deptName,
      waiting: STATIC_DEPTS[i % STATIC_DEPTS.length]?.waiting ?? Math.floor(Math.random() * 12) + 2,
      avg: STATIC_DEPTS[i % STATIC_DEPTS.length]?.avg ?? 10,
    }));
  }, [deptData]);

  const [tabId, setTabId] = useState<string>("");
  const [position, setPosition] = useState(3);
  const [now, setNow] = useState(41);
  const [totalSeen, setTotalSeen] = useState(284);

  // Set default tab when departments load
  useEffect(() => {
    if (!tabId && departments.length > 0) {
      setTabId(departments[0].id);
    }
  }, [departments, tabId]);

  // Simulation tick
  useEffect(() => {
    const t = setInterval(() => {
      setNow((n) => n + 1);
      setTotalSeen((n) => n + 1);
      setPosition((p) => (p > 0 ? p - (Math.random() > 0.7 ? 1 : 0) : 0));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const dept = departments.find((d) => d.id === tabId) ?? departments[0];
  const wait = dept ? Math.max(2, position * Math.round(dept.avg * 0.9)) : 0;
  const progress = dept ? Math.round(((dept.waiting - position) / dept.waiting) * 100) : 0;

  return (
    <AppLayout title="Live queue" subtitle="Real-time updates from every department.">
      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Main queue card ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card"
        >
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {dept?.name ?? "—"} · Floor 3
              </div>
              <div className="mt-2 text-sm text-muted-foreground">Your queue number</div>
              <div className="mt-1 text-6xl md:text-7xl font-semibold tracking-tight">A‑042</div>
            </div>
            <div className="rounded-2xl bg-success/10 text-success px-4 py-3 text-right">
              <div className="text-xs">On track</div>
              <div className="text-2xl font-semibold inline-flex items-center gap-1">
                <Clock className="size-5" /> {wait} min
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{position} patients ahead of you</span>
              <span className="font-medium">{Math.min(100, progress)}%</span>
            </div>
            <div className="mt-2 h-2.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                animate={{ width: `${Math.min(100, progress)}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>

          <AnimatePresence>
            {position <= 1 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6 flex items-center gap-3 rounded-xl bg-primary/10 text-primary border border-primary/20 px-4 py-3"
              >
                <Bell className="size-4" />
                <span className="text-sm font-medium">You're up next — please head to the consultation room.</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { l: "Now serving", v: `A‑0${now - 1}`, tone: "muted" },
              { l: "In room",     v: `A‑0${now}`,     tone: "primary" },
              { l: "Next",        v: `A‑0${now + 1}`, tone: "muted" },
            ].map((c, i) => (
              <div key={i} className={cn("rounded-xl border p-4 text-center",
                c.tone === "primary" ? "border-primary bg-primary/5" : "border-border bg-surface")}>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.l}</div>
                <div className="mt-1 text-2xl font-semibold">{c.v}</div>
              </div>
            ))}
          </div>

          {/* Simulated notice */}
          <div className="mt-6 text-xs text-muted-foreground text-center">
            Queue simulation · Real-time backend integration coming in a future release
          </div>
        </motion.div>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Department list (live from API) */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="text-sm font-semibold mb-3">Departments</div>
            <ul className="space-y-1">
              {departments.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => setTabId(d.id)}
                    className={cn("w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors",
                      tabId === d.id ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground")}
                  >
                    <span className="font-medium truncate text-left">{d.name}</span>
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1 shrink-0 ml-2">
                      <Users className="size-3" /> {d.waiting}
                      <ChevronRight className="size-3.5" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Hospital activity (partially live) */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="size-4 text-primary" /> Hospital activity
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <StatRow k="Patients seen today" v={String(totalSeen)} />
              <StatRow k="Avg wait" v={`${dept?.avg ?? 10} min`} />
              <StatRow k="Departments active" v={String(departments.length)} />
            </dl>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-semibold text-foreground">{v}</dd>
    </div>
  );
}

const STATIC_DEPTS = [
  { id: "card", name: "Cardiology",       waiting: 8,  avg: 14 },
  { id: "gen",  name: "General Medicine", waiting: 12, avg: 9  },
  { id: "ped",  name: "Pediatrics",       waiting: 5,  avg: 7  },
  { id: "der",  name: "Dermatology",      waiting: 4,  avg: 11 },
  { id: "ort",  name: "Orthopedics",      waiting: 6,  avg: 16 },
  { id: "ent",  name: "ENT",              waiting: 3,  avg: 8  },
];
