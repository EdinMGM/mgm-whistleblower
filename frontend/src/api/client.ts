import type { CreateReportInput, CreatedReport, ReportDetail, AdminInfo } from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || data.error || 'Greška na serveru');
  }

  return data as T;
}

export const api = {
  // ── Javne rute ──
  createReport: (input: CreateReportInput) =>
    request<CreatedReport>('/reports', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  accessReport: (referenceNumber: string, secretKey: string) =>
    request<ReportDetail>('/reports/access', {
      method: 'POST',
      body: JSON.stringify({ referenceNumber, secretKey }),
    }),

  sendReporterMessage: (referenceNumber: string, secretKey: string, content: string) =>
    request<{ id: string; createdAt: string }>('/reports/messages', {
      method: 'POST',
      body: JSON.stringify({ referenceNumber, secretKey, content }),
    }),

  getCategories: () =>
    request<{ categories: string[] }>('/reports/categories'),

  // ── Admin rute ──
  adminLogin: (username: string, password: string) =>
    request<{ admin: AdminInfo }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  adminLogout: () =>
    request<{ message: string }>('/auth/logout', { method: 'POST' }),

  adminMe: () =>
    request<{ admin: AdminInfo }>('/auth/me'),

  adminListReports: (params: Record<string, string | number>) => {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ).toString();
    return request<{ reports: any[]; total: number }>(`/admin/reports?${qs}`);
  },

  adminGetReport: (id: string) =>
    request<any>(`/admin/reports/${id}`),

  adminChangeStatus: (id: string, status: string) =>
    request<any>(`/admin/reports/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  adminReply: (id: string, content: string) =>
    request<any>(`/admin/reports/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  adminAddNote: (id: string, content: string) =>
    request<any>(`/admin/reports/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  adminAssign: (id: string, adminId: string) =>
    request<any>(`/admin/reports/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ adminId }),
    }),

  adminListUsers: () =>
    request<any[]>('/admin/users'),

  adminCreateUser: (data: { username: string; password: string; role: string; canAccessSensitive: boolean }) =>
    request<any>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  adminActivityLog: (params: Record<string, string | number>) => {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ).toString();
    return request<{ logs: any[]; total: number }>(`/admin/activity-log?${qs}`);
  },
};
