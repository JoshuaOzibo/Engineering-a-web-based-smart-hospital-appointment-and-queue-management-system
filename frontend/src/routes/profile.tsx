import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  User, Stethoscope, Loader2, MapPin,
  Phone, Briefcase, Award, ShieldAlert, CheckCircle2,
} from "lucide-react";
import { doctorApi, departmentApi, authApi, type BackendDoctor, type UpdateDoctorProfileBody } from "@/lib/api";

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

function ProfilePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUser } = useAuth();

  // ── Form State ─────────────────────────────────────────────────────────────
  const [profileName, setProfileName] = useState("");
  const [profileQuals, setProfileQuals] = useState("");
  const [profileExp, setProfileExp] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileCity, setProfileCity] = useState("");
  const [profileDeptId, setProfileDeptId] = useState("");
  const [profileAvail, setProfileAvail] = useState(true);

  // ── Patient Profile State ──────────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailState, setEmailState] = useState("");
  const [mobileState, setMobileState] = useState("");
  const [showDoctorRegister, setShowDoctorRegister] = useState(() => {
    if (typeof window !== "undefined") {
      return window.location.search.includes("register=doctor");
    }
    return false;
  });

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

  // Route security guard: Redirect users who aren't logged in
  useEffect(() => {
    if (!drLoading) {
      if (!isAuthenticated) {
        toast.error("Access Denied: Please log in to access this page.");
        navigate({ to: "/patient", replace: true });
      }
    }
  }, [drLoading, isAuthenticated, navigate]);

  // Sync profile details into form state when loaded
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

  // Sync patient details into state when loaded
  useEffect(() => {
    if (user) {
      setFirstName(user.name ?? "");
      setLastName(user.last_name ?? "");
      setEmailState(user.email ?? "");
      setMobileState(user.mobile ?? "");
      
      // Auto-prefill professional details for doctor registration
      if (showDoctorRegister) {
        setProfileName((prev) => prev || `Dr. ${user.name ?? ""} ${user.last_name ?? ""}`.trim());
        setProfilePhone((prev) => prev || (user.mobile ?? ""));
      }
    }
  }, [user, showDoctorRegister]);

  // ── Update Profile Mutation ───────────────────────────────────────────────
  const updateProfileMutation = useMutation({
    mutationFn: () => {
      const email = user?.email || adminSession?.email;
      if (!email) throw new Error("No authenticated email address found.");

      if (!profileName.trim() || !profileQuals.trim() || !profileExp.trim() || !profilePhone.trim() || !profileCity.trim() || !profileDeptId) {
        throw new Error("All fields (Name, Specialty, Experience, Phone, City, Department) are required.");
      }

      if (myDoctorProfile) {
        const body: UpdateDoctorProfileBody = {
          doctorName: profileName.trim(),
          qualifications: profileQuals.trim(),
          experience: profileExp.trim(),
          phoneNo: profilePhone.trim(),
          city: profileCity,
          departmentId: Number(profileDeptId),
          isAvailable: profileAvail,
        };
        return doctorApi.updateProfile(myDoctorProfile._id, body);
      } else {
        const body = {
          doctorName: profileName.trim(),
          email: email.toLowerCase(),
          qualifications: profileQuals.trim(),
          experience: profileExp.trim(),
          phoneNo: profilePhone.trim(),
          city: profileCity,
          departmentId: Number(profileDeptId),
          isAvailable: profileAvail,
          status: true, // auto-approve to bypass admin approval stage!
        };
        return doctorApi.createProfile(body);
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
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (drLoading || deptLoading) {
    return (
      <AppLayout title="My Profile" subtitle="Loading professional records...">
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="size-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Fetching details...</p>
        </div>
      </AppLayout>
    );
  }

  const isDocOrAdmin = !!myDoctorProfile || isAdmin;
  const renderDoctorForm = isDocOrAdmin || showDoctorRegister;

  if (renderDoctorForm) {
    return (
      <AppLayout
        title="My Professional Profile"
        subtitle="Manage your specialty details, active hospital department, location, and booking availability."
      >
        <div className="max-w-4xl mx-auto grid gap-8 md:grid-cols-3">
          {/* Left Card: Info and Verification status */}
          <div className="md:col-span-1 space-y-6">
            {showDoctorRegister && !myDoctorProfile && (
              <button
                onClick={() => {
                  setShowDoctorRegister(false);
                  if (typeof window !== "undefined") {
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }
                }}
                className="w-full text-left text-xs text-primary hover:underline font-semibold flex items-center gap-1.5 mb-2"
              >
                ← Back to Personal Profile
              </button>
            )}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft text-center space-y-4">
              <div className="size-20 mx-auto rounded-full bg-primary/10 text-primary grid place-items-center font-bold text-2xl shadow-inner">
                {profileName ? profileName.split(" ").slice(-1)[0][0] : <User className="size-8" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground truncate">{profileName || "Dr. Anonymous"}</h2>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{myDoctorProfile?.email || user?.email || adminSession?.email}</p>
              </div>
              <div className="pt-2 border-t border-border space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Rating</span>
                  <span className="font-semibold text-foreground">
                    ★ {myDoctorProfile?.rating ? myDoctorProfile.rating.toFixed(1) : "Unrated"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Status</span>
                  {!myDoctorProfile ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold text-[11px]">
                      Not Configured
                    </span>
                  ) : myDoctorProfile.status ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-success/15 text-success font-semibold text-[11px]">
                      Approved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-warning/15 text-warning font-semibold text-[11px]">
                      Pending Approval
                    </span>
                  )}
                </div>
              </div>
            </div>

            {myDoctorProfile && !myDoctorProfile.status && (
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

            {!myDoctorProfile && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-soft space-y-3">
                <div className="flex items-start gap-3">
                  <Stethoscope className="size-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-primary-foreground leading-tight">Create Professional Profile</h4>
                    <p className="text-xs text-muted-foreground">
                      Configure your credentials, specialty, active department, and city to activate your doctor profile.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Card: Dynamic self-service form */}
          <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 md:p-8 shadow-soft space-y-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">Profile Information</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Specify your coordinates below so patients can find and consult with you.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {/* Full Name */}
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

              {/* Qualifications & Specialty (Select Dropdown) */}
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <Award className="size-3.5 text-primary" /> Qualifications & Specialty
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

              {/* Years of Experience */}
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

              {/* Contact Phone */}
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <Phone className="size-3.5 text-primary" /> Phone Number
                </span>
                <input
                  type="text"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="+234 800 000 0000"
                  className="w-full h-11 px-4 rounded-xl border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 font-medium"
                />
              </label>

              {/* Nigerian Location (Select Dropdown) */}
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <MapPin className="size-3.5 text-primary" /> City / Location
                </span>
                <select
                  value={profileCity}
                  onChange={(e) => setProfileCity(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 font-medium"
                >
                  <option value="">— Select Nigerian City —</option>
                  {NIGERIAN_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>

              {/* Department Selection */}
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

              {/* Availability Option */}
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
                  Saving Profile Changes...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Save Profile Configuration
                </>
              )}
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Patient view
  return (
    <AppLayout
      title="My Personal Profile"
      subtitle="Manage your contact coordinates, email, and notification details."
    >
      <div className="max-w-4xl mx-auto grid gap-8 md:grid-cols-3">
        {/* Left Card: Patient summary */}
        <div className="md:col-span-1 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft text-center space-y-4">
            <div className="size-20 mx-auto rounded-full bg-primary/10 text-primary grid place-items-center font-bold text-2xl shadow-inner">
              {firstName ? firstName[0] + (lastName[0] ?? "") : <User className="size-8" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground truncate">
                {firstName} {lastName}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{emailState}</p>
            </div>
            <div className="pt-2 border-t border-border space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Account Role</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold text-[11px]">
                  Patient
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Personal profile form */}
        <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 md:p-8 shadow-soft space-y-6">
          <div>
            <h3 className="text-lg font-bold text-foreground">Personal Details</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Keep your contact details up to date so the clinic can reach you.
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
                <User className="size-3.5 text-primary" /> Email Address
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
                <Phone className="size-3.5 text-primary" /> Mobile Number
              </span>
              <input
                type="text"
                value={mobileState}
                onChange={(e) => setMobileState(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-input bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 font-medium"
              />
            </label>
          </div>

          <button
            onClick={() => updatePatientMutation.mutate()}
            disabled={updatePatientMutation.isPending}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2 shadow-md hover:bg-primary-hover"
          >
            {updatePatientMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving Details...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Save Personal Profile
              </>
            )}
          </button>

          <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <h4 className="text-sm font-semibold text-foreground">Are you a Medical Professional?</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Register as a doctor to start consulting patients and managing queues.
              </p>
            </div>
            <button
              onClick={() => {
                setProfileName(`${firstName} ${lastName}`.trim());
                setShowDoctorRegister(true);
              }}
              className="px-4 py-2 rounded-xl border border-primary text-primary hover:bg-primary/5 text-xs font-semibold shrink-0 transition-colors"
            >
              🏥 Register as Doctor
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
