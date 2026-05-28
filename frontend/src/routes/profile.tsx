import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  User, Stethoscope, Loader2, MapPin, Lock, Eye, EyeOff,
  Phone, Briefcase, Award, ShieldAlert, CheckCircle2, Mail
} from "lucide-react";
import { doctorApi, departmentApi, authApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const NIGERIAN_CITIES = [
  "Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt", "Benin City",
  "Maiduguri", "Enugu", "Kaduna", "Ilorin", "Onitsha", "Warri",
  "Aba", "Owerri", "Abeokuta", "Sokoto", "Uyo", "Calabar",
  "Akure", "Jos", "Bauchi", "Zaria", "Asaba", "Yola", "Minna",
];

const SPECIALTIES = [
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

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "My Profile — Mediqueue" }] }),
  component: ProfilePage,
});

type ProfileTab = "personal" | "professional";

function ProfilePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUser } = useAuth();

  // ── Section Switcher ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ProfileTab>(() => {
    if (typeof window !== "undefined" && window.location.search.includes("register=doctor")) {
      return "professional";
    }
    return "personal";
  });

  const [showDoctorRegister, setShowDoctorRegister] = useState(() => {
    if (typeof window !== "undefined") {
      return window.location.search.includes("register=doctor");
    }
    return false;
  });

  // ── Patient Personal State ─────────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailState, setEmailState] = useState("");
  const [mobileState, setMobileState] = useState("");
  const [passwordState, setPasswordState] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ── Doctor Professional State ──────────────────────────────────────────────
  const [profileName, setProfileName] = useState("");
  const [profileQuals, setProfileQuals] = useState("");
  const [profileExp, setProfileExp] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileCity, setProfileCity] = useState("");
  const [profileDeptId, setProfileDeptId] = useState("");
  const [profileAvail, setProfileAvail] = useState(true);

  // Retrieve admin session (admin can view/edit profile pages)
  const adminSession = typeof window !== "undefined"
    ? (() => {
        try {
          return JSON.parse(localStorage.getItem("mq_admin") ?? "null") as { email: string } | null;
        } catch {
          return null;
        }
      })()
    : null;
  const isAdmin = !!adminSession;

  // ── Fetch all doctors & departments ──────────────────────────────────────────
  const { data: doctorData, isLoading: drLoading } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => doctorApi.getAll(),
    staleTime: 1000 * 60 * 2,
  });
  const doctors = useMemo(() => doctorData?.doctor ?? [], [doctorData]);

  const { data: departmentData, isLoading: deptLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentApi.getAll(),
    staleTime: 1000 * 60 * 5,
  });
  const departments = useMemo(() => departmentData ?? [], [departmentData]);
  
  // Find currently logged-in doctor
  const myDoctorProfile = useMemo(() => {
    const email = user?.email || adminSession?.email;
    if (!email) return null;
    return doctors.find((d) => d.email.toLowerCase() === email.toLowerCase()) ?? null;
  }, [doctors, user, adminSession]);

  const isDoctor = !!myDoctorProfile;

  // Route security guard: Redirect users who aren't logged in
  useEffect(() => {
    if (!drLoading) {
      if (!isAuthenticated) {
        toast.error("Access Denied: Please log in to access this page.");
        navigate({ to: "/patient", replace: true });
      }
    }
  }, [drLoading, isAuthenticated, navigate]);

  // Sync doctor professional details when loaded
  useEffect(() => {
    if (myDoctorProfile) {
      setProfileName(myDoctorProfile.doctorName ?? "");
      setProfileQuals(myDoctorProfile.qualifications ?? "");
      setProfileExp(String(myDoctorProfile.experience ?? ""));
      setProfilePhone(myDoctorProfile.phoneNo ?? "");
      setProfileCity(myDoctorProfile.city ?? "");
      setProfileDeptId(String(myDoctorProfile.departmentId ?? ""));
      setProfileAvail(myDoctorProfile.isAvailable ?? true);
    }
  }, [myDoctorProfile]);

  // Sync patient details when loaded
  useEffect(() => {
    if (user) {
      setFirstName(user.name ?? "");
      setLastName(user.last_name ?? "");
      setEmailState(user.email ?? "");
      setMobileState(user.mobile ?? "");
      
      // Auto-prefill professional details for doctor registration
      if (showDoctorRegister || isDoctor) {
        setProfileName((prev) => prev || `Dr. ${user.name ?? ""} ${user.last_name ?? ""}`.trim());
        setProfilePhone((prev) => prev || (user.mobile ?? ""));
      }
    }
  }, [user, showDoctorRegister, isDoctor]);

  // ── Update Doctor Profile Mutation ─────────────────────────────────────────
  const updateProfileMutation = useMutation({
    mutationFn: () => {
      const email = user?.email || adminSession?.email;
      if (!email) throw new Error("No authenticated email address found.");

      if (!profileName.trim() || !profileQuals.trim() || !profileExp.trim() || !profilePhone.trim() || !profileCity.trim() || !profileDeptId) {
        throw new Error("All fields (Name, Specialty, Experience, Phone, City, Department) are required.");
      }

      if (myDoctorProfile) {
        return doctorApi.updateProfile(myDoctorProfile._id, {
          doctorName: profileName.trim(),
          qualifications: profileQuals.trim(),
          experience: profileExp.trim(),
          phoneNo: profilePhone.trim(),
          city: profileCity,
          departmentId: Number(profileDeptId),
          isAvailable: profileAvail,
        });
      } else {
        return doctorApi.createProfile({
          doctorName: profileName.trim(),
          email: email.toLowerCase(),
          qualifications: profileQuals.trim(),
          experience: profileExp.trim(),
          phoneNo: profilePhone.trim(),
          city: profileCity,
          departmentId: Number(profileDeptId),
          isAvailable: profileAvail,
          status: true, // auto-approve to bypass admin approval stage!
        });
      }
    },
    onSuccess: () => {
      toast.success("Professional profile saved successfully!");
      qc.invalidateQueries({ queryKey: ["doctors"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Update Patient Mutation ────────────────────────────────────────────────
  const updatePatientMutation = useMutation({
    mutationFn: () => {
      if (!firstName.trim() || !lastName.trim() || !emailState.trim() || !mobileState.trim()) {
        throw new Error("All fields (First Name, Last Name, Email, Mobile) are required.");
      }
      return authApi.updateUser({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: emailState.trim().toLowerCase(),
        mobile: mobileState.trim(),
        password: passwordState.trim() || undefined,
      });
    },
    onSuccess: (res) => {
      toast.success("Personal profile saved successfully!");
      updateUser({
        name: res.user.name,
        last_name: res.user.last_name,
        email: res.user.email,
        mobile: res.user.mobile,
      });
      setPasswordState("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (drLoading || deptLoading) {
    return (
      <AppLayout title="My Profile" subtitle="Loading profile details...">
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="size-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Fetching details...</p>
        </div>
      </AppLayout>
    );
  }

  const showTabHeader = isDoctor || showDoctorRegister || isAdmin;

  return (
    <AppLayout
      title="My Profile"
      subtitle={
        activeTab === "personal"
          ? "Manage your contact coordinates, email, phone number, and password."
          : "Manage your specialty details, active hospital department, location, and booking availability."
      }
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Dynamic switcher tabs if user is a doctor or registering */}
        {/* {showTabHeader && (
          <div className="flex border-b border-border mb-6">
            <button
              onClick={() => setActiveTab("personal")}
              className={cn(
                "pb-3 text-sm font-semibold border-b-2 px-6 transition-all",
                activeTab === "personal"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              👤 Personal Account
            </button>
            <button
              onClick={() => setActiveTab("professional")}
              className={cn(
                "pb-3 text-sm font-semibold border-b-2 px-6 transition-all",
                activeTab === "professional"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              🩺 Professional Profile
            </button>
          </div>
        )} */}

        <div className="grid gap-8 md:grid-cols-3">
          {/* ── Left Card Summary Panel ────────────────────────────────────── */}
          <div className="md:col-span-1 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft text-center space-y-4">
              <div className="size-20 mx-auto rounded-full bg-primary/10 text-primary grid place-items-center font-bold text-2xl shadow-inner">
                {activeTab === "personal" ? (
                  firstName ? firstName[0] + (lastName[0] ?? "") : <User className="size-8" />
                ) : (
                  profileName ? profileName.split(" ").slice(-1)[0][0] : <User className="size-8" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground truncate">
                  {activeTab === "personal"
                    ? `${firstName} ${lastName}`.trim() || "Account User"
                    : profileName || "Dr. Anonymous"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {activeTab === "personal" ? emailState : myDoctorProfile?.email || user?.email}
                </p>
              </div>
              <div className="pt-2 border-t border-border space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Role Status</span>
                  {activeTab === "personal" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold text-[11px]">
                      Patient Account
                    </span>
                  ) : !myDoctorProfile ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold text-[11px]">
                      Not Registered
                    </span>
                  ) : myDoctorProfile.status ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-success/15 text-success font-semibold text-[11px]">
                      Approved Doctor
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-warning/15 text-warning font-semibold text-[11px]">
                      Pending Doctor
                    </span>
                  )}
                </div>
              </div>
            </div>

            {activeTab === "professional" && myDoctorProfile && !myDoctorProfile.status && (
              <div className="rounded-2xl border border-warning/20 bg-warning/5 p-5 shadow-soft space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="size-5 text-warning shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-warning-foreground leading-tight">Verification Required</h4>
                    <p className="text-xs text-muted-foreground">
                      Your doctor profile is currently pending approval by the hospital administration.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right Card Editor Form Panel ────────────────────────────────── */}
          <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 md:p-8 shadow-soft">
            {activeTab === "personal" ? (
              // ── PATIENT PERSONAL PROFILE FORM ──────────────────────────────
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Personal Details</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Update your account details and login credentials below.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
                      <User className="size-3.5 text-primary" /> First Name
                    </span>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 font-medium"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
                      <User className="size-3.5 text-primary" /> Last Name
                    </span>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 font-medium"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
                      <Mail className="size-3.5 text-primary" /> Email Address
                    </span>
                    <input
                      type="email"
                      value={emailState}
                      onChange={(e) => setEmailState(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 font-medium"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
                      <Phone className="size-3.5 text-primary" /> Phone Number (Mobile)
                    </span>
                    <input
                      type="text"
                      value={mobileState}
                      onChange={(e) => setMobileState(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 font-medium"
                    />
                  </label>

                  <div className="block sm:col-span-2 relative">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
                        <Lock className="size-3.5 text-primary" /> Update Password
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={passwordState}
                        onChange={(e) => setPasswordState(e.target.value)}
                        placeholder="Leave blank to keep current password"
                        className="w-full h-11 px-4 pr-10 rounded-xl border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 font-medium"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 bottom-3.5 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => updatePatientMutation.mutate()}
                  disabled={updatePatientMutation.isPending}
                  className="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2 shadow-md hover:bg-primary-hover"
                >
                  {updatePatientMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      Save Personal Profile
                    </>
                  )}
                </button>

                
              </div>
            ) : (
              // ── DOCTOR PROFESSIONAL PROFILE FORM ───────────────────────────
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Professional Credentials</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Specify your credentials below so patients can find and consult with you.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
                      <User className="size-3.5 text-primary" /> Full Name
                    </span>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Dr. John Doe"
                      className="w-full h-11 px-4 rounded-xl border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 font-medium"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
                      <Award className="size-3.5 text-primary" /> Specialty & Qualifications
                    </span>
                    <select
                      value={profileQuals}
                      onChange={(e) => setProfileQuals(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 font-medium"
                    >
                      <option value="">— Select Specialty —</option>
                      {SPECIALTIES.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
                      <Briefcase className="size-3.5 text-primary" /> Experience (Years)
                    </span>
                    <input
                      type="number"
                      value={profileExp}
                      onChange={(e) => setProfileExp(e.target.value)}
                      placeholder="e.g. 10"
                      min="0"
                      className="w-full h-11 px-4 rounded-xl border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 font-medium"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
                      <Phone className="size-3.5 text-primary" /> Phone Number (Work)
                    </span>
                    <input
                      type="text"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="+234 800 000 0000"
                      className="w-full h-11 px-4 rounded-xl border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 font-medium"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
                      <MapPin className="size-3.5 text-primary" /> City / Location
                    </span>
                    <select
                      value={profileCity}
                      onChange={(e) => setProfileCity(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 font-medium"
                    >
                      <option value="">— Select City —</option>
                      {NIGERIAN_CITIES.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
                      <Stethoscope className="size-3.5 text-primary" /> Active Department
                    </span>
                    <select
                      value={profileDeptId}
                      onChange={(e) => setProfileDeptId(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 font-medium"
                    >
                      <option value="">— Select Department —</option>
                      {departments.map((dept) => (
                        <option key={dept._id} value={dept.departmentId}>
                          {dept.deptName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="sm:col-span-2 pt-2">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={profileAvail}
                        onChange={(e) => setProfileAvail(e.target.checked)}
                        className="size-5 rounded-lg border-border text-primary focus:ring-primary/40 cursor-pointer"
                      />
                      <div className="leading-tight">
                        <span className="text-sm font-semibold text-foreground block">
                          Available for Booking Appointments
                        </span>
                        <span className="text-xs text-muted-foreground">
                          When active, patients will see you listed on the booking portal.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  onClick={() => updateProfileMutation.mutate()}
                  disabled={updateProfileMutation.isPending}
                  className="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2 shadow-md hover:bg-primary-hover"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving Configuration...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      Save Professional Profile
                    </>
                  )}
                </button>

                {showDoctorRegister && !myDoctorProfile && (
                  <button
                    onClick={() => {
                      setShowDoctorRegister(false);
                      setActiveTab("personal");
                    }}
                    className="w-full text-center text-xs text-primary hover:underline font-semibold mt-4 block"
                  >
                    Cancel & Return to Personal Profile
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
