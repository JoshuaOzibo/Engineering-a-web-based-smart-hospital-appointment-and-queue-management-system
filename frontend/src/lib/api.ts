/**
 * api.ts — Central API client for Mediqueue frontend.
 *
 * All requests go through `apiFetch` which:
 *   - Prepends the backend base URL
 *   - Injects the Authorization header when a token is stored
 *   - Throws a typed ApiError on non-2xx responses
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
async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("mq_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Backend auth middleware reads raw Authorization header (not "Bearer <token>")
  if (token) {
    headers["Authorization"] = token;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Try to parse JSON regardless of status for the error message
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
      if (typeof window !== "undefined") {
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

// ── Typed API calls (grouped by domain) ──────────────────────────────────────

// Auth
export const authApi = {
  sendOtp: (email: string) => api.post<{ msg: string; email: string }>("/user/emailVerify", { email }),
  signup: (body: { first_name: string; last_name: string; email: string; mobile: string; password: string }) =>
    api.post<{ msg: string }>("/user/signup", body),
  signin: (body: { payload: string; password: string }) =>
    api.post<{ message: string; token: string; name: string; last_name: string; email: string; mobile: string }>(
      "/user/signin",
      body,
    ),
  updateUser: (body: { first_name: string; last_name: string; email: string; mobile: string; password?: string }) =>
    api.patch<{ msg: string; user: { name: string; last_name: string; email: string; mobile: string } }>("/user/update", body),
};

// Doctors
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

export const doctorApi = {
  getAll: () => api.get<{ total: number; doctor: BackendDoctor[] }>("/doctor/allDoctor"),
  search: (q: string) => api.get<BackendDoctor[]>(`/doctor/search?q=${encodeURIComponent(q)}`),
  getByDepartment: (departmentId: string | number) =>
    api.get<{ total: number; doctor: BackendDoctor[] }>(`/doctor/allDoctor/${departmentId}`),
  addSlots: (doctorId: string, date: string, slots: string[]) =>
    api.patch<{ msg: string }>(`/doctor/addSlots/${doctorId}`, { date, slots }),
  updateProfile: (doctorId: string, body: UpdateDoctorProfileBody) =>
    api.patch<{ msg: string; doctor: BackendDoctor }>(`/doctor/updateProfile/${doctorId}`, body),
  createProfile: (body: any) =>
    api.post<{ msg: string; doctor: BackendDoctor }>("/doctor/addDoctor", body),
  rate: (doctorId: string, rating: number) =>
    api.patch<{ msg: string; rating: number }>(`/doctor/rate/${doctorId}`, { rating }),
  // Admin actions
  getPending: () => api.get<{ msg: string; docPending: BackendDoctor[] }>("/doctor/docPending"),
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

export const departmentApi = {
  getAll: async () => {
    const res = await api.get<{ msg: string; allDepartments: BackendDepartment[] }>("/department/getAllDepartment");
    return res.allDepartments;
  },
  getById: async (id: string | number) => {
    const res = await api.get<{ msg: string; department: BackendDepartment }>(`/department/getDepartment/${id}`);
    return res.department;
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
    api.post<{ available: boolean; msg: string }>(`/appointment/checkSlot/${doctorId}`, { date, slotTime }),
  create: (doctorId: string, body: CreateAppointmentBody) =>
    api.post<{ message: string; status: boolean }>(`/appointment/create/${doctorId}`, body),
  getMyAppointments: () =>
    api.get<{ message: string; appointments: BackendAppointment[] }>("/appointment/allApp"),
  cancel: (appointmentId: string) =>
    api.delete<{ message: string }>(`/appointment/cancel/${appointmentId}`),
  reschedule: (appointmentId: string, body: Partial<CreateAppointmentBody>) =>
    api.patch<{ message: string }>(`/appointment/reschedule/${appointmentId}`, body),
  getDoctorAppointments: (doctorId: string) =>
    api.get<{ message: string; appointments: BackendAppointment[] }>(`/appointment/doctor/${doctorId}`),
  // Admin actions
  getAllAdmin: () =>
    api.get<{ message: string; appointments: BackendAppointment[] }>("/appointment/all"),
  approve: (appointmentId: string) =>
    api.patch<{ message: string }>(`/appointment/approve/${appointmentId}`, {}),
  reject: (appointmentId: string) =>
    api.delete<{ message: string }>(`/appointment/reject/${appointmentId}`),
};

// Admin
export const adminApi = {
  getDashboard: () =>
    api.get<{
      docPending: BackendDoctor[];
      docApproved: BackendDoctor[];
      department: BackendDepartment[];
      usersRegistered: unknown[];
      appPending: BackendAppointment[];
      appApproved: BackendAppointment[];
      totalAppointments: number;
      totalPendingAppointments: number;
    }>("/admin/all"),
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
  getStatus: (deptId: number | string) =>
    api.get<QueueState>(`/queue/status/${deptId}`),
  join: (deptId: number | string, patientName: string) =>
    api.post<{ msg: string; tokenNumber: number; position: number }>(
      `/queue/join/${deptId}`,
      { patientName },
    ),
  getMyToken: () => api.get<MyTokenState>("/queue/myToken"),
  callNext: (deptId: number | string) =>
    api.patch<{ msg: string; currentServing: number; patientName?: string }>(
      `/queue/next/${deptId}`,
      {},
    ),
  leave: (deptId: number | string) =>
    api.delete<{ msg: string }>(`/queue/leave/${deptId}`),
  reset: (deptId: number | string) =>
    api.post<{ msg: string }>(`/queue/reset/${deptId}`, {}),
};
