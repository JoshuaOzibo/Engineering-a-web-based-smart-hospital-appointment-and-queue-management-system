import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronLeft,
  Search,
  Filter,
  X,
  Trash2,
  RefreshCw,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { appointmentApi, doctorApi, type BackendAppointment } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/doctor-appointments")({
  head: () => ({ meta: [{ title: "My Appointments — Mediqueue" }] }),
  component: DoctorAppointmentsPage,
});

function DoctorAppointmentsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Retrieve doctors to check if user's email belongs to an approved doctor
  const { data: doctorData, isLoading: doctorLoading } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => doctorApi.getAll(),
    staleTime: 1000 * 60 * 5,
    enabled: isAuthenticated && !!user?.email,
  });

  const matchedDoctor = (doctorData?.doctor ?? []).find(
    (d) => d.email.toLowerCase() === user?.email?.toLowerCase(),
  );
  const selectedDoctorId = matchedDoctor?._id;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("Authentication required: Please sign in to access the Doctor Console.");
      navigate({ to: "/login", replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !doctorLoading && !matchedDoctor) {
      toast.error("Access denied: This page is only accessible by registered doctors.");
      navigate({ to: "/patient", replace: true });
    }
  }, [authLoading, isAuthenticated, doctorLoading, matchedDoctor, navigate]);

  // Filters State
  const [dateFilter, setDateFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "completed">("all");

  const [reschedulingApptId, setReschedulingApptId] = useState<string | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState<string>("");

  const {
    data: apptData,
    isLoading: apptLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["doctor-appointments", selectedDoctorId],
    queryFn: () => appointmentApi.getDoctorAppointments(selectedDoctorId!),
    enabled: !!selectedDoctorId,
  });

  const appointments = apptData?.appointments ?? [];

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      // 1. Date filter (match YYYY-MM-DD from appointmentDate)
      if (dateFilter) {
        const apptDateStr = appt.appointmentDate?.slice(0, 10);
        if (apptDateStr !== dateFilter) return false;
      }

      // 2. Search query (match patient name or problem description)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const patientName = appt.patientFirstName?.toLowerCase() || "";
        const desc = appt.problemDescription?.toLowerCase() || "";
        if (!patientName.includes(query) && !desc.includes(query)) return false;
      }

      // 3. Status filter
      if (statusFilter === "upcoming") {
        if (appt.status) return false;
      } else if (statusFilter === "completed") {
        if (!appt.status) return false;
      }

      return true;
    });
  }, [appointments, dateFilter, searchQuery, statusFilter]);

  // Complete mutation
  const completeMutation = useMutation({
    mutationFn: (id: string) => appointmentApi.approve(id),
    onSuccess: () => {
      toast.success("Appointment marked as completed.");
      queryClient.invalidateQueries({ queryKey: ["doctor-appointments", selectedDoctorId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to complete appointment.");
    },
  });

  // Cancel / Reject mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => appointmentApi.reject(id),
    onSuccess: () => {
      toast.success("Appointment cancelled.");
      queryClient.invalidateQueries({ queryKey: ["doctor-appointments", selectedDoctorId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to cancel appointment.");
    },
  });

  // Reschedule mutation
  const rescheduleMutation = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) =>
      appointmentApi.rescheduleByDoctor(id, date),
    onSuccess: () => {
      toast.success("Appointment rescheduled successfully.");
      setReschedulingApptId(null);
      setNewRescheduleDate("");
      queryClient.invalidateQueries({ queryKey: ["doctor-appointments", selectedDoctorId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reschedule appointment.");
    },
  });

  if (authLoading || doctorLoading || !isAuthenticated || !matchedDoctor) {
    return (
      <AppLayout title="Appointments Dashboard" subtitle="Checking credentials…">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  const stats = {
    total: filteredAppointments.length,
    completed: filteredAppointments.filter((a) => a.status).length,
    upcoming: filteredAppointments.filter((a) => !a.status).length,
  };

  return (
    <AppLayout
      title={
        matchedDoctor
          ? user
            ? matchedDoctor.doctorName.toLowerCase().startsWith("dr.")
              ? `Hello, Dr. ${user.name} ${user.last_name}`
              : `Hello, ${user.name} ${user.last_name}`
            : `Hello, ${matchedDoctor.doctorName}`
          : "Appointments Dashboard"
      }
      subtitle="Manage your appointment schedule, search patient records, and filter by date."
      actions={
        <button
          onClick={() => refetch()}
          className="h-10 px-4 rounded-xl border border-border bg-card text-foreground hover:bg-muted text-sm font-medium inline-flex items-center gap-2 transition-all shadow-soft"
        >
          <RefreshCw className={cn("size-4", isRefetching && "animate-spin")} />
          Sync Schedule
        </button>
      }
    >
      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Total Matching
          </div>
          <div className="text-3xl font-extrabold tracking-tight mt-1.5">{stats.total}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold text-success">
            Completed Visits
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-success mt-1.5">
            {stats.completed}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold text-primary">
            Upcoming Appointments
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-primary mt-1.5">
            {stats.upcoming}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search patient name, reason for visit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>

          {/* Date Picker Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-11 pl-10 pr-4 rounded-xl border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 w-full sm:w-auto"
              />
            </div>
            <button
              onClick={() => setDateFilter(todayIso)}
              className={cn(
                "h-11 px-3.5 rounded-xl border text-xs font-semibold transition-all",
                dateFilter === todayIso
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-border bg-surface hover:bg-muted text-foreground",
              )}
            >
              Today
            </button>
          </div>

          {/* Status Tabs */}
          <div className="flex rounded-xl bg-surface border border-border p-1">
            {[
              { id: "all", label: "All" },
              { id: "upcoming", label: "Upcoming" },
              { id: "completed", label: "Completed" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setStatusFilter(t.id as any)}
                className={cn(
                  "px-4 h-9 rounded-lg text-xs font-semibold transition-all",
                  statusFilter === t.id
                    ? "bg-card text-foreground shadow-soft border border-border/30"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Reset Filters Button */}
          {(dateFilter || searchQuery || statusFilter !== "all") && (
            <button
              onClick={() => {
                setDateFilter("");
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="h-11 px-4 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive text-sm font-semibold inline-flex items-center gap-1.5 transition-all self-end lg:self-auto"
            >
              <X className="size-4" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Appointments List Card */}
      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="p-5 border-b border-border bg-muted/10 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Appointments Schedule</h3>
          <span className="text-xs text-muted-foreground">
            {filteredAppointments.length} matching visits
          </span>
        </div>

        {apptLoading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <div className="text-sm text-muted-foreground">Loading appointment list...</div>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center gap-3">
            <Calendar className="size-10 text-muted-foreground" />
            <h4 className="font-medium text-sm">No matching appointments</h4>
            <p className="text-xs text-muted-foreground max-w-xs">
              No appointments match the selected filters or date range. Check another date or update
              your search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-surface uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Patient Name</th>
                  <th className="px-6 py-4 font-semibold">Date & Time</th>
                  <th className="px-6 py-4 font-semibold">Reason / Description</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAppointments.map((appt) => (
                  <tr key={appt._id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-primary/10 text-primary font-bold text-xs grid place-items-center">
                          {appt.patientFirstName?.[0]?.toUpperCase() ?? "P"}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            {appt.patientFirstName}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            ID: {appt.patientId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {appt.appointmentDate ? formatDate(appt.appointmentDate) : "TBD"}
                        </span>
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                          <Clock className="size-3" />
                          {appt.appointmentDate ? appt.appointmentDate.slice(11, 16) : "TBD"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[240px]">
                      <div className="text-sm font-medium text-foreground truncate">
                        {appt.problemDescription || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-semibold",
                            appt.status
                              ? "bg-success/15 text-success"
                              : "bg-primary/10 text-primary",
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              appt.status ? "bg-success" : "bg-primary",
                            )}
                          />
                          {appt.status ? "Completed" : "Upcoming"}
                        </span>
                        {appt.rescheduledByDoctor && (
                          <span className="text-[10px] font-semibold bg-warning/20 text-warning-foreground px-2 py-0.5 rounded-full">
                            Rescheduled
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {reschedulingApptId === appt._id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <input
                            type="datetime-local"
                            value={newRescheduleDate}
                            onChange={(e) => setNewRescheduleDate(e.target.value)}
                            className="h-8 rounded-lg border border-input px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <button
                            onClick={() =>
                              rescheduleMutation.mutate({ id: appt._id, date: newRescheduleDate })
                            }
                            disabled={rescheduleMutation.isPending}
                            className="h-8 px-2.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold inline-flex items-center gap-1"
                          >
                            {rescheduleMutation.isPending ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              "Save"
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setReschedulingApptId(null);
                              setNewRescheduleDate("");
                            }}
                            className="h-8 px-2.5 rounded-lg border border-border hover:bg-muted text-xs font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          {!appt.status && (
                            <>
                              <button
                                onClick={() => completeMutation.mutate(appt._id)}
                                disabled={completeMutation.isPending}
                                className="h-8 px-3 rounded-lg bg-success hover:bg-success-hover text-success-foreground text-xs font-semibold inline-flex items-center gap-1 shadow-soft transition-all"
                              >
                                {completeMutation.isPending &&
                                completeMutation.variables === appt._id ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <Check className="size-3" />
                                )}
                                Complete
                              </button>
                              <button
                                onClick={() => {
                                  setReschedulingApptId(appt._id);
                                  setNewRescheduleDate(
                                    appt.appointmentDate
                                      ? appt.appointmentDate.slice(0, 16)
                                      : new Date().toISOString().slice(0, 16),
                                  );
                                }}
                                className="h-8 px-3 rounded-lg border border-border hover:bg-muted text-foreground text-xs font-semibold inline-flex items-center gap-1 transition-all"
                              >
                                <Calendar className="size-3" />
                                Reschedule
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Are you sure you want to cancel this appointment with ${appt.patientFirstName}?`,
                                )
                              ) {
                                cancelMutation.mutate(appt._id);
                              }
                            }}
                            disabled={cancelMutation.isPending}
                            className="h-8 w-8 rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/5 inline-flex items-center justify-center transition-all"
                            title="Cancel appointment"
                          >
                            {cancelMutation.isPending && cancelMutation.variables === appt._id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
