import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, Clock, Users, ChevronRight, Loader2, LogIn, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { departmentApi, queueApi, type QueueState } from "@/lib/api";
import { useQueueSSE } from "@/lib/useQueueSSE";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/queue")({
  head: () => ({ meta: [{ title: "Live Queue Mediqueue" }] }),
  component: QueuePage,
});

// Format token number as "A-042"
function fmt(n: number) {
  return `A-${String(n).padStart(3, "0")}`;
}

function QueuePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error("Authentication required: Please sign in to view the live queue.");
      navigate({ to: "/login", replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);
  const qc = useQueryClient();

  // Fetch real departments from API
  const { data: deptData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentApi.getAll(),
    staleTime: 1000 * 60 * 5,
  });
  const departments = deptData ?? [];

  // Selected department
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const activeDeptId = selectedDeptId ?? departments[0]?.departmentId ?? null;
  const activeDept = departments.find((d) => d.departmentId === activeDeptId);

  // Live queue state via SSE (replaces setInterval simulation)
  const sseQueue = useQueueSSE(activeDeptId);

  // Fetch initial queue state
  const { data: initialQueue } = useQuery({
    queryKey: ["queue-status", activeDeptId],
    queryFn: () => queueApi.getStatus(activeDeptId!),
    enabled: !!activeDeptId,
    staleTime: 1000 * 10,
  });

  const liveQueue = sseQueue ?? initialQueue;

  // Patient's own token across ALL departments
  const { data: myToken, refetch: refetchToken } = useQuery({
    queryKey: ["my-queue-token"],
    queryFn: () => queueApi.getMyToken(),
    enabled: isAuthenticated,
    staleTime: 1000 * 15,
  });

  // Join queue
  const joinMutation = useMutation({
    mutationFn: () =>
      queueApi.join(activeDeptId!, `${user!.name} ${user!.last_name}`),
    onSuccess: (data) => {
      toast.success(`Joined queue! Your number: ${fmt(data.tokenNumber)} — position ${data.position}`);
      refetchToken();
      qc.invalidateQueries({ queryKey: ["queue-status", activeDeptId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Leave queue
  const leaveMutation = useMutation({
    mutationFn: () => queueApi.leave(myToken!.deptId),
    onSuccess: () => {
      toast.success("You've left the queue.");
      refetchToken();
      qc.invalidateQueries({ queryKey: ["queue-status", activeDeptId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const inThisQueue = myToken && activeDeptId && myToken.deptId === activeDeptId;
  const inDifferentQueue = myToken && activeDeptId && myToken.deptId !== activeDeptId;

  const waitMinutes = myToken && liveQueue
    ? Math.max(1, myToken.position * 10)
    : null;

  const progress = useMemo(() => {
    if (!liveQueue) return 0;
    if (inThisQueue && myToken) {
      if (myToken.status === "serving" || myToken.status === "done") {
        return 100;
      }
      if (myToken.tokenNumber > 0) {
        return Math.min(100, Math.round((liveQueue.currentServing / myToken.tokenNumber) * 100));
      }
    }
    return liveQueue.lastIssued > 0
      ? Math.min(100, Math.round((liveQueue.currentServing / liveQueue.lastIssued) * 100))
      : 0;
  }, [liveQueue, inThisQueue, myToken]);

  const progressLabel = useMemo(() => {
    if (inThisQueue && myToken) {
      if (myToken.status === "serving") return "Your turn now!";
      if (myToken.status === "done") return "Consultation completed";
      return `${progress}% towards your turn`;
    }
    return `${progress}% through today's queue`;
  }, [progress, inThisQueue, myToken]);

  return (
    <AppLayout title="Live queue" subtitle="Real-time updates from every department.">
      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Main queue card ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card"
        >
          {/* Header */}
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {activeDept?.deptName ?? "Select a department"} · Live queue
              </div>

              {/* Patient's own token */}
              {inThisQueue ? (
                <>
                  <div className="mt-2 text-sm text-muted-foreground">Your queue number</div>
                  <div className="mt-1 text-6xl md:text-7xl font-semibold tracking-tight">
                    {fmt(myToken.tokenNumber)}
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-2 text-sm text-muted-foreground">Now serving</div>
                  <div className="mt-1 text-6xl md:text-7xl font-semibold tracking-tight">
                    {liveQueue?.currentServing ? fmt(liveQueue.currentServing) : "—"}
                  </div>
                </>
              )}
            </div>

            {/* Wait time / status badge */}
            {inThisQueue && myToken.status !== "done" ? (
              <div className={cn("rounded-2xl px-4 py-3 text-right",
                myToken.status === "serving"
                  ? "bg-success/10 text-success"
                  : "bg-primary/10 text-primary")}>
                <div className="text-xs">{myToken.status === "serving" ? "Your turn!" : "Waiting"}</div>
                {myToken.status === "serving" ? (
                  <div className="text-2xl font-semibold inline-flex items-center gap-1 mt-1">
                    <CheckCircle2 className="size-5" /> Please proceed
                  </div>
                ) : (
                  <div className="text-2xl font-semibold inline-flex items-center gap-1 mt-1">
                    <Clock className="size-5" /> ~{waitMinutes} min
                  </div>
                )}
              </div>
            ) : liveQueue && (
              <div className="rounded-2xl bg-muted px-4 py-3 text-right">
                <div className="text-xs text-muted-foreground">Waiting</div>
                <div className="text-2xl font-semibold inline-flex items-center gap-1 mt-1">
                  <Users className="size-5" /> {liveQueue.waitingCount}
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-8">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {inThisQueue
                  ? `${myToken.position} patient${myToken.position !== 1 ? "s" : ""} ahead of you`
                  : `${liveQueue?.waitingCount ?? 0} patients waiting`}
              </span>
              <span className="font-medium">{progressLabel}</span>
            </div>
            <div className="mt-2 h-2.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* "You're next" alert */}
          <AnimatePresence>
            {inThisQueue && myToken.position <= 1 && myToken.status === "waiting" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-6 flex items-center gap-3 rounded-xl bg-primary/10 text-primary border border-primary/20 px-4 py-3"
              >
                <Bell className="size-4" />
                <span className="text-sm font-medium">You're up next — please head to the consultation area.</span>
              </motion.div>
            )}
            {inThisQueue && myToken.status === "serving" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-6 flex items-center gap-3 rounded-xl bg-success/10 text-success border border-success/20 px-4 py-3"
              >
                <CheckCircle2 className="size-4" />
                <span className="text-sm font-medium">It's your turn! The doctor is ready for you.</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Token display row */}
          {liveQueue && liveQueue.lastIssued > 0 && (
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { l: "Now serving", v: liveQueue.currentServing > 0 ? fmt(liveQueue.currentServing) : "—", tone: "primary" },
                { l: "Waiting",     v: String(liveQueue.waitingCount),                                    tone: "muted" },
                { l: "Total today", v: String(liveQueue.lastIssued),                                      tone: "muted" },
              ].map((c) => (
                <div key={c.l} className={cn("rounded-xl border p-4 text-center",
                  c.tone === "primary" ? "border-primary bg-primary/5" : "border-border bg-surface")}>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.l}</div>
                  <div className="mt-1 text-2xl font-semibold">{c.v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            {!isAuthenticated ? (
              <Link to="/login"
                className="h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2">
                <LogIn className="size-4" /> Sign in to join queue
              </Link>
            ) : inThisQueue ? (
              <button
                onClick={() => { if (window.confirm("Leave this queue? You'll lose your place.")) leaveMutation.mutate(); }}
                disabled={leaveMutation.isPending || myToken.status === "serving"}
                className="h-11 px-5 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
              >
                {leaveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                Leave queue
              </button>
            ) : inDifferentQueue ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted">
                <Bell className="size-4" />
                You're in the <strong>{myToken.deptName}</strong> queue (#{fmt(myToken.tokenNumber)})
              </div>
            ) : (
              <button
                onClick={() => joinMutation.mutate()}
                disabled={joinMutation.isPending || !activeDeptId}
                className="h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
              >
                {joinMutation.isPending
                  ? <><Loader2 className="size-4 animate-spin" /> Joining…</>
                  : <><Users className="size-4" /> Join queue</>}
              </button>
            )}
          </div>
        </motion.div>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Department list (live from API) */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="text-sm font-semibold mb-3">Departments</div>
            {departments.length === 0 ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <ul className="space-y-1">
                {departments.map((d) => (
                  <li key={d._id}>
                    <button
                      onClick={() => setSelectedDeptId(d.departmentId)}
                      className={cn("w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors",
                        activeDeptId === d.departmentId
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted text-foreground")}
                    >
                      <span className="font-medium truncate text-left">{d.deptName}</span>
                      <ChevronRight className="size-3.5 shrink-0 ml-2" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Live stats */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="text-sm font-semibold mb-4">Queue stats live</div>
            <dl className="space-y-3 text-sm">
              <StatRow k="Now serving"     v={liveQueue?.currentServing ? fmt(liveQueue.currentServing) : "—"} />
              <StatRow k="Patients waiting" v={String(liveQueue?.waitingCount ?? 0)} />
              <StatRow k="Total today"      v={String(liveQueue?.lastIssued ?? 0)} />
              <StatRow k="Departments"      v={String(departments.length)} />
            </dl>
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-success font-medium">
              <span className="size-1.5 rounded-full bg-success inline-block" />
              Live via SSE
            </div>
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
