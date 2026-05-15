import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { useState } from "react";
import { motion } from "framer-motion";
import { doctors, departments, branches, timeSlots, type Doctor } from "@/lib/mock-data";
import { Calendar, MapPin, Search, Star, Clock, Check, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/book")({
  head: () => ({ meta: [{ title: "Book an Appointment — Mediqueue" }] }),
  component: BookPage,
});

const steps = ["Doctor", "Date & time", "Details", "Confirm"];

function BookPage() {
  const [step, setStep] = useState(0);
  const [dept, setDept] = useState<string>("All departments");
  const [query, setQuery] = useState("");
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [branch, setBranch] = useState(branches[0]);
  const [date, setDate] = useState<string>(todayPlus(1));
  const [slot, setSlot] = useState<string>("10:00");
  const [reason, setReason] = useState("");

  const filtered = doctors.filter((d) =>
    (dept === "All departments" || d.department === dept) &&
    (d.name + d.specialty).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AppLayout title="Book an appointment" subtitle="Find the right specialist and pick a time that works for you.">
      <Stepper step={step} />

      {step === 0 && (
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search doctor or specialty"
                className="w-full h-11 pl-9 pr-3 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
            </div>
            <Select value={dept} onChange={setDept} options={["All departments", ...departments]} />
            <Select value={branch} onChange={setBranch} options={branches} icon={<MapPin className="size-4" />} />
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((d) => (
              <DoctorCard key={d.id} d={d} selected={doctor?.id === d.id} onSelect={() => setDoctor(d)} />
            ))}
          </div>
        </div>
      )}

      {step === 1 && doctor && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid gap-6">
            <Card title="Choose a date">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {nextDays(10).map((d) => (
                  <button key={d.iso} onClick={() => setDate(d.iso)}
                    className={cn("min-w-[72px] rounded-xl border p-3 text-center transition-colors",
                      date === d.iso ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted")}>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{d.dow}</div>
                    <div className="text-lg font-semibold mt-1">{d.day}</div>
                    <div className="text-[11px] text-muted-foreground">{d.mon}</div>
                  </button>
                ))}
              </div>
            </Card>
            <Card title="Pick a time">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {timeSlots.map((t) => (
                  <button key={t} onClick={() => setSlot(t)}
                    className={cn("h-11 rounded-lg border text-sm font-medium",
                      slot === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted text-foreground")}>
                    {t}
                  </button>
                ))}
              </div>
            </Card>
          </div>
          <SummaryCard doctor={doctor} branch={branch} date={date} slot={slot} reason={reason} />
        </div>
      )}

      {step === 2 && doctor && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2" title="Visit details">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Patient name" defaultValue="Sara Ahmed" />
              <Field label="Patient ID" defaultValue="10428" />
              <Field label="Phone" defaultValue="+1 (555) 220 1184" />
              <Field label="Email" defaultValue="sara.a@example.com" />
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-foreground">Reason for visit</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4}
                placeholder="Briefly describe your symptoms or reason for the appointment…"
                className="mt-1.5 w-full rounded-xl border border-input bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
            </div>
            <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <Check className="size-3.5 mt-0.5 text-success" />
              Your information stays inside the hospital network and is shared only with your care team.
            </div>
          </Card>
          <SummaryCard doctor={doctor} branch={branch} date={date} slot={slot} reason={reason} />
        </div>
      )}

      {step === 3 && doctor && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto rounded-2xl bg-card border border-border p-8 text-center shadow-card">
          <div className="size-14 mx-auto rounded-full bg-success/15 text-success grid place-items-center">
            <Check className="size-7" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold">Appointment confirmed</h2>
          <p className="text-muted-foreground mt-1">A reminder will be sent 24 hours before your visit.</p>
          <div className="mt-6 grid sm:grid-cols-2 gap-3 text-left">
            <Info label="Doctor" value={doctor.name} />
            <Info label="Specialty" value={doctor.specialty} />
            <Info label="When" value={`${formatDate(date)} · ${slot}`} />
            <Info label="Where" value={branch} />
          </div>
        </motion.div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
          className="inline-flex items-center gap-1 h-11 px-4 rounded-xl text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40">
          <ChevronLeft className="size-4" /> Back
        </button>
        {step < 3 ? (
          <button onClick={() => setStep((s) => Math.min(3, s + 1))} disabled={step === 0 && !doctor}
            className="inline-flex items-center gap-1 h-11 px-5 rounded-xl text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50">
            {step === 2 ? "Confirm appointment" : "Continue"} <ChevronRight className="size-4" />
          </button>
        ) : (
          <a href="/dashboard" className="inline-flex items-center gap-1 h-11 px-5 rounded-xl text-sm font-medium bg-primary text-primary-foreground">
            Go to dashboard
          </a>
        )}
      </div>
    </AppLayout>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mb-6 flex items-center gap-2 text-sm overflow-x-auto">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <div className={cn("size-7 rounded-full grid place-items-center text-xs font-semibold",
            i < step ? "bg-success text-success-foreground" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            {i < step ? <Check className="size-3.5" /> : i + 1}
          </div>
          <span className={cn("font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
          {i < steps.length - 1 && <span className="w-6 h-px bg-border mx-1" />}
        </li>
      ))}
    </ol>
  );
}

function DoctorCard({ d, selected, onSelect }: { d: Doctor; selected: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className={cn("text-left rounded-2xl border bg-card p-5 transition-all shadow-soft",
      selected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40")}>
      <div className="flex gap-4">
        <img src={d.photo} alt={d.name} width={64} height={64} loading="lazy" className="size-16 rounded-xl object-cover" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{d.name}</div>
          <div className="text-sm text-muted-foreground">{d.specialty}</div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Star className="size-3 text-warning fill-current" /> {d.rating}</span>
            <span>{d.experience} yrs</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 text-muted-foreground"><Calendar className="size-3.5" /> {d.nextAvailable}</span>
        <span className={cn("px-2 py-1 rounded-full font-medium",
          d.queue <= 3 ? "bg-success/15 text-success" : "bg-warning/15 text-warning-foreground")}>
          Queue · {d.queue}
        </span>
      </div>
    </button>
  );
}

function SummaryCard({ doctor, branch, date, slot, reason }: { doctor: Doctor; branch: string; date: string; slot: string; reason: string }) {
  return (
    <aside className="rounded-2xl border border-border bg-card p-6 shadow-soft h-fit">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">Appointment summary</div>
      <div className="mt-4 flex gap-3">
        <img src={doctor.photo} alt="" className="size-12 rounded-lg object-cover" />
        <div>
          <div className="font-semibold">{doctor.name}</div>
          <div className="text-xs text-muted-foreground">{doctor.specialty}</div>
        </div>
      </div>
      <dl className="mt-5 space-y-3 text-sm">
        <Row icon={<Calendar className="size-4" />} k="Date" v={`${formatDate(date)} · ${slot}`} />
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

function Field({ label, defaultValue }: { label: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input defaultValue={defaultValue}
        className="mt-1.5 w-full h-11 px-3 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
    </label>
  );
}

function Select({ value, onChange, options, icon }: { value: string; onChange: (v: string) => void; options: string[]; icon?: React.ReactNode }) {
  return (
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className={cn("h-11 rounded-xl border border-input bg-card text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-ring/40",
          icon ? "pl-9" : "pl-3")}>
        {options.map((o) => <option key={o}>{o}</option>)}
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
