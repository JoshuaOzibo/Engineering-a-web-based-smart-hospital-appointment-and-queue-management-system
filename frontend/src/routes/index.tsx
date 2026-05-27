import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Calendar, Activity, Stethoscope, Hospital, Clock, Heart, ShieldCheck, ArrowRight, CheckCircle2, Phone, MapPin, Star } from "lucide-react";
import heroImg from "@/assets/hero-clinic.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mediqueue - Smart Hospital Appointment & Queue Management" },
      { name: "description", content: "Book appointments, join the queue from anywhere, and track your wait time in real time at St. Helena Medical Center." },
      { property: "og:title", content: "Mediqueue - Smart Hospital Appointment & Queue Management" },
      { property: "og:description", content: "Book appointments, join the queue from anywhere, and track your wait time in real time." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center">
              <Hospital className="size-5" />
            </div>
            <div className="font-semibold tracking-tight">Mediqueue</div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#benefits" className="hover:text-foreground">For patients</a>
            <a href="#queue" className="hover:text-foreground">Live queue</a>
            <a href="#trust" className="hover:text-foreground">About</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:inline-flex h-10 items-center px-4 rounded-lg text-sm font-medium text-foreground hover:bg-muted">Sign in</Link>
            <Link to="/book" className="inline-flex h-10 items-center px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-95">Book appointment</Link>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="relative">
          <div className="absolute inset-0 bg-grid-soft opacity-60 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 pt-14 pb-20 grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-success" /> Live at St. Helena Medical Center
              </div>
              <h1 className="mt-5 text-[42px] md:text-[56px] leading-[1.05] font-semibold tracking-tight text-foreground">
                Care that respects <span className="text-primary">your time.</span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground max-w-xl">
                Book appointments, join the queue from home, and watch your wait time shrink in real time
                so you arrive exactly when the doctor is ready.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/book" className="inline-flex items-center gap-2 h-12 px-5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-95">
                  <Calendar className="size-4" /> Book appointment
                </Link>
              </div>
              <dl className="mt-10 grid grid-cols-3 gap-6 max-w-md">
                {[
                  { k: "32 min", v: "Avg. wait reduction" },
                  { k: "98%", v: "On-time arrivals" },
                  { k: "120k+", v: "Patients served" },
                ].map((s) => (
                  <div key={s.v}>
                    <dt className="text-2xl font-semibold text-foreground">{s.k}</dt>
                    <dd className="text-xs text-muted-foreground mt-1">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-card">
                <img src={heroImg} alt="Doctor speaking with a patient at a clinic reception" width={1536} height={1152} className="w-full h-auto object-cover" />
              </div>

              {/* Floating queue card */}
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="absolute -left-4 bottom-6 md:-left-10 w-64 rounded-2xl bg-card border border-border shadow-card p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Your queue</div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-success/15 text-success">On track</span>
                </div>
                <div className="mt-2 flex items-end gap-2">
                  <div className="text-3xl font-semibold text-foreground">A‑042</div>
                  <div className="text-xs text-muted-foreground pb-1.5">Cardiology</div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-2/3 bg-primary rounded-full" />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock className="size-3" /> ~12 min</span>
                  <span>3 ahead of you</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
                className="absolute -right-2 top-8 md:-right-6 w-56 rounded-2xl bg-card border border-border shadow-card p-4"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="size-3.5 text-success" /> Appointment confirmed</div>
                <div className="mt-2 text-sm font-medium text-foreground">Dr. Mei Tanaka</div>
                <div className="text-xs text-muted-foreground">Tue, 14 Jan · 10:30 AM</div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="py-20 border-t border-border bg-surface">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeader eyebrow="How it works" title="Three calm steps, from booking to seen by your doctor." />
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              {[
                { n: "01", t: "Book in under a minute", d: "Search by symptom, specialty or doctor. Pick a slot that fits your day.", i: Calendar },
                { n: "02", t: "Join the queue from home", d: "Check in remotely. We'll let you know exactly when to leave.", i: Activity },
                { n: "03", t: "Arrive when it's your turn", d: "No more crowded waiting rooms. Walk in, sit down, get seen.", i: CheckCircle2 },
              ].map((s) => (
                <div key={s.n} className="rounded-2xl bg-card border border-border p-6 shadow-soft">
                  <div className="flex items-center justify-between">
                    <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center"><s.i className="size-5" /></div>
                    <span className="text-xs font-medium text-muted-foreground tracking-widest">{s.n}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-foreground">{s.t}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BENEFITS */}
        <section id="benefits" className="py-20">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <SectionHeader eyebrow="For patients" title="A calmer waiting experience, designed with patients and clinicians." align="left" />
              <ul className="mt-8 space-y-4">
                {[
                  { i: Heart, t: "Less anxiety, more clarity", d: "Always know where you are in the queue and how long until you're called." },
                  { i: Clock, t: "Wait at home, not the lobby", d: "Get a 15‑minute heads‑up before your turn so you can leave on time." },
                  { i: ShieldCheck, t: "Private and secure", d: "Your medical data is encrypted and stays inside the hospital network." },
                ].map((b) => (
                  <li key={b.t} className="flex gap-4">
                    <div className="size-10 shrink-0 rounded-xl bg-secondary text-secondary-foreground grid place-items-center"><b.i className="size-5" /></div>
                    <div>
                      <div className="font-medium text-foreground">{b.t}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">{b.d}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <Link to="/dashboard" className="mt-8 inline-flex items-center gap-2 text-primary font-medium">
                See your patient dashboard <ArrowRight className="size-4" />
              </Link>
            </div>

            <div id="queue" className="rounded-3xl bg-card border border-border p-6 md:p-8 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Cardiology · Floor 3</div>
                  <div className="text-lg font-semibold mt-1">Now serving</div>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-success/15 text-success">Live</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {["A-039", "A-040", "A-041"].map((n, idx) => (
                  <div key={n} className={`rounded-xl border p-4 text-center ${idx === 1 ? "border-primary bg-primary/5" : "border-border bg-surface"}`}>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{idx === 0 ? "Done" : idx === 1 ? "In room" : "Next"}</div>
                    <div className="mt-1 text-2xl font-semibold text-foreground">{n}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-3">
                {[
                  { n: "A-042", w: "Sara A.", t: "12 min" },
                  { n: "A-043", w: "Mark T.", t: "26 min" },
                  { n: "A-044", w: "Lina K.", t: "38 min" },
                ].map((r) => (
                  <div key={r.n} className="flex items-center justify-between rounded-xl bg-surface px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-card border border-border grid place-items-center text-sm font-semibold">{r.n}</div>
                      <div className="text-sm text-foreground">{r.w}</div>
                    </div>
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><Clock className="size-3" /> {r.t}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-20 border-t border-border bg-surface">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeader eyebrow="Patients & staff" title="Trusted by clinicians and the people they care for." />
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              {[
                { q: "I used to lose half a day waiting. Now I show up 10 minutes before my turn and walk straight in.", a: "Hannah L.", r: "Patient · Pediatrics" },
                { q: "It cleared the corridor congestion. My team focuses on care, not crowd control.", a: "Dr. Yusuf Aydın", r: "Head of Internal Medicine" },
                { q: "Reception finally feels calm. Patients arrive informed and relaxed.", a: "Priya R.", r: "Front desk lead" },
              ].map((t) => (
                <figure key={t.a} className="rounded-2xl bg-card border border-border p-6 shadow-soft">
                  <div className="flex gap-0.5 text-warning">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-4 fill-current" />)}
                  </div>
                  <blockquote className="mt-4 text-foreground leading-relaxed">"{t.q}"</blockquote>
                  <figcaption className="mt-5 text-sm">
                    <div className="font-medium text-foreground">{t.a}</div>
                    <div className="text-muted-foreground">{t.r}</div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="trust" className="py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">Ready to skip the waiting room?</h2>
            <p className="mt-4 text-muted-foreground">Join thousands of patients already using Mediqueue at St. Helena Medical Center.</p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Link to="/book" className="inline-flex items-center gap-2 h-12 px-5 rounded-xl bg-primary text-primary-foreground font-medium">Book appointment</Link>
              <Link to="/queue" className="inline-flex items-center gap-2 h-12 px-5 rounded-xl border border-border bg-card text-foreground font-medium">View live queue</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center"><Hospital className="size-4" /></div>
              <span className="font-semibold">Mediqueue</span>
            </div>
            <p className="mt-3 text-muted-foreground">St. Helena Medical Center's official patient platform.</p>
          </div>
          <div>
            <div className="font-medium mb-3">Patients</div>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/book">Book appointment</Link></li>
              <li><Link to="/queue">Live queue</Link></li>
              <li><Link to="/dashboard">My dashboard</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-3">Hospital</div>
            <ul className="space-y-2 text-muted-foreground">
              <li className="inline-flex items-center gap-2"><MapPin className="size-3.5" /> 1200 Lakeside Ave, City</li>
              <li className="inline-flex items-center gap-2"><Phone className="size-3.5" /> +1 (555) 010‑2200</li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-3 text-destructive">Emergency</div>
            <p className="text-muted-foreground">For life-threatening emergencies, call <span className="font-semibold text-foreground">911</span> or come directly to the ER (open 24/7).</p>
          </div>
        </div>
        <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">© 2026 St. Helena Medical Center · HIPAA compliant</div>
      </footer>
    </div>
  );
}

function SectionHeader({ eyebrow, title, align = "center" }: { eyebrow: string; title: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "text-center max-w-2xl mx-auto" : "max-w-2xl"}>
      <div className="text-xs uppercase tracking-widest text-primary font-medium">{eyebrow}</div>
      <h2 className="mt-3 text-3xl md:text-[40px] leading-tight font-semibold tracking-tight text-foreground">{title}</h2>
    </div>
  );
}
