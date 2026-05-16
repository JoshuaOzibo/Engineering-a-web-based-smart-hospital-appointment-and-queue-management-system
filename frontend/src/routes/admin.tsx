import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users, CalendarCheck, Building2, Stethoscope,
  Clock, CheckCircle2, XCircle, Loader2, Lock,
  Mail, Eye, EyeOff, ShieldCheck, LogOut,
  AlertTriangle, RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { adminApi, appointmentApi, doctorApi, departmentApi, type BackendAppointment, type BackendDoctor, type BackendDepartment } from "@/lib/api";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Center — Mediqueue" }] }),
  component: AdminPage,
});

// ── Admin session (localStorage, no JWT from backend) ─────────────────────────
const ADMIN_KEY = "mq_admin";
type AdminSession = { email: string };

function getAdminSession(): AdminSession | null {
  try { return JSON.parse(localStorage.getItem(ADMIN_KEY) ?? "null"); } catch { return null; }
}
function setAdminSession(s: AdminSession) { localStorage.setItem(ADMIN_KEY, JSON.stringify(s)); }
function clearAdminSession() { localStorage.removeItem(ADMIN_KEY); }

// ── Static chart data (wait time — queue system Phase 4) ─────────────────────
const waitData = Array.from({ length: 12 }, (_, i) => ({ h: `${8 + i}h`, w: 8 + Math.round(Math.sin(i / 2) * 4 + (i > 4 && i < 9 ? 6 : 0)) }));

type Tab = "overview" | "appointments" | "doctors" | "departments";

// ── Root component ────────────────────────────────────────────────────────────
function AdminPage() {
  const [admin, setAdmin] = useState<AdminSession | null>(getAdminSession);
  const [tab, setTab] = useState<Tab>("overview");

  if (!admin) {
    return <AdminLogin onSuccess={(email) => { setAdminSession({ email }); setAdmin({ email }); }} />;
  }

  return (
    <AppLayout
      title="Hospital operations"
      subtitle="St. Helena Medical Center · Admin Center"
      actions={
        <button onClick={() => { clearAdminSession(); setAdmin(null); }}
          className="h-9 px-3 rounded-lg border border-border text-sm font-medium inline-flex items-center gap-2 hover:bg-muted text-muted-foreground">
          <LogOut className="size-4" /> Sign out
        </button>
      }
    >
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 mb-6 w-fit">
        {([["overview","Overview"],["appointments","Appointments"],["doctors","Doctors"],["departments","Departments"]] as [Tab,string][]).map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn("h-8 px-4 rounded-lg text-sm font-medium transition-colors",
              tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {label}
          </button>
        ))}
      </div>

      {tab === "overview"     && <OverviewTab />}
      {tab === "appointments" && <AppointmentsTab />}
      {tab === "doctors"      && <DoctorsTab />}
      {tab === "departments"  && <DepartmentsTab />}
    </AppLayout>
  );
}

// ── Admin Login ───────────────────────────────────────────────────────────────
function AdminLogin({ onSuccess }: { onSuccess: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await adminApi.signin({ email, password });
      if (res.message === "Login Successful") { onSuccess(email); }
      else { setError(res.message || "Login failed"); }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center"><ShieldCheck className="size-6" /></div>
            <div>
              <h1 className="text-xl font-bold">Admin Center</h1>
              <p className="text-sm text-muted-foreground">St. Helena Medical Center</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium">Admin email</span>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input id="admin-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="admin@hospital.com"
                  className="w-full h-11 pl-10 pr-3 rounded-xl border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
              </div>
            </label>
            <label className="block">
              <span className="text-sm font-medium">Password</span>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input id="admin-password" type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="Admin password"
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 text-sm">
                <AlertTriangle className="size-4 shrink-0" /> {error}
              </div>
            )}

            <button id="admin-signin-btn" type="submit" disabled={loading}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <><ShieldCheck className="size-4" /> Sign in as Admin</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminApi.getDashboard(),
    staleTime: 1000 * 30,
  });

  const kpis = [
    { k: "Registered patients", v: data?.usersRegistered?.length ?? 0, icon: Users, color: "bg-blue-500/10 text-blue-500" },
    { k: "Total appointments", v: data?.totalAppointments ?? 0, icon: CalendarCheck, color: "bg-primary/10 text-primary" },
    { k: "Pending approval", v: data?.totalPendingAppointments ?? 0, icon: Clock, color: "bg-warning/20 text-warning-foreground" },
    { k: "Approved doctors", v: data?.docApproved?.length ?? 0, icon: Stethoscope, color: "bg-success/15 text-success" },
  ];

  const deptData = (data?.department ?? []).map((d, i) => ({
    d: d.deptName.slice(0, 10),
    v: Math.max(5, (data?.appApproved?.length ?? 0) - i * 3 + Math.round(Math.random() * 10)),
  }));

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ k, v, icon: Icon, color }) => (
          <div key={k} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{k}</div>
              <div className={cn("size-9 rounded-lg grid place-items-center", color)}><Icon className="size-4" /></div>
            </div>
            {isLoading
              ? <div className="mt-3 h-8 w-16 rounded-lg bg-muted animate-pulse" />
              : <div className="mt-3 text-3xl font-semibold tracking-tight">{v}</div>}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">Wait time — today</div>
            <span className="text-xs text-muted-foreground">in minutes (simulated)</span>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={waitData}>
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
          <div className="text-sm font-semibold mb-4">Appointments by department</div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData.length ? deptData : [{ d: "—", v: 0 }]} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="d" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={72} />
                <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="v" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pending summary */}
      {(data?.docPending?.length ?? 0) > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-warning/10 border border-warning/20 text-warning-foreground px-5 py-4 text-sm">
          <AlertTriangle className="size-4 shrink-0" />
          <span><strong>{data!.docPending.length}</strong> doctor{data!.docPending.length > 1 ? "s" : ""} awaiting approval. Go to the <strong>Doctors</strong> tab.</span>
        </div>
      )}
    </div>
  );
}

