import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Users, CalendarCheck, Clock, TrendingUp, Building2 } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Center — Mediqueue" }] }),
  component: AdminPage,
});

const wait = Array.from({ length: 12 }).map((_, i) => ({ h: `${8 + i}h`, w: 8 + Math.round(Math.sin(i / 2) * 4 + (i > 4 && i < 9 ? 6 : 0)) }));
const dept = [
  { d: "Cardiology", v: 64 },
  { d: "Pediatrics", v: 52 },
  { d: "Gen Med", v: 88 },
  { d: "Derm", v: 38 },
  { d: "Ortho", v: 47 },
  { d: "ENT", v: 31 },
];

function AdminPage() {
  return (
    <AppLayout title="Hospital operations" subtitle="St. Helena Medical Center · today's overview">
      <div className="grid gap-6 lg:grid-cols-4">
        <Kpi k="Patients today" v="312" delta="+8.2%" icon={Users} />
        <Kpi k="Appointments" v="278" delta="92% completion" icon={CalendarCheck} />
        <Kpi k="Avg wait" v="11 min" delta="−4 min vs last week" icon={Clock} />
        <Kpi k="On-time rate" v="96%" delta="Goal 95%" icon={TrendingUp} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Wait time — today</div>
            <span className="text-xs text-muted-foreground">in minutes</span>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={wait}>
                <defs>
                  <linearGradient id="wg" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="h" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="w" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#wg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="text-sm font-semibold">Department load</div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dept} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="d" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={70} />
                <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="v" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="text-sm font-semibold inline-flex items-center gap-2"><Building2 className="size-4 text-primary" /> Departments</div>
            <button className="text-xs text-primary font-medium">Manage</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-surface">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Department</th>
                  <th className="text-left font-medium px-5 py-3">Active doctors</th>
                  <th className="text-left font-medium px-5 py-3">Patients today</th>
                  <th className="text-left font-medium px-5 py-3">Avg wait</th>
                  <th className="text-left font-medium px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Cardiology", 6, 64, "14 min", "Normal"],
                  ["General Medicine", 12, 88, "9 min", "High load"],
                  ["Pediatrics", 5, 52, "7 min", "Normal"],
                  ["Dermatology", 3, 38, "11 min", "Normal"],
                  ["Orthopedics", 4, 47, "16 min", "Watch"],
                ].map((r, i) => (
                  <tr key={i} className="border-t border-border hover:bg-muted/40">
                    <td className="px-5 py-3 font-medium">{r[0]}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r[1]}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r[2]}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r[3]}</td>
                    <td className="px-5 py-3">
                      <span className={cn("text-[11px] px-2 py-1 rounded-full font-medium",
                        r[4] === "Normal" ? "bg-success/15 text-success"
                          : r[4] === "Watch" ? "bg-warning/20 text-warning-foreground"
                          : "bg-destructive/10 text-destructive")}>
                        {r[4]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="text-sm font-semibold">Live activity</div>
          <ol className="mt-4 space-y-3 text-sm">
            {[
              { t: "Dr. Tanaka started consultation", w: "Room 212 · 1m ago" },
              { t: "Queue alert sent — A‑055", w: "Cardiology · 4m ago" },
              { t: "New appointment booked", w: "Pediatrics · 7m ago" },
              { t: "Shift change scheduled", w: "Nursing · 12m ago" },
            ].map((e, i) => (
              <li key={i} className="rounded-xl bg-surface p-3">
                <div className="font-medium">{e.t}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{e.w}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </AppLayout>
  );
}

function Kpi({ k, v, delta, icon: Icon }: { k: string; v: string; delta: string; icon: any }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{k}</div>
        <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center"><Icon className="size-4" /></div>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{v}</div>
      <div className="mt-1 text-xs text-success">{delta}</div>
    </div>
  );
}
