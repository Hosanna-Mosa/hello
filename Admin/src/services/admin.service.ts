/** Every admin endpoint, typed. Pages call these — never `fetch` directly. */

import { api } from "@/lib/api";
import type {
  Admin,
  AdminReport,
  AdminSupportDetail,
  AdminSupportTicket,
  AdminUser,
  AdminUserDetail,
  DashboardStats,
  Paged,
  ReportStatus,
  SupportSummary,
  SupportTicketStatus,
  UserStatus,
} from "@/types/admin";

export const authService = {
  login: (email: string, password: string) => api.post<Admin>("/auth/login", { email, password }),
  session: () => api.get<Admin>("/auth/session"),
  logout: () => api.post<void>("/auth/logout"),
  /** A one-minute ticket for opening the live connection (see lib/socket.ts). */
  socketTicket: () => api.get<{ token: string; expiresIn: number }>("/auth/socket-ticket"),
};

export const statsService = {
  dashboard: () => api.get<DashboardStats>("/stats"),
};

export type UserQuery = { page: number; search?: string; status?: UserStatus | "" };

export const usersService = {
  list: (q: UserQuery) => api.get<Paged<AdminUser>>("/users", { page: q.page, search: q.search, status: q.status }),
  get: (id: string) => api.get<AdminUserDetail>(`/users/${encodeURIComponent(id)}`),
  revokeSessions: (id: string) => api.post<void>(`/users/${encodeURIComponent(id)}/revoke-sessions`),
};

export type ReportQuery = { page: number; status?: ReportStatus | ""; reason?: string };

export type SupportQuery = { page: number; status?: SupportTicketStatus | ""; search?: string };

export const supportService = {
  summary: () => api.get<SupportSummary>("/support/summary"),
  list: (q: SupportQuery) =>
    api.get<Paged<AdminSupportTicket>>("/support/tickets", { page: q.page, status: q.status, search: q.search }),
  /** The ticket and its conversation. Opening it marks it read for the whole team. */
  get: (id: string) => api.get<AdminSupportDetail>(`/support/tickets/${encodeURIComponent(id)}`),
  reply: (id: string, body: string, clientMessageId: string) =>
    api.post<AdminSupportDetail>(`/support/tickets/${encodeURIComponent(id)}/messages`, { body, clientMessageId }),
  /** Asks the user to confirm the issue is fixed. Only the user can close it. */
  resolve: (id: string) => api.post<AdminSupportDetail>(`/support/tickets/${encodeURIComponent(id)}/resolve`),
  markRead: (id: string) => api.post<AdminSupportTicket>(`/support/tickets/${encodeURIComponent(id)}/read`),
};

export const reportsService = {
  list: (q: ReportQuery) => api.get<Paged<AdminReport>>("/reports", { page: q.page, status: q.status, reason: q.reason }),
  setStatus: (id: string, status: ReportStatus) => api.patch<AdminReport>(`/reports/${encodeURIComponent(id)}`, { status }),
};