// ── Appointments Tab ──────────────────────────────────────────────────────────
function AppointmentsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("pending");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-appointments"],
    queryFn: () => appointmentApi.getAllAdmin(),
    staleTime: 1000 * 30,
  });

  const all = data?.appointments ?? [];
  const shown = filter === "all" ? all : all.filter(a => filter === "pending" ? !a.status : a.status);

  const approveMutation = useMutation({
    mutationFn: (id: string) => appointmentApi.approve(id),
    onSuccess: () => { toast.success("Appointment approved."); qc.invalidateQueries({ queryKey: ["admin-appointments"] }); qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => appointmentApi.reject(id),
    onSuccess: () => { toast.success("Appointment rejected and removed."); qc.invalidateQueries({ queryKey: ["admin-appointments"] }); qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
      <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(["pending","all","approved"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("h-7 px-3 rounded-md text-xs font-medium capitalize transition-colors",
                filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={() => refetch()} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <RefreshCw className="size-3.5" /> Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground bg-surface">
            <tr>
              {["Patient","Doctor","Problem","Date","Status","Actions"].map(h => (
                <th key={h} className="text-left font-medium px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-3"><div className="h-4 rounded bg-muted animate-pulse w-24" /></td>
                    ))}
                  </tr>
                ))
              : shown.length === 0
              ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground text-sm">No appointments found.</td></tr>
              )
              : shown.map(a => (
                <tr key={a._id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-5 py-3 font-medium">{a.patientFirstName}</td>
                  <td className="px-5 py-3 text-muted-foreground">Dr. {a.docFirstName}</td>
                  <td className="px-5 py-3 text-muted-foreground max-w-[180px] truncate">{a.problemDescription ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                    {a.appointmentDate ? new Date(a.appointmentDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn("text-[11px] px-2 py-1 rounded-full font-medium",
                      a.status ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground")}>
                      {a.status ? "Approved" : "Pending"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {!a.status && (
                      <div className="flex items-center gap-2">
                        <ActionBtn label="Approve" icon={CheckCircle2} tone="success"
                          loading={approveMutation.isPending && approveMutation.variables === a._id}
                          onClick={() => approveMutation.mutate(a._id)} />
                        <ActionBtn label="Reject" icon={XCircle} tone="danger"
                          loading={rejectMutation.isPending && rejectMutation.variables === a._id}
                          onClick={() => { if (window.confirm("Reject and delete this appointment?")) rejectMutation.mutate(a._id); }} />
                      </div>
                    )}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Doctors Tab ───────────────────────────────────────────────────────────────
function DoctorsTab() {
  const qc = useQueryClient();
  const [showAll, setShowAll] = useState(false);

  const { data: allData, isLoading: allLoading } = useQuery({
    queryKey: ["admin-all-doctors"],
    queryFn: () => doctorApi.getAll(),
    staleTime: 1000 * 30,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: boolean }) => doctorApi.updateStatus(id, status),
    onSuccess: (_, { status }) => {
      toast.success(status ? "Doctor approved." : "Doctor application rejected.");
      qc.invalidateQueries({ queryKey: ["admin-all-doctors"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const all = allData?.doctor ?? [];
  const pending = all.filter(d => !d.status);
  const approved = all.filter(d => d.status);
  const displayed = showAll ? all : pending;

  return (
    <div className="space-y-4">
      {/* Pending banner */}
      {pending.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-warning/10 border border-warning/20 text-warning-foreground px-5 py-3 text-sm">
          <AlertTriangle className="size-4" />
          <span><strong>{pending.length}</strong> pending application{pending.length > 1 ? "s" : ""} require your review.</span>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="text-sm font-semibold flex items-center gap-2">
            <Stethoscope className="size-4 text-primary" />
            {showAll ? `All doctors (${all.length})` : `Pending approval (${pending.length})`}
          </div>
          <button onClick={() => setShowAll(v => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
            {showAll ? <><ChevronUp className="size-3.5" />Show pending only</> : <><ChevronDown className="size-3.5" />Show all</>}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-surface">
              <tr>
                {["Doctor","Qualifications","Experience","City","Status","Actions"].map(h => (
                  <th key={h} className="text-left font-medium px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-t border-border">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-5 py-3"><div className="h-4 rounded bg-muted animate-pulse w-24" /></td>
                      ))}
                    </tr>
                  ))
                : displayed.length === 0
                ? <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground text-sm">
                    {showAll ? "No doctors in the database yet." : "No pending applications. "}
                  </td></tr>
                : displayed.map(d => (
                    <tr key={d._id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-5 py-3">
                        <div className="font-medium">{d.doctorName}</div>
                        <div className="text-xs text-muted-foreground">{d.email}</div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground max-w-[160px] truncate">{d.qualifications}</td>
                      <td className="px-5 py-3 text-muted-foreground">{d.experience}</td>
                      <td className="px-5 py-3 text-muted-foreground">{d.city}</td>
                      <td className="px-5 py-3">
                        <span className={cn("text-[11px] px-2 py-1 rounded-full font-medium",
                          d.status ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground")}>
                          {d.status ? "Approved" : "Pending"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {!d.status && (
                          <div className="flex items-center gap-2">
                            <ActionBtn label="Approve" icon={CheckCircle2} tone="success"
                              loading={statusMutation.isPending && (statusMutation.variables as { id: string }).id === d._id}
                              onClick={() => statusMutation.mutate({ id: d._id, status: true })} />
                            <ActionBtn label="Reject" icon={XCircle} tone="danger"
                              loading={statusMutation.isPending && (statusMutation.variables as { id: string }).id === d._id}
                              onClick={() => { if (window.confirm(`Reject Dr. ${d.doctorName}'s application?`)) statusMutation.mutate({ id: d._id, status: false }); }} />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Departments Tab ───────────────────────────────────────────────────────────
function DepartmentsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentApi.getAll(),
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div className="text-sm font-semibold flex items-center gap-2">
          <Building2 className="size-4 text-primary" /> Departments ({data?.length ?? 0})
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground bg-surface">
            <tr>
              {["ID","Department","About"].map(h => (
                <th key={h} className="text-left font-medium px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    {[80, 140, 240].map((w, j) => (
                      <td key={j} className="px-5 py-3"><div className={`h-4 rounded bg-muted animate-pulse w-${w <= 80 ? "20" : w <= 140 ? "36" : "60"}`} /></td>
                    ))}
                  </tr>
                ))
              : (data ?? []).length === 0
              ? <tr><td colSpan={3} className="px-5 py-12 text-center text-muted-foreground text-sm">No departments configured yet.</td></tr>
              : (data ?? []).map(d => (
                  <tr key={d._id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{d.departmentId}</td>
                    <td className="px-5 py-3 font-medium">{d.deptName}</td>
                    <td className="px-5 py-3 text-muted-foreground max-w-xs truncate">{d.about}</td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Shared: action button ─────────────────────────────────────────────────────
function ActionBtn({ label, icon: Icon, tone, loading, onClick }: {
  label: string; icon: React.ElementType; tone: "success" | "danger"; loading: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={loading}
      className={cn("inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium border disabled:opacity-50",
        tone === "success"
          ? "border-success/30 text-success hover:bg-success/10"
          : "border-destructive/30 text-destructive hover:bg-destructive/10")}>
      {loading ? <Loader2 className="size-3 animate-spin" /> : <Icon className="size-3" />}
      {label}
    </button>
  );
}
