import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calendar, MapPin, Search, Star, Clock, Check,
  ChevronRight, ChevronLeft, Loader2, AlertCircle,
  User, Stethoscope, WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { doctorApi, appointmentApi, type BackendDoctor } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/book")({
  head: () => ({ meta: [{ title: "Book an Appointment — Mediqueue" }] }),
  component: BookPage,
});

const steps = ["Doctor", "Date & time", "Details", "Confirm"];

// Nigerian cities for the location filter
const NIGERIAN_CITIES = [
  "All locations",
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

// Doctor specialties for filtering and dropdowns
export const SPECIALTIES = [
  "General Medicine",
  "Cardiology",
  "Dermatology",
  "Pediatrics",
  "Neurology",
  "Orthopedics",
  "Psychiatry",
  "Gynecology",
  "Ophthalmology",
  "Oncology",
  "Radiology",
  "Urology",
];

// Fallback avatar using initials
function DoctorAvatar({ name, image, size = "lg" }: { name: string; image?: string; size?: "sm" | "lg" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const dim = size === "lg" ? "size-16 text-lg" : "size-12 text-sm";

  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className={cn(dim, "rounded-xl object-cover")}
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />
    );
  }
  return (
    <div className={cn(dim, "rounded-xl bg-primary/10 text-primary font-semibold grid place-items-center flex-shrink-0")}>
      {initials}
    </div>
  );
}

function BookPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error("Authentication required: Please sign in to book an appointment.");
      navigate({ to: "/login", replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const [step, setStep] = useState(0);
  const [specialtyFilter, setSpecialtyFilter] = useState("All specialties");
  const [cityFilter, setCityFilter] = useState("All locations");
  const [query, setQuery] = useState("");
  const [doctor, setDoctor] = useState<BackendDoctor | null>(null);
  const [date, setDate] = useState<string>(todayPlus(1));
  const [slot, setSlot] = useState<string>("");

  // Patient details (pre-filled from auth)
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Prefer not to say");
  const [address, setAddress] = useState("");
  const [reason, setReason] = useState("");

  // ── Data fetching ───────────────────────────────────────────────────────────
  const { data: doctorData, isLoading: doctorLoading, isError: doctorError } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => doctorApi.getAll(),
    staleTime: 1000 * 60 * 2,
  });

  // All doctors from API
  const allDoctors = useMemo(
    () => (doctorData?.doctor ?? []),
    [doctorData]
  );

  // Client-side filter by specialty + city + search query
  const filtered = useMemo(
    () =>
      allDoctors.filter((d) => {
        const qualifications = d.qualifications || "";
        const city = d.city || "";
        const doctorName = d.doctorName || "";

        const matchSpecialty =
          specialtyFilter === "All specialties" ||
          qualifications.toLowerCase() === specialtyFilter.toLowerCase();
        const matchCity =
          cityFilter === "All locations" ||
          city.toLowerCase() === cityFilter.toLowerCase();
        const matchQuery =
          query === "" ||
          doctorName.toLowerCase().includes(query.toLowerCase()) ||
          qualifications.toLowerCase().includes(query.toLowerCase()) ||
          city.toLowerCase().includes(query.toLowerCase());
        return matchSpecialty && matchCity && matchQuery;
      }),
    [allDoctors, specialtyFilter, cityFilter, query]
  );

const DEFAULT_SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00"];

