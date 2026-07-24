/**
 * api.ts — Central API client for Mediqueue frontend with resilient fallback data.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

// ── Error type ────────────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("mq_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = token;
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem("mq_token");
        localStorage.removeItem("mq_user");
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }
      const msg =
        (data as { msg?: string; message?: string })?.msg ??
        (data as { msg?: string; message?: string })?.message ??
        `Request failed with status ${res.status}`;
      throw new ApiError(res.status, msg);
    }

    return data as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const errorMsg = err instanceof Error ? err.message : "Network error";
    throw new ApiError(0, errorMsg);
  }
}

// ── Convenience methods ───────────────────────────────────────────────────────
export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: "GET" }),

  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

// ── Typed API calls ──────────────────────────────────────────────────────────

export type BackendDoctor = {
  _id: string;
  doctorName: string;
  qualifications: string;
  experience: string;
  city: string;
  email: string;
  phoneNo: string;
  departmentId: number;
  status: boolean;
  image?: string;
  isAvailable: boolean;
  rating: number;
  slots: Record<string, string[]>;
};

export type UpdateDoctorProfileBody = {
  doctorName?: string;
  qualifications?: string;
  experience?: string;
  phoneNo?: string;
  city?: string;
  departmentId?: number;
  isAvailable?: boolean;
};

function generate30DaysFallbackSlots(defaultTimes: string[]) {
  const slotsObj: Record<string, string[]> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    slotsObj[`${year}-${month}-${day}`] = defaultTimes;
  }
  return slotsObj;
}

const FALLBACK_DOCTORS: BackendDoctor[] = [
  {
    _id: "d1",
    doctorName: "Dr. Mei Tanaka",
    qualifications: "MD, FACC - Internal Medicine",
    experience: "12 years",
    city: "Lagos",
    email: "mei.tanaka@sthelena.med",
    phoneNo: "+234 801 234 5678",
    departmentId: 1,
    status: true,
    isAvailable: true,
    rating: 4.9,
    slots: generate30DaysFallbackSlots(["09:00", "10:30", "14:00", "15:30"]),
  },
  {
    _id: "d2",
    doctorName: "Dr. Daniel Weiss",
    qualifications: "MD, FESC - Cardiology",
    experience: "18 years",
    city: "Abuja",
    email: "daniel.weiss@sthelena.med",
    phoneNo: "+234 802 345 6789",
    departmentId: 2,
    status: true,
    isAvailable: true,
    rating: 4.8,
    slots: generate30DaysFallbackSlots(["09:30", "11:00", "15:00", "16:30"]),
  },
  {
    _id: "d3",
    doctorName: "Dr. Amara Okafor",
    qualifications: "MBBS, FWACP - Pediatrics",
    experience: "9 years",
    city: "Port Harcourt",
    email: "amara.okafor@sthelena.med",
    phoneNo: "+234 803 456 7890",
    departmentId: 3,
    status: true,
    isAvailable: true,
    rating: 4.9,
    slots: generate30DaysFallbackSlots(["10:00", "13:30", "16:00", "17:00"]),
  },
];

export const doctorApi = {
  getAll: async () => {
    try {
      return await api.get<{ total: number; doctor: BackendDoctor[] }>("/doctor/allDoctor");
    } catch {
      return { total: FALLBACK_DOCTORS.length, doctor: FALLBACK_DOCTORS };
    }
  },
  search: async (q: string) => {
    try {
      return await api.get<BackendDoctor[]>(`/doctor/search?q=${encodeURIComponent(q)}`);
    } catch {
      return FALLBACK_DOCTORS.filter((d) =>
        d.doctorName.toLowerCase().includes(q.toLowerCase()),
      );
    }
  },
  getByDepartment: async (departmentId: string | number) => {
    try {
      return await api.get<{ total: number; doctor: BackendDoctor[] }>(
        `/doctor/allDoctor/${departmentId}`,
      );
    } catch {
      const filtered = FALLBACK_DOCTORS.filter((d) => d.departmentId === Number(departmentId));
      return { total: filtered.length, doctor: filtered };
    }
  },
  addSlots: (doctorId: string, date: string, slots: string[]) =>
    api.patch<{ msg: string }>(`/doctor/addSlots/${doctorId}`, { date, slots }),
  updateProfile: (doctorId: string, body: UpdateDoctorProfileBody) =>
    api.patch<{ msg: string; doctor: BackendDoctor }>(`/doctor/updateProfile/${doctorId}`, body),
  createProfile: (body: any) =>
    api.post<{ msg: string; doctor: BackendDoctor }>("/doctor/addDoctor", body),
  rate: (doctorId: string, rating: number) =>
    api.patch<{ msg: string; rating: number }>(`/doctor/rate/${doctorId}`, { rating }),
  getPending: async () => {
    try {
      return await api.get<{ msg: string; docPending: BackendDoctor[] }>("/doctor/docPending");
    } catch {
      return { msg: "OK", docPending: [] };
    }
  },
  updateStatus: (doctorId: string, status: boolean) =>
    api.patch<{ msg: string }>(`/doctor/updateDoctorStatus/${doctorId}`, { status }),
};

// Departments
export type BackendDepartment = {
  _id: string;
  departmentId: number;
  deptName: string;
  about: string;
  image: string;
};

const FALLBACK_DEPTS: BackendDepartment[] = [
  { _id: "1", departmentId: 1, deptName: "General Medicine", about: "Primary healthcare & checkups", image: "" },
  { _id: "2", departmentId: 2, deptName: "Cardiology", about: "Heart & vascular care", image: "" },
  { _id: "3", departmentId: 3, deptName: "Pediatrics", about: "Child & infant care", image: "" },
  { _id: "4", departmentId: 4, deptName: "Orthopedics", about: "Bones & joint surgery", image: "" },
];

export const departmentApi = {
  getAll: async () => {
    try {
      const res = await api.get<{ msg: string; allDepartments: BackendDepartment[] }>(
        "/department/getAllDepartment",
      );
      return res.allDepartments || FALLBACK_DEPTS;
    } catch {
      return FALLBACK_DEPTS;
    }
  },
  getById: async (id: string | number) => {
    try {
      const res = await api.get<{ msg: string; department: BackendDepartment }>(
        `/department/getDepartment/${id}`,
      );
      return res.department;
    } catch {
      return FALLBACK_DEPTS.find((d) => d.departmentId === Number(id)) || FALLBACK_DEPTS[0];
    }
  },
};

// Appointments
export type BackendAppointment = {
  _id: string;
  patientId: string;
  doctorId: string;
  patientFirstName: string;
  docFirstName: string;
  ageOfPatient?: string;
  gender?: string;
  address?: string;
  problemDescription?: string;
  appointmentDate?: string;
  createdAt: string;
  status: boolean;
  rescheduledByDoctor?: boolean;
  originalDate?: string;
};

export type CreateAppointmentBody = {
  date: string;
  slotTime: string;
  ageOfPatient: string;
  gender: string;
  address: string;
  problemDescription: string;
  appointmentDate: string;
};

export const appointmentApi = {
  checkSlot: (doctorId: string, date: string, slotTime: string) =>
    api.post<{ available: boolean; msg: string }>(`/appointment/checkSlot/${doctorId}`, {
      date,
      slotTime,
    }),
  create: (doctorId: string, body: CreateAppointmentBody) =>
    api.post<{ message: string; status: boolean }>(`/appointment/create/${doctorId}`, body),
  getMyAppointments: async () => {
    try {
      return await api.get<{ message: string; appointments: BackendAppointment[] }>(
        "/appointment/allApp",
      );
    } catch {
      return { message: "OK", appointments: [] };
    }
  },
  cancel: (appointmentId: string) =>
    api.delete<{ message: string }>(`/appointment/cancel/${appointmentId}`),
  reschedule: (appointmentId: string, body: Partial<CreateAppointmentBody>) =>
    api.patch<{ message: string }>(`/appointment/reschedule/${appointmentId}`, body),
  rescheduleByDoctor: (appointmentId: string, appointmentDate: string) =>
    api.patch<{ message: string }>(`/appointment/doctor/reschedule/${appointmentId}`, {
      appointmentDate,
    }),
  getDoctorAppointments: async (doctorId: string) => {
    try {
      return await api.get<{ message: string; appointments: BackendAppointment[] }>(
        `/appointment/doctor/${doctorId}`,
      );
    } catch {
      return { message: "OK", appointments: [] };
    }
  },
  getAllAdmin: async () => {
    try {
      return await api.get<{ message: string; appointments: BackendAppointment[] }>(
        "/appointment/all",
      );
    } catch {
      return { message: "OK", appointments: [] };
    }
  },
  approve: (appointmentId: string) =>
    api.patch<{ message: string }>(`/appointment/approve/${appointmentId}`, {}),
  reject: (appointmentId: string) =>
    api.delete<{ message: string }>(`/appointment/reject/${appointmentId}`),
};

// Admin
export const adminApi = {
  getDashboard: async () => {
    try {
      return await api.get<{
        docPending: BackendDoctor[];
        docApproved: BackendDoctor[];
        department: BackendDepartment[];
        usersRegistered: unknown[];
        appPending: BackendAppointment[];
        appApproved: BackendAppointment[];
        totalAppointments: number;
        totalPendingAppointments: number;
      }>("/admin/all");
    } catch {
      return {
        docPending: [],
        docApproved: FALLBACK_DOCTORS,
        department: FALLBACK_DEPTS,
        usersRegistered: [],
        appPending: [],
        appApproved: [],
        totalAppointments: 0,
        totalPendingAppointments: 0,
      };
    }
  },
  signin: (body: { email: string; password: string }) =>
    api.post<{ message: string }>("/admin/signin", body),
};

// Queue
export type QueueState = {
  departmentId: number;
  deptName: string;
  currentServing: number;
  lastIssued: number;
  waitingCount: number;
  tokens: Array<{
    tokenNumber: number;
    patientId: string;
    patientName: string;
    status: "waiting" | "serving" | "done";
    issuedAt?: string;
  }>;
};

export type MyTokenState = {
  tokenNumber: number;
  position: number;
  deptId: number;
  deptName: string;
  status: "waiting" | "serving" | "done";
  currentServing: number;
} | null;

export const queueApi = {
  getStatus: async (deptId: number | string) => {
    try {
      return await api.get<QueueState>(`/queue/status/${deptId}`);
    } catch {
      return {
        departmentId: Number(deptId),
        deptName: "General Medicine",
        currentServing: 42,
        lastIssued: 45,
        waitingCount: 3,
        tokens: [
          { tokenNumber: 42, patientId: "1", patientName: "John Doe", status: "serving" as const },
          { tokenNumber: 43, patientId: "2", patientName: "Jane Smith", status: "waiting" as const },
          { tokenNumber: 44, patientId: "3", patientName: "Alex Taylor", status: "waiting" as const },
        ],
      };
    }
  },
  join: (deptId: number | string, patientName: string) =>
    api.post<{ msg: string; tokenNumber: number; position: number }>(`/queue/join/${deptId}`, {
      patientName,
    }),
  getMyToken: async () => {
    try {
      return await api.get<MyTokenState>("/queue/myToken");
    } catch {
      return null;
    }
  },
  callNext: (deptId: number | string) =>
    api.patch<{ msg: string; currentServing: number; patientName?: string }>(
      `/queue/next/${deptId}`,
      {},
    ),
  leave: (deptId: number | string) => api.delete<{ msg: string }>(`/queue/leave/${deptId}`),
  reset: (deptId: number | string) => api.post<{ msg: string }>(`/queue/reset/${deptId}`, {}),
};

// Auth
export const authApi = {
  sendOtp: (email: string) =>
    api.post<{ msg: string; email: string }>("/user/emailVerify", { email }),
  signup: (body: {
    first_name: string;
    last_name: string;
    email: string;
    mobile: string;
    password: string;
  }) => api.post<{ msg: string }>("/user/signup", body),
  signin: (body: { payload: string; password: string }) =>
    api.post<{
      message: string;
      token: string;
      name: string;
      last_name: string;
      email: string;
      mobile: string;
    }>("/user/signin", body),
  updateUser: (body: {
    first_name: string;
    last_name: string;
    email: string;
    mobile: string;
    password?: string;
  }) =>
    api.patch<{
      msg: string;
      user: { name: string; last_name: string; email: string; mobile: string };
    }>("/user/update", body),
};
