import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  Activity,
  CheckCircle2,
  Clock,
  Users,
  Stethoscope,
  Plus,
  Loader2,
  WifiOff,
  CalendarDays,
  Star,
  Trash2,
  ChevronRight,
  Bell,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  doctorApi,
  appointmentApi,
  queueApi,
  type BackendDoctor,
  type BackendAppointment,
  type UpdateDoctorProfileBody,
} from "@/lib/api";
import { useQueueSSE } from "@/lib/useQueueSSE";

const NIGERIAN_CITIES = [
  "Lagos",
  "Abuja",
  "Kano",
  "Ibadan",
  "Port Harcourt",
  "Benin City",
  "Maiduguri",
  "Enugu",
  "Kaduna",
  "Ilorin",
  "Onitsha",
  "Warri",
  "Aba",
  "Owerri",
  "Abeokuta",
  "Sokoto",
  "Uyo",
  "Calabar",
  "Akure",
  "Jos",
  "Bauchi",
  "Zaria",
  "Asaba",
  "Yola",
  "Minna",
];

export const Route = createFileRoute("/doctor")({
  head: () => ({ meta: [{ title: "Doctor Console — Mediqueue" }] }),
  component: DoctorPage,
});

const todayPlus = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-NG", { month: "short", day: "numeric", weekday: "short" });
const isToday = (date: string | undefined): boolean => {
  if (!date) return false;
  try {
    const d = new Date(date);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  } catch {
    return false;
  }
};

// Default slot times a doctor can add
const DEFAULT_SLOTS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
];

function DoctorPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");

  // Slot management state
  const [slotDate, setSlotDate] = useState(todayPlus(0));
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  // Retrieve admin session
  const adminSession =
    typeof window !== "undefined"
      ? (() => {
          try {
            return JSON.parse(localStorage.getItem("mq_admin") ?? "null") as {
              email: string;
            } | null;
          } catch {
            return null;
          }
        })()
      : null;
  const isAdmin = !!adminSession;

  // ── Fetch all doctors (both approved and pending) ──────────────────────────
  const { data: doctorData, isLoading: drLoading } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => doctorApi.getAll(),
    staleTime: 1000 * 60 * 2,
  });
  const doctors = useMemo(() => doctorData?.doctor ?? [], [doctorData]);
  const doctor = doctors.find((d) => d._id === selectedDoctorId) ?? null;

  // Auto-detect logged-in doctor profile (even if pending approval)
  const loggedInDoctor = useMemo(() => {
    if (!isAuthenticated || !user?.email) return null;
    return doctors.find((d) => d.email.toLowerCase() === user.email.toLowerCase()) ?? null;
  }, [doctors, isAuthenticated, user]);

  useEffect(() => {
    if (!drLoading) {
      if (!isAuthenticated) {
        toast.error("Authentication required: Please sign in to access the Doctor Console.");
        navigate({ to: "/login", replace: true });
      } else if (!loggedInDoctor) {
        toast.info("Please configure your professional details to activate your doctor profile.");
        window.location.href = "/profile?register=doctor";
      } else if (loggedInDoctor && selectedDoctorId !== loggedInDoctor._id) {
        setSelectedDoctorId(loggedInDoctor._id);
      }
    }
  }, [drLoading, isAuthenticated, loggedInDoctor, navigate, selectedDoctorId]);

  // ── Fetch only appointments for the selected doctor ─────────────────────────
  const { data: apptData, isLoading: apptLoading } = useQuery({
    queryKey: ["doctor-appointments", selectedDoctorId],
    queryFn: () => appointmentApi.getDoctorAppointments(selectedDoctorId),
    enabled: !!selectedDoctorId,
    staleTime: 1000 * 30,
  });
  const myAppointments = useMemo(() => apptData?.appointments ?? [], [apptData]);
  const todayAppts = myAppointments.filter((a) => isToday(a.appointmentDate));
  const upcomingAppts = myAppointments.filter((a) => !isToday(a.appointmentDate) && !a.status);

  const completedToday = useMemo(() => {
    return myAppointments.filter((a) => a.status && isToday(a.appointmentDate));
  }, [myAppointments]);

  const trendData = useMemo(() => {
    if (completedToday.length === 0) return [];

    // Group completed appointments by hour (from 8am to 5pm by default, expanding if needed)
    const hourMap: Record<number, number> = {};
    for (let h = 8; h <= 17; h++) {
      hourMap[h] = 0;
    }

    completedToday.forEach((a) => {
      if (a.appointmentDate) {
        try {
          const d = new Date(a.appointmentDate);
          const hour = d.getHours();
          hourMap[hour] = (hourMap[hour] || 0) + 1;
        } catch {}
      }
    });

    const hours = Object.keys(hourMap)
      .map(Number)
      .sort((a, b) => a - b);
    return hours.map((h) => ({
      h: `${String(h).padStart(2, "0")}:00`,
      seen: hourMap[h],
    }));
  }, [completedToday]);

  // ── Add slots mutation ──────────────────────────────────────────────────────
  const addSlotsMutation = useMutation({
    mutationFn: () => doctorApi.addSlots(selectedDoctorId, slotDate, selectedSlots),
    onSuccess: () => {
      toast.success(`${selectedSlots.length} slots added for ${formatDate(slotDate)}.`);
      setSelectedSlots([]);
      qc.invalidateQueries({ queryKey: ["doctors"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Toggle slot availability (remove from doctor's map) ─────────────────────
  const removeSlotMutation = useMutation({
    mutationFn: ({ date, slot }: { date: string; slot: string }) => {
      if (!doctor) throw new Error("No doctor");
      const existing = (doctor.slots?.[date] ?? []).filter((s) => s !== slot);
      return doctorApi.addSlots(selectedDoctorId, date, existing);
    },
    onSuccess: () => {
      toast.success("Slot removed.");
      qc.invalidateQueries({ queryKey: ["doctors"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Slots on selected date
  const slotsOnDate: string[] = doctor?.slots?.[slotDate] ?? [];

  // ── Queue management ─────────────────────────────────────────────────────────
  // Use the doctor's departmentId to manage the queue for their department
  const deptId = doctor?.departmentId ?? null;
  const liveQueue = useQueueSSE(deptId);

  const callNextMutation = useMutation({
    mutationFn: () => queueApi.callNext(deptId!),
    onSuccess: (data) => {
      if (data.patientName) {
        toast.success(`Calling ${data.patientName} — token #${data.currentServing}`);
      } else {
        toast.info("Queue is empty — no more patients waiting.");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetQueueMutation = useMutation({
    mutationFn: () => queueApi.reset(deptId!),
    onSuccess: () => toast.success("Queue reset for today."),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppLayout
      title={
        loggedInDoctor
          ? user
            ? loggedInDoctor.doctorName.toLowerCase().startsWith("dr.")
              ? `Dr. ${user.name} ${user.last_name}`
              : `${user.name} ${user.last_name}`
            : loggedInDoctor.doctorName
          : "Doctor Console"
      }
      subtitle={
        loggedInDoctor
          ? `${loggedInDoctor.qualifications} · ${loggedInDoctor.city}`
          : "Manage your queue and availability."
      }
    >
      {!selectedDoctorId ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Left: today's schedule ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Stat
                k="Today's appointments"
                v={todayAppts.length}
                icon={CalendarDays}
                tone="primary"
              />
              <Stat
                k="Completed"
                v={myAppointments.filter((a) => a.status).length}
                icon={CheckCircle2}
                tone="success"
              />
              <Stat k="Upcoming" v={upcomingAppts.length} icon={Clock} tone="warning" />
              <Stat k="Total patients" v={myAppointments.length} icon={Users} tone="info" />
            </div>

            {/* Today's appointments table */}
            <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="text-sm font-semibold">Today's appointments</div>
                <div className="text-xs text-muted-foreground">{todayAppts.length} scheduled</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground bg-surface">
                    <tr>
                      {["Patient", "Date", "Reason", "Status"].map((h) => (
                        <th key={h} className="text-left font-medium px-5 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {apptLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="border-t border-border">
                          {[1, 2, 3, 4].map((j) => (
                            <td key={j} className="px-5 py-3">
                              <div className="h-4 rounded bg-muted animate-pulse w-24" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : myAppointments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-10 text-center text-muted-foreground text-sm"
                        >
                          No appointments found for this doctor.
                        </td>
                      </tr>
                    ) : (
                      myAppointments.slice(0, 8).map((a) => (
                        <tr key={a._id} className="border-t border-border hover:bg-muted/30">
                          <td className="px-5 py-3 font-medium">{a.patientFirstName}</td>
                          <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                            {a.appointmentDate ? formatDate(a.appointmentDate) : "—"}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground max-w-[180px] truncate">
                            {a.problemDescription ?? "—"}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={cn(
                                "text-[11px] px-2 py-1 rounded-full font-medium",
                                a.status
                                  ? "bg-success/15 text-success"
                                  : "bg-primary/10 text-primary",
                              )}
                            >
                              {a.status ? "Completed" : "Upcoming"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Right: queue panel, chart, slot management ───────────────── */}
          <div className="space-y-6">
            {/* Live queue management panel */}
            {deptId && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold inline-flex items-center gap-2">
                    <Users className="size-4 text-primary" /> Queue{" "}
                    {doctor?.departmentId ? `Dept ${doctor.departmentId}` : "—"}
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                    <span className="size-1.5 rounded-full bg-success" /> Live
                  </span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    {
                      l: "Serving",
                      v: liveQueue?.currentServing
                        ? `A-${String(liveQueue.currentServing).padStart(3, "0")}`
                        : "—",
                    },
                    { l: "Waiting", v: String(liveQueue?.waitingCount ?? 0) },
                    { l: "Total", v: String(liveQueue?.lastIssued ?? 0) },
                  ].map((s) => (
                    <div
                      key={s.l}
                      className="rounded-xl bg-surface border border-border p-3 text-center"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {s.l}
                      </div>
                      <div className="text-lg font-semibold mt-0.5">{s.v}</div>
                    </div>
                  ))}
                </div>

                {/* Waiting list */}
                {liveQueue && liveQueue.tokens.filter((t) => t.status === "waiting").length > 0 && (
                  <ul className="mb-4 space-y-1.5 max-h-40 overflow-y-auto">
                    {liveQueue.tokens
                      .filter((t) => t.status === "waiting")
                      .map((t) => (
                        <li
                          key={t.tokenNumber}
                          className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm"
                        >
                          <span className="font-medium">{t.patientName}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            A-{String(t.tokenNumber).padStart(3, "0")}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}

                {/* Call next button */}
                <button
                  onClick={() => callNextMutation.mutate()}
                  disabled={
                    callNextMutation.isPending || !liveQueue || liveQueue.waitingCount === 0
                  }
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 mb-2"
                >
                  {callNextMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Calling…
                    </>
                  ) : (
                    <>
                      <Bell className="size-4" /> Call next patient
                    </>
                  )}
                </button>

                {/* Reset queue */}
                <button
                  onClick={() => {
                    if (window.confirm("Reset today's queue for this department?"))
                      resetQueueMutation.mutate();
                  }}
                  disabled={resetQueueMutation.isPending}
                  className="w-full h-9 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {resetQueueMutation.isPending ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : null}
                  Reset today's queue
                </button>
              </div>
            )}

            {/* Throughput chart */}
            {trendData.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="text-sm font-semibold inline-flex items-center gap-2 mb-4">
                  <Activity className="size-4 text-primary" /> Patients seen today
                </div>
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid
                        stroke="var(--color-border)"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="h"
                        stroke="var(--color-muted-foreground)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--color-muted-foreground)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        width={20}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="seen"
                        stroke="var(--color-primary)"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Slot management */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="text-sm font-semibold mb-4">Manage availability slots</div>

              <label className="block mb-3">
                <span className="text-xs text-muted-foreground">Date</span>
                <input
                  type="date"
                  value={slotDate}
                  min={todayPlus(0)}
                  onChange={(e) => {
                    setSlotDate(e.target.value);
                    setSelectedSlots([]);
                  }}
                  className="mt-1 w-full h-10 px-3 rounded-xl border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </label>

              {/* Existing slots on this date */}
              {slotsOnDate.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-muted-foreground mb-2">
                    Current slots on {formatDate(slotDate)}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {slotsOnDate.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-success/10 text-success text-xs font-medium"
                      >
                        {s}
                        <button
                          onClick={() => removeSlotMutation.mutate({ date: slotDate, slot: s })}
                          className="hover:text-destructive"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Add new slots */}
              <div className="text-xs text-muted-foreground mb-2">Add slots</div>
              <div className="grid grid-cols-4 gap-1.5 mb-4">
                {DEFAULT_SLOTS.filter((s) => !slotsOnDate.includes(s)).map((s) => (
                  <button
                    key={s}
                    onClick={() =>
                      setSelectedSlots((prev) =>
                        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
                      )
                    }
                    className={cn(
                      "h-8 rounded-lg border text-xs font-medium transition-colors",
                      selectedSlots.includes(s)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface hover:bg-muted",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <button
                onClick={() => addSlotsMutation.mutate()}
                disabled={selectedSlots.length === 0 || addSlotsMutation.isPending}
                className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {addSlotsMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Plus className="size-4" /> Add{" "}
                    {selectedSlots.length > 0 ? selectedSlots.length : ""} slot
                    {selectedSlots.length !== 1 ? "s" : ""}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="size-16 rounded-2xl bg-primary/10 text-primary grid place-items-center">
        <Stethoscope className="size-8" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Select a doctor to begin</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Use the dropdown above to view a doctor's schedule, appointments, and manage their
          availability slots.
        </p>
      </div>
    </div>
  );
}

function Stat({
  k,
  v,
  icon: Icon,
  tone,
}: {
  k: string;
  v: number;
  icon: React.ElementType;
  tone: "primary" | "success" | "warning" | "info";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    info: "bg-blue-500/10 text-blue-500",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground leading-tight">
          {k}
        </div>
        <div className={cn("size-8 rounded-lg grid place-items-center", tones[tone])}>
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{v}</div>
    </div>
  );
}
