import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calendar, Clock, FileText, Bell, Activity,
  X, RotateCcw, ChevronRight, HeartPulse, Loader2,
  AlertCircle, CheckCircle2, LogIn, WifiOff, Users, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { appointmentApi, queueApi, doctorApi, type BackendAppointment } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useQueueSSE } from "@/lib/useQueueSSE";

export const Route = createFileRoute("/patient")({
  head: () => ({ meta: [{ title: "Patient Console — Mediqueue" }] }),
  component: PatientDashboard,
});

// ── Reschedule modal (inline) ─────────────────────────────────────────────────
function RescheduleModal({
  appt,
  onClose,
  onSuccess,
}: {
  appt: BackendAppointment;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [newDate, setNewDate] = useState(appt.appointmentDate?.slice(0, 10) ?? "");
  const [newReason, setNewReason] = useState(appt.problemDescription ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      appointmentApi.reschedule(appt._id, {
        appointmentDate: newDate,
        problemDescription: newReason,
      }),
    onSuccess: () => {
      toast.success("Appointment rescheduled.");
      onSuccess();
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reschedule.");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-card">
        <h3 className="text-lg font-semibold">Reschedule appointment</h3>
        <p className="text-sm text-muted-foreground mt-1">Dr. {appt.docFirstName}</p>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-foreground">New date</span>
            <input
              type="date"
              value={newDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-1.5 w-full h-11 px-3 rounded-xl border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Reason / notes</span>
            <textarea
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-input bg-surface p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-border text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!newDate || mutation.isPending}
            className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Patient Dashboard ─────────────────────────────────────────────────────────────────
function PatientDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [rescheduleAppt, setRescheduleAppt] = useState<BackendAppointment | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("Authentication required: Please sign in to access your dashboard.");
      navigate({ to: "/login", replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading || !isAuthenticated) {
    return (
      <AppLayout title="Patient Console" subtitle="Loading dashboard…">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // ── Fetch appointments ──────────────────────────────────────────────────────
  const {
    data: apptData,
    isLoading: apptLoading,
    isError: apptError,
    refetch,
  } = useQuery({
    queryKey: ["my-appointments"],
    queryFn: () => appointmentApi.getMyAppointments(),
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  });

  const appointments = apptData?.appointments ?? [];

  // Split into upcoming (status false = pending/upcoming) and past (status true = completed)
  const upcoming = appointments.filter((a) => !a.status);
  const past = appointments.filter((a) => a.status);

  // ── Cancel mutation ─────────────────────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: (id: string) => appointmentApi.cancel(id),
    onSuccess: () => {
      toast.success("Appointment cancelled.");
      queryClient.invalidateQueries({ queryKey: ["my-appointments"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to cancel appointment.");
    },
  });

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const greeting = `${timeGreeting}, ${user?.name ?? ""}`;

  return (
    <>
      {rescheduleAppt && (
        <RescheduleModal
          appt={rescheduleAppt}
          onClose={() => setRescheduleAppt(null)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["my-appointments"] })}
        />
      )}

      <AppLayout
        title={greeting}
        subtitle="Here's your care at a glance for today."
        actions={
          <Link
            to="/book"
            className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2"
          >
            <Calendar className="size-4" /> Book new
          </Link>
        }
      >
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Queue card — LIVE ───────────────────────────────────────────── */}
          <QueueCard />

          {/* ── Health reminders ────────────────────────────────────────────── */}
          <aside className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <HeartPulse className="size-4 text-primary" /> Health reminders
            </div>
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

          {/* ── Upcoming appointments (LIVE) ────────────────────────────────── */}
          <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Upcoming appointments</div>
              <Link to="/book" className="text-xs text-primary font-medium">Book new</Link>
            </div>

            {apptLoading ? (
              <div className="mt-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : apptError ? (
              <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
                <WifiOff className="size-4" />
                <span>Could not load appointments. <button onClick={() => refetch()} className="text-primary underline">Retry</button></span>
              </div>
            ) : upcoming.length === 0 ? (
              <div className="mt-6 flex flex-col items-center py-10 text-center gap-3">
                <Calendar className="size-8 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">No upcoming appointments.</div>
                <Link to="/book" className="text-sm text-primary font-medium hover:underline">Book your first appointment →</Link>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {upcoming.slice(0, 5).map((appt, i) => (
                  <AppointmentRow
                    key={appt._id}
                    appt={appt}
                    badge={i === 0 ? "Upcoming" : "Pending"}
                    badgeTone={i === 0 ? "primary" : "muted"}
                    onCancel={() => {
                      if (window.confirm(`Cancel appointment with Dr. ${appt.docFirstName}?`)) {
                        cancelMutation.mutate(appt._id);
                      }
                    }}
                    onReschedule={() => setRescheduleAppt(appt)}
                    cancelling={cancelMutation.isPending && cancelMutation.variables === appt._id}
                  />
                ))}
              </ul>
            )}
          </section>

          {/* ── Recent / completed appointments ────────────────────────────── */}
          <aside className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="text-sm font-semibold inline-flex items-center gap-2">
              <Activity className="size-4 text-primary" /> Recent visits
            </div>
            {past.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No completed appointments yet.</p>
            ) : (
              <ol className="mt-4 relative border-l border-border ml-2 space-y-5">
                {past.slice(0, 4).map((appt) => (
                  <li key={appt._id} className="ml-4">
                    <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full bg-primary" />
                    <div className="text-xs text-muted-foreground">
                      {appt.appointmentDate ? formatDate(appt.appointmentDate) : "—"}
                    </div>
                    <div className="text-sm font-medium mt-0.5">Dr. {appt.docFirstName}</div>
                    <div className="text-xs text-muted-foreground">{appt.problemDescription}</div>
                    <StarRating
                      appointmentId={appt._id}
                      doctorId={appt.doctorId}
                      docName={appt.docFirstName}
                    />
                  </li>
                ))}
              </ol>
            )}
          </aside>

          {/* ── Latest doctor note (static — no notes API yet) ──────────────── */}
          <section className="lg:col-span-3 rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold inline-flex items-center gap-2">
                <FileText className="size-4 text-primary" /> Latest doctor note
              </div>
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Clock className="size-3" /> Doctor notes system coming soon
              </span>
            </div>
            <p className="mt-4 text-sm text-foreground leading-relaxed max-w-3xl text-muted-foreground italic">
              Doctor notes will appear here once the medical records system is integrated.
            </p>
          </section>
        </div>
      </AppLayout>
    </>
  );
}

// ── Appointment Row ───────────────────────────────────────────────────────────
function AppointmentRow({
  appt,
  badge,
  badgeTone,
  onCancel,
  onReschedule,
  cancelling,
}: {
  appt: BackendAppointment;
  badge: string;
  badgeTone: "primary" | "muted";
  onCancel: () => void;
  onReschedule: () => void;
  cancelling: boolean;
}) {
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        {/* Doctor avatar */}
        <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center font-semibold text-sm flex-shrink-0">
          {appt.docFirstName[0]?.toUpperCase() ?? "D"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="font-medium truncate">Dr. {appt.docFirstName}</div>
            <span
              className={cn(
                "text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0",
                badgeTone === "primary" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}
            >
              {badge}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {appt.appointmentDate ? formatDate(appt.appointmentDate) : "Date TBD"}
            {appt.problemDescription ? ` · ${appt.problemDescription}` : ""}
          </div>
          {/* Action buttons */}
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={onReschedule}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-border bg-surface hover:bg-muted text-xs font-medium"
            >
              <RotateCcw className="size-3" /> Reschedule
            </button>
            <button
              onClick={onCancel}
              disabled={cancelling}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-medium disabled:opacity-50"
            >
              {cancelling ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
              Cancel
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// ── Live Queue Card ───────────────────────────────────────────────────────────
function QueueCard() {
  const { isAuthenticated, user } = useAuth();
  const qc = useQueryClient();

  const { data: myToken, isLoading } = useQuery({
    queryKey: ["my-queue-token"],
    queryFn: () => queueApi.getMyToken(),
    enabled: isAuthenticated,
    refetchInterval: 20000, // poll every 20s as fallback
    staleTime: 1000 * 10,
  });

  // Subscribe to SSE for patient's current department
  const liveQueue = useQueueSSE(myToken?.deptId ?? null);

  const leaveMutation = useMutation({
    mutationFn: () => queueApi.leave(myToken!.deptId),
    onSuccess: () => {
      toast.success("You've left the queue.");
      qc.invalidateQueries({ queryKey: ["my-queue-token"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function fmt(n: number) {
    return `A-${String(n).padStart(3, "0")}`;
  }

  return (
    <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {myToken ? `Active queue · ${myToken.deptName}` : "Queue status"}
          </div>

          {isLoading ? (
            <div className="mt-3 h-12 w-32 rounded-xl bg-muted animate-pulse" />
          ) : myToken ? (
            <>
              <div className="mt-2 flex items-end gap-3">
                <div className="text-5xl font-semibold tracking-tight">{fmt(myToken.tokenNumber)}</div>
                <span className={cn("mb-1.5 text-sm inline-flex items-center gap-1",
                  myToken.status === "serving" ? "text-success" : "text-primary")}>
                  <span className={cn("size-1.5 rounded-full",
                    myToken.status === "serving" ? "bg-success" : "bg-primary")} />
                  {myToken.status === "serving" ? "Your turn!" : "In queue"}
                </span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {myToken.status === "serving"
                  ? "Please head to the consultation room now."
                  : myToken.position > 0
                  ? `${myToken.position} patient${myToken.position !== 1 ? "s" : ""} ahead of you`
                  : "You're next!"}
              </div>
            </>
          ) : (
            <>
              <div className="mt-2 text-2xl font-semibold text-muted-foreground">Not in queue</div>
              <div className="mt-1 text-sm text-muted-foreground">You haven't joined a department queue today.</div>
            </>
          )}
        </div>

        <Link to="/queue" className="text-sm font-medium text-primary inline-flex items-center gap-1">
          View live queue <ChevronRight className="size-4" />
        </Link>
      </div>

      {/* Progress bar — only when in queue */}
      {myToken && liveQueue && liveQueue.lastIssued > 0 && (
        <>
          <div className="mt-6 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.round((liveQueue.currentServing / liveQueue.lastIssued) * 100))}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Now serving: {fmt(liveQueue.currentServing)}</span>
            <span className="inline-flex items-center gap-1 text-success font-medium">
              <span className="size-1.5 rounded-full bg-success" /> Live via SSE
            </span>
          </div>
        </>
      )}

      {/* Action row */}
      <div className="mt-6 flex flex-wrap gap-2">
        {myToken ? (
          <>
            <button
              onClick={() => { if (window.confirm("Leave this queue? You'll lose your place.")) leaveMutation.mutate(); }}
              disabled={leaveMutation.isPending || myToken.status === "serving"}
              className="h-10 px-4 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
            >
              {leaveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
              Leave queue
            </button>
            <Link to="/queue"
              className="h-10 px-4 rounded-xl border border-border bg-surface hover:bg-muted text-sm font-medium inline-flex items-center gap-2">
              <Users className="size-4" /> Queue details
            </Link>
          </>
        ) : (
          <Link to="/queue"
            className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2">
            <Users className="size-4" /> Join a queue
          </Link>
        )}
      </div>
    </section>
  );
}

// ── Star Rating Component ──────────────────────────────────────────────────
function StarRating({
  appointmentId,
  doctorId,
  docName,
}: {
  appointmentId: string;
  doctorId: string;
  docName: string;
}) {
  const qc = useQueryClient();
  const storageKey = `mq_rated_${appointmentId}`;
  
  // Local state initialized from localStorage
  const [ratedVal, setRatedVal] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return Number(localStorage.getItem(storageKey) || "0");
    }
    return 0;
  });
  
  const [hoverVal, setHoverVal] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: (rating: number) => doctorApi.rate(doctorId, rating),
    onSuccess: (data, variables) => {
      toast.success(`Thank you! You rated Dr. ${docName} ${variables} stars.`);
      localStorage.setItem(storageKey, String(variables));
      setRatedVal(variables);
      qc.invalidateQueries({ queryKey: ["doctors"] });
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to submit rating.");
    },
  });

  const displayStars = hoverVal !== null ? hoverVal : ratedVal;

  return (
    <div className="mt-2 bg-muted/30 p-2 rounded-xl border border-border/50">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
        {ratedVal > 0 ? "Your rating" : "Rate this visit"}
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => {
          const starVal = i + 1;
          return (
            <button
              key={starVal}
              type="button"
              disabled={ratedVal > 0 || mutation.isPending}
              onMouseEnter={() => setHoverVal(starVal)}
              onMouseLeave={() => setHoverVal(null)}
              onClick={() => mutation.mutate(starVal)}
              className={cn(
                "p-0.5 rounded transition-all",
                ratedVal > 0 ? "cursor-default" : "hover:scale-125 hover:bg-muted cursor-pointer"
              )}
            >
              <Star
                className={cn(
                  "size-4.5 transition-colors",
                  starVal <= displayStars
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/30"
                )}
              />
            </button>
          );
        })}
        {mutation.isPending && (
          <span className="text-[10px] text-muted-foreground animate-pulse ml-1.5">Saving...</span>
        )}
      </div>
    </div>
  );
}
