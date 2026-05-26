import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Hospital,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Clock,
  HeartPulse,
} from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — Mediqueue" },
      { name: "description", content: "Sign in or create a Mediqueue patient account to book appointments and track your queue." },
    ],
  }),
  component: LoginPage,
});

type Tab = "signin" | "signup";

const features = [
  { icon: Clock, title: "Skip the waiting room", desc: "Join the queue from home and arrive exactly on time." },
  { icon: ShieldCheck, title: "Secure & HIPAA compliant", desc: "Your health data is encrypted end-to-end." },
  { icon: HeartPulse, title: "Real-time updates", desc: "Live queue tracking across all departments." },
];

function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [tab, setTab] = useState<Tab>("signin");
  const [showPassword, setShowPassword] = useState(false);

  // Sign-in fields
  const [siPayload, setSiPayload] = useState("");
  const [siPassword, setSiPassword] = useState("");

  // Sign-up fields
  const [suFirstName, setSuFirstName] = useState("");
  const [suLastName, setSuLastName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suMobile, setSuMobile] = useState("");
  const [suPassword, setSuPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/dashboard" });
    }
  }, [isAuthenticated, navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(siPayload, siPassword);
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authApi.signup({
        first_name: suFirstName,
        last_name: suLastName,
        email: suEmail,
        mobile: suMobile,
        password: suPassword,
      });
      // Auto-login immediately after signup so user lands on the dashboard
      await login(suEmail, suPassword);
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Left panel (branding) ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-primary/70 flex-col justify-between p-12">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px]" />

        {/* Floating decorative blobs */}
        <div className="absolute -top-20 -left-20 size-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 size-60 rounded-full bg-primary-foreground/10 blur-3xl" />

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-white/20 backdrop-blur grid place-items-center">
              <Hospital className="size-6 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-xl tracking-tight">Mediqueue</div>
              <div className="text-white/60 text-xs">St. Helena Medical Center</div>
            </div>
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl font-bold text-white leading-tight"
            >
              Healthcare that<br />
              <span className="text-white/80">respects your time.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-4 text-white/70 text-lg leading-relaxed"
            >
              Book appointments, track your queue, and get care without the wait.
            </motion.p>
          </div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4"
          >
            {features.map((f) => (
              <li key={f.title} className="flex items-start gap-4">
                <div className="size-10 rounded-xl bg-white/15 backdrop-blur grid place-items-center shrink-0">
                  <f.icon className="size-5 text-white" />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{f.title}</div>
                  <div className="text-white/60 text-xs mt-0.5">{f.desc}</div>
                </div>
              </li>
            ))}
          </motion.ul>
        </div>

        {/* Live queue preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="relative z-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/80 text-xs font-medium uppercase tracking-wider">Cardiology — Live</span>
            <span className="flex items-center gap-1.5 text-xs font-medium bg-white/20 text-white px-2.5 py-1 rounded-full">
              <span className="size-1.5 rounded-full bg-green-400 animate-pulse" />
              4 in queue
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {["A-039", "A-040", "A-041"].map((n, i) => (
              <div
                key={n}
                className={cn(
                  "rounded-xl py-3 text-sm font-semibold",
                  i === 1 ? "bg-white text-primary" : "bg-white/15 text-white"
                )}
              >
                {n}
                <div className="text-[10px] font-normal mt-0.5 opacity-70">
                  {i === 0 ? "Done" : i === 1 ? "In room" : "Next"}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Right panel (form) ────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center">
              <Hospital className="size-5" />
            </div>
            <span className="font-bold text-lg text-foreground">Mediqueue</span>
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-xl bg-muted p-1 mb-8">
            {(["signin", "signup"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); setSuccessMsg(null); }}
                className={cn(
                  "flex-1 h-9 rounded-lg text-sm font-medium transition-all",
                  tab === t
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t === "signin" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ── SIGN IN ────────────────────────────────────────────────── */}
            {tab === "signin" && (
              <motion.div
                key="signin"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.22 }}
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
                  <p className="text-muted-foreground text-sm mt-1">Sign in with your email or mobile number.</p>
                </div>

                <form onSubmit={handleSignIn} className="space-y-4" id="signin-form">
                  <FormField
                    id="si-payload"
                    label="Email or Mobile"
                    icon={<Mail className="size-4" />}
                    type="text"
                    placeholder="you@example.com or +1 555 000 0000"
                    value={siPayload}
                    onChange={setSiPayload}
                    required
                  />
                  <div className="relative">
                    <FormField
                      id="si-password"
                      label="Password"
                      icon={<Lock className="size-4" />}
                      type={showPassword ? "text" : "password"}
                      placeholder="Your password"
                      value={siPassword}
                      onChange={setSiPassword}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 bottom-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>

                  {error && <ErrorBanner msg={error} />}

                  <button
                    id="signin-submit"
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 transition-opacity"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <>Sign In <ArrowRight className="size-4" /></>}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── SIGN UP ────────────────────────────────────────────────── */}
            {tab === "signup" && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22 }}
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-foreground">Create your account</h2>
                  <p className="text-muted-foreground text-sm mt-1">Fill in your details to get started.</p>
                </div>

                {successMsg && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl bg-success/10 text-success border border-success/20 px-4 py-3 text-sm">
                    <CheckCircle2 className="size-4 shrink-0" /> {successMsg}
                  </div>
                )}

                <form onSubmit={handleSignUp} className="space-y-4" id="signup-form">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField id="su-first" label="First name" icon={<User className="size-4" />} type="text" placeholder="Sara" value={suFirstName} onChange={setSuFirstName} required />
                    <FormField id="su-last" label="Last name" icon={<User className="size-4" />} type="text" placeholder="Ahmed" value={suLastName} onChange={setSuLastName} required />
                  </div>
                  <FormField id="su-email" label="Email" icon={<Mail className="size-4" />} type="email" placeholder="sara@example.com" value={suEmail} onChange={setSuEmail} required />
                  <FormField id="su-mobile" label="Mobile" icon={<Phone className="size-4" />} type="tel" placeholder="+1 555 000 0000" value={suMobile} onChange={setSuMobile} required />
                  <div className="relative">
                    <FormField id="su-password" label="Password" icon={<Lock className="size-4" />} type={showPassword ? "text" : "password"} placeholder="Create a password" value={suPassword} onChange={setSuPassword} required />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 bottom-3 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>

                  {error && <ErrorBanner msg={error} />}

                  <button
                    id="create-account-btn"
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 transition-opacity"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <>Create Account <ArrowRight className="size-4" /></>}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our{" "}
            <span className="underline cursor-pointer hover:text-foreground">Terms of Service</span> and{" "}
            <span className="underline cursor-pointer hover:text-foreground">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function FormField({
  id,
  label,
  icon,
  type,
  placeholder,
  value,
  onChange,
  required,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="relative mt-1.5">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full h-11 rounded-xl border border-input bg-card pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition-colors"
        />
      </div>
    </label>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 text-sm">
      <span className="shrink-0">⚠</span> {msg}
    </div>
  );
}