// Available time slots for the selected doctor on the selected date
const availableSlots = useMemo(() => {
  if (!doctor) return [];
  const slotsObj = doctor.slots || {};
  const raw = slotsObj[date];
  if (raw !== undefined) {
    return Array.isArray(raw) ? raw : [];
  }
  return DEFAULT_SLOTS;
}, [doctor, date]);

  // ── Booking mutation ────────────────────────────────────────────────────────
  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!doctor) throw new Error("No doctor selected");
      if (!slot) throw new Error("No slot selected");
      return appointmentApi.create(doctor._id, {
        date,
        slotTime: slot,
        ageOfPatient: age,
        gender,
        address,
        problemDescription: reason,
        appointmentDate: date,
      });
    },
    onSuccess: () => {
      toast.success("Appointment booked! Check your email for confirmation.");
      setStep(3);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to book appointment. Please try again.");
    },
  });

  // ── Navigation helpers ──────────────────────────────────────────────────────
  function goNext() {
    if (step === 2) {
      // Confirm step → call API
      if (!isAuthenticated) {
        toast.error("Please sign in first to book an appointment.");
        navigate({ to: "/login" });
        return;
      }
      bookMutation.mutate();
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  }

  function canContinue() {
    if (step === 0) return !!doctor;
    if (step === 1) return !!slot;
    if (step === 2) return reason.trim().length > 0;
    return true;
  }

  return (
    <AppLayout title="Book an appointment" subtitle="Find the right specialist and pick a time that works for you.">
      <Stepper step={step} />

      {/* ── STEP 0: Choose doctor ──────────────────────────────────────────── */}
      {step === 0 && (
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search doctor or specialty"
                className="w-full h-11 pl-9 pr-3 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            {/* Specialty filter */}
            <SelectInput
              value={specialtyFilter}
              onChange={(v) => { setSpecialtyFilter(v); setDoctor(null); }}
              options={["All specialties", ...SPECIALTIES]}
            />
            {/* Location / City filter */}
            <SelectInput
              value={cityFilter}
              onChange={(v) => { setCityFilter(v); setDoctor(null); }}
              options={NIGERIAN_CITIES}
              icon={<MapPin className="size-4" />}
            />
          </div>

          {/* Doctor grid */}
          {doctorLoading ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse h-36" />
              ))}
            </div>
          ) : doctorError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <WifiOff className="size-10 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Could not load doctors. Make sure the backend is running.</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4 rounded-2xl border border-border bg-card p-8">
              <div className="size-14 rounded-2xl bg-primary/10 text-primary grid place-items-center">
                <Stethoscope className="size-7" />
              </div>
              <div>
                {allDoctors.length === 0 ? (
                  <>
                    <p className="font-semibold text-foreground">No available doctors yet</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                      If you are a doctor, please log in to the Doctor Console and use the <strong>My Profile</strong> panel to configure your department and city.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-foreground">No doctors match your filters</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Try clearing the specialty or location filter.
                    </p>
                    <button
                      onClick={() => { setSpecialtyFilter("All specialties"); setCityFilter("All locations"); setQuery(""); }}
                      className="mt-3 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                    >
                      Clear all filters
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((d) => (
                <DoctorCard
                  key={d._id}
                  d={d}
                  deptName={d.qualifications}
                  selected={doctor?._id === d._id}
                  onSelect={() => { setDoctor(d); setSlot(""); }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 1: Date & time ────────────────────────────────────────────── */}
      {step === 1 && doctor && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid gap-6">
            {/* Date picker */}
            <Card title="Choose an Appointment Date">
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                {nextDays(14).map((d) => {
                  const slotsOnDay = doctor.slots?.[d.iso];
                  // If slotsOnDay is not defined, we fall back to clinic default slots (which has slots)
                  const hasFreeSlots = slotsOnDay === undefined || (Array.isArray(slotsOnDay) && slotsOnDay.length > 0);
                  
                  return (
                    <button
                      key={d.iso}
                      onClick={() => { setDate(d.iso); setSlot(""); }}
                      disabled={!hasFreeSlots}
                      className={cn(
                        "rounded-xl border p-2 text-center transition-all flex flex-col justify-between h-22 select-none",
                        date === d.iso
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20 text-primary"
                          : hasFreeSlots
                          ? "border-border bg-card hover:bg-muted text-foreground"
                          : "border-border bg-surface opacity-35 cursor-not-allowed"
                      )}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{d.dow}</span>
                      <span className="text-xl font-extrabold tracking-tight my-0.5">{d.day}</span>
                      <span className="text-[9px] text-muted-foreground font-semibold">{d.mon}</span>
                      {hasFreeSlots && (
                        <span className="mt-1 text-[8px] text-success font-bold uppercase tracking-wide">
                          {slotsOnDay ? `${slotsOnDay.length} slots` : "Available"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Time slots */}
            <Card title={availableSlots.length > 0 ? "Select consultation time slot" : "No slots available on this date"}>
              {availableSlots.length === 0 ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground py-4">
                  <AlertCircle className="size-4 text-warning" />
                  Select a date with available slots.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {availableSlots.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSlot(t)}
                      className={cn(
                        "h-11 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95",
                        slot === t
                          ? "border-primary bg-primary text-primary-foreground shadow-md scale-[1.02]"
                          : "border-border bg-card hover:bg-muted text-foreground hover:scale-[1.01]"
                      )}
                    >
                      <Clock className="size-3.5 opacity-60" />
                      <span>{t}</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>
          <SummaryCard doctor={doctor} branch={doctor.city} date={date} slot={slot} reason={reason} />
        </div>
      )}

      {/* ── STEP 2: Patient details ────────────────────────────────────────── */}
      {step === 2 && doctor && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2" title="Visit details">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Pre-filled read-only fields from auth */}
              <ReadField
                label="Patient name"
                value={user ? `${user.name} ${user.last_name}` : "—"}
                icon={<User className="size-3.5" />}
              />
              <ReadField
                label="Email"
                value={user?.email ?? "—"}
                icon={<User className="size-3.5" />}
              />
              {/* Editable fields the backend needs */}
              <label className="block">
                <span className="text-sm font-medium text-foreground">Age</span>
                <input
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 32"
                  className="mt-1.5 w-full h-11 px-3 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-foreground">Gender</span>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="mt-1.5 w-full h-11 px-3 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  {["Male", "Female", "Non-binary", "Prefer not to say"].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-foreground">Address</span>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Your home address"
                  className="mt-1.5 w-full h-11 px-3 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </label>
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-foreground">
                Reason for visit <span className="text-destructive">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Briefly describe your symptoms or reason for the appointment…"
                className="mt-1.5 w-full rounded-xl border border-input bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            {!isAuthenticated && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-warning/10 border border-warning/20 text-warning-foreground px-4 py-3 text-sm">
                <AlertCircle className="size-4 shrink-0" />
                <span>You need to <Link to="/login" className="underline font-medium">sign in</Link> before confirming this appointment.</span>
              </div>
            )}
            <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <Check className="size-3.5 mt-0.5 text-success" />
              Your information stays inside the hospital network and is shared only with your care team.
            </div>
          </Card>
          <SummaryCard doctor={doctor} branch={doctor.city} date={date} slot={slot} reason={reason} />
        </div>
      )}

      {/* ── STEP 3: Success ────────────────────────────────────────────────── */}
      {step === 3 && doctor && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto rounded-2xl bg-card border border-border p-8 text-center shadow-card"
        >
          <div className="size-16 mx-auto rounded-full bg-success/15 text-success grid place-items-center">
            <Check className="size-8" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold">Appointment confirmed!</h2>
          <p className="text-muted-foreground mt-2">A confirmation email has been sent to {user?.email ?? "your email"}.</p>
          <div className="mt-6 grid sm:grid-cols-2 gap-3 text-left">
            <Info label="Doctor" value={doctor.doctorName} />
            <Info label="Specialty" value={doctor.qualifications} />
            <Info label="When" value={`${formatDate(date)} · ${slot}`} />
            <Info label="Where" value={ doctor.city} />
          </div>
          <Link
            to="/patient"
            className="mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
          >
            View my dashboard
          </Link>
        </motion.div>
      )}

      {/* ── Navigation bar ─────────────────────────────────────────────────── */}
      {step < 3 && (
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1 h-11 px-4 rounded-xl text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="size-4" /> Back
          </button>
          <button
            onClick={goNext}
            disabled={!canContinue() || bookMutation.isPending}
            className="inline-flex items-center gap-1 h-11 px-5 rounded-xl text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50"
          >
            {bookMutation.isPending ? (
              <><Loader2 className="size-4 animate-spin" /> Booking…</>
            ) : (
              <>{step === 2 ? "Confirm appointment" : "Continue"} <ChevronRight className="size-4" /></>
            )}
          </button>
        </div>
      )}
    </AppLayout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mb-6 flex items-center gap-2 text-sm overflow-x-auto">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <div
            className={cn(
              "size-7 rounded-full grid place-items-center text-xs font-semibold",
              i < step
                ? "bg-success text-success-foreground"
                : i === step
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {i < step ? <Check className="size-3.5" /> : i + 1}
          </div>
          <span className={cn("font-medium whitespace-nowrap", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
          {i < steps.length - 1 && <span className="w-6 h-px bg-border mx-1" />}
        </li>
      ))}
    </ol>
  );
}

function DoctorCard({
  d,
  deptName,
  selected,
  onSelect,
}: {
  d: BackendDoctor;
  deptName?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const totalSlots = d.slots
    ? Object.values(d.slots).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
    : 0;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "text-left rounded-2xl border bg-card p-5 transition-all shadow-soft w-full",
        selected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
      )}
    >
      <div className="flex gap-4">
        <DoctorAvatar name={d.doctorName} image={d.image} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{d.doctorName}</div>
          <div className="text-sm text-muted-foreground truncate">{deptName ?? `Dept ${d.departmentId}`}</div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Star className="size-3 text-warning fill-current" />
              {d.rating > 0 ? d.rating.toFixed(1) : "New"}
            </span>
            <span>{d.experience} yrs exp.</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-muted-foreground truncate">{d.qualifications}</span>
        <span
          className={cn(
            "ml-2 shrink-0 px-2 py-1 rounded-full font-medium",
            d.isAvailable === false
              ? "bg-destructive/15 text-destructive"
              : totalSlots > 0
              ? "bg-success/15 text-success"
              : "bg-muted text-muted-foreground"
          )}
        >
          {d.isAvailable === false ? "Unavailable" : totalSlots > 0 ? `${totalSlots} slots` : "Full"}
        </span>
      </div>
    </button>
  );
}

function SummaryCard({
  doctor,
  branch,
  date,
  slot,
  reason,
}: {
  doctor: BackendDoctor;
  branch: string;
  date: string;
  slot: string;
  reason: string;
}) {
  return (
    <aside className="rounded-2xl border border-border bg-card p-6 shadow-soft h-fit">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">Appointment summary</div>
      <div className="mt-4 flex gap-3 items-center">
        <DoctorAvatar name={doctor.doctorName} image={doctor.image} size="sm" />
        <div>
          <div className="font-semibold">{doctor.doctorName}</div>
          <div className="text-xs text-muted-foreground">{doctor.qualifications}</div>
        </div>
      </div>
      <dl className="mt-5 space-y-3 text-sm">
        <Row icon={<Calendar className="size-4" />} k="Date" v={date ? `${formatDate(date)}${slot ? ` · ${slot}` : ""}` : "Not selected"} />
        <Row icon={<MapPin className="size-4" />} k="Branch" v={branch} />
        <Row icon={<Clock className="size-4" />} k="Est. wait" v="~10 min on arrival" />
      </dl>
      {reason && <p className="mt-4 text-xs text-muted-foreground border-t border-border pt-3">"{reason}"</p>}
    </aside>
  );
}

function Card({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-6 shadow-soft", className)}>
      {title && <div className="text-sm font-semibold mb-4">{title}</div>}
      {children}
    </div>
  );
}

function ReadField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="mt-1.5 w-full h-11 px-3 rounded-xl border border-input bg-surface text-sm flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

function SelectInput({
  value,
  onChange,
  options,
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-11 rounded-xl border border-input bg-card text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-ring/40",
          icon ? "pl-9" : "pl-3"
        )}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function Row({ icon, k, v }: { icon: React.ReactNode; k: string; v: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="size-8 grid place-items-center rounded-lg bg-muted text-muted-foreground">{icon}</div>
      <div className="flex-1">
        <div className="text-xs text-muted-foreground">{k}</div>
        <div className="text-sm font-medium text-foreground">{v}</div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-1 text-foreground">{value}</div>
    </div>
  );
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function todayPlus(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function nextDays(n: number) {
  const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const mons = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return Array.from({ length: n }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return { iso: d.toISOString().slice(0, 10), dow: dows[d.getDay()], day: d.getDate(), mon: mons[d.getMonth()] };
  });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
