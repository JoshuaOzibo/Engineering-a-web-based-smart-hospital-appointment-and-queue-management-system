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

export const doctorApi = {
  getAll: () => api.get<{ total: number; doctor: BackendDoctor[] }>("/doctor/allDoctor"),
  search: (q: string) => api.get<BackendDoctor[]>(`/doctor/search?q=${encodeURIComponent(q)}`),
  getByDepartment: (departmentId: string | number) =>
    api.get<{ total: number; doctor: BackendDoctor[] }>(`/doctor/allDoctor/${departmentId}`),
  addSlots: (doctorId: string, date: string, slots: string[]) =>
    api.patch<{ msg: string }>(`/doctor/addSlots/${doctorId}`, { date, slots }),
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
  getAll: () => api.get<BackendDepartment[]>("/department/getAllDepartment"),
  getById: (id: string | number) => api.get<BackendDepartment>(`/department/getDepartment/${id}`),
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
