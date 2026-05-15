import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Activity, AlertCircle, CheckCircle2, Clock, Users } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/doctor")({
  head: () => ({ meta: [{ title: "Doctor Console — Mediqueue" }] }),
  component: DoctorPage,
});

const appts = [
  { time: "09:00", name: "Sara Ahmed", reason: "Follow-up · Hypertension", status: "Done", room: "304" },
  { time: "09:30", name: "Marcus Johnson", reason: "Chest discomfort", status: "Done", room: "304" },
  { time: "10:00", name: "Lina Park", reason: "ECG review", status: "In room", room: "304" },
  { time: "10:30", name: "Hannah Liu", reason: "New patient consultation", status: "Waiting", room: "304" },
  { time: "11:00", name: "Diego Alvarez", reason: "Medication review", status: "Waiting", room: "304" },
  { time: "11:30", name: "Priya Raman", reason: "Cardiac stress test review", status: "Waiting", room: "304" },
  { time: "13:30", name: "Yusuf Aydın", reason: "Annual check-up", status: "Scheduled", room: "304" },
];

const trend = Array.from({ length: 8 }).map((_, i) => ({ h: `${8 + i}:00`, seen: 2 + Math.round(Math.sin(i / 2) * 2 + i / 2) }));

function DoctorPage() {
  return (
    <AppLayout title="Good morning, Dr. Weiss" subtitle="Tuesday, January 14 · Cardiology · Room 304">
      <div className="grid gap-6 lg:grid-cols-4">
        <Stat k="Patients waiting" v="6" tone="primary" icon={Users} hint="2 high-priority" />
        <Stat k="Completed" v="9" tone="success" icon={CheckCircle2} hint="of 14 today" />
        <Stat k="Avg. consult" v="14m" tone="info" icon={Clock} hint="Goal 12m" />
        <Stat k="Emergencies" v="1" tone="warning" icon={AlertCircle} hint="Triage now" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div className="text-sm font-semibold">Today's appointments</div>
            <div className="text-xs text-muted-foreground">14 scheduled</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-surface">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Time</th>
                  <th className="text-left font-medium px-5 py-3">Patient</th>
                  <th className="text-left font-medium px-5 py-3">Reason</th>
                  <th className="text-left font-medium px-5 py-3">Status</th>
                  <th className="text-right font-medium px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {appts.map((a, i) => (
                  <tr key={i} className="border-t border-border hover:bg-muted/40">
                    <td className="px-5 py-3 font-medium">{a.time}</td>
                    <td className="px-5 py-3">
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-muted-foreground">ID 1042{i}</div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{a.reason}</td>
                    <td className="px-5 py-3">
                      <StatusPill s={a.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button className="text-primary text-xs font-medium hover:underline">Open chart</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="text-sm font-semibold inline-flex items-center gap-2"><Activity className="size-4 text-primary" /> Patients seen — today</div>
            <div className="mt-4 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="h" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={24} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                  <Line type="monotone" dataKey="seen" stroke="var(--color-primary)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="text-sm font-semibold">Queue priorities</div>
            <ul className="mt-3 space-y-2">
              {[
                { n: "Lina Park", p: "High", r: "Chest pain" },
                { n: "Hannah Liu", p: "Normal", r: "New patient" },
                { n: "Diego Alvarez", p: "Normal", r: "Med review" },
              ].map((q) => (
                <li key={q.n} className="flex items-center justify-between rounded-xl bg-surface px-3 py-2.5">
                  <div>
                    <div className="text-sm font-medium">{q.n}</div>
                    <div className="text-xs text-muted-foreground">{q.r}</div>
                  </div>
                  <span className={cn("text-[11px] px-2 py-1 rounded-full font-medium",
                    q.p === "High" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
                    {q.p}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Stat({ k, v, tone, icon: Icon, hint }: { k: string; v: string; tone: "primary" | "success" | "warning" | "info"; icon: any; hint: string }) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    info: "bg-info/15 text-info-foreground",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{k}</div>
        <div className={cn("size-9 rounded-lg grid place-items-center", tones[tone])}><Icon className="size-4" /></div>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{v}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    "Done": "bg-success/15 text-success",
    "In room": "bg-primary/10 text-primary",
    "Waiting": "bg-warning/20 text-warning-foreground",
    "Scheduled": "bg-muted text-muted-foreground",
  };
  return <span className={cn("text-[11px] px-2 py-1 rounded-full font-medium", map[s])}>{s}</span>;
}
