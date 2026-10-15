import type { Certification, Content, LogEntry, Project } from './types';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

const TOKEN_KEY = 'utk_admin_token';
export const getToken = () => {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (t: string | null) => {
  try { if (t) sessionStorage.setItem(TOKEN_KEY, t); else sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
};

async function request<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  if (!API_URL) throw new Error('Backend URL is not configured (VITE_API_URL).');
  const headers = new Headers(init.headers);
  if (auth) {
    const t = getToken();
    if (t) headers.set('Authorization', `Bearer ${t}`);
  }
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const res = await fetch(API_URL + path, { ...init, headers });
  if (res.status === 401) { setToken(null); throw new Error('Session expired. Please log in again.'); }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { const j = await res.json(); if (j.detail) msg = typeof j.detail === 'string' ? j.detail : msg; } catch { /* not json */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const fetchContent = () => request<{ content: Content; updated_at: string }>('/api/content');
export const login = (username: string, password: string) =>
  request<{ token: string; username: string }>('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
export const updateAccount = (current_password: string, new_username: string, new_password: string) =>
  request<{ token: string; username: string }>('/api/account', {
    method: 'PUT', body: JSON.stringify({ current_password, new_username, new_password }),
  }, true);
export const verifySession = () => request<{ username: string }>('/api/me', {}, true);
export const saveContent = (content: Content) =>
  request<{ updated_at: string; site_rebuild?: boolean }>('/api/content', { method: 'PUT', body: JSON.stringify({ content }) }, true);

export const importGithub = (username: string) =>
  request<{ projects: (Project & { repo: string; stars: number; pushed_at: string })[] }>(
    `/api/import/github?username=${encodeURIComponent(username)}`, {}, true);
export const importCredly = (username: string) =>
  request<{ certifications: Certification[] }>(`/api/import/credly?username=${encodeURIComponent(username)}`, {}, true);
export const importLinkedin = (file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return request<{ logbook: LogEntry[]; certifications: Certification[]; skills: string[]; projects: Project[] }>(
    '/api/import/linkedin', { method: 'POST', body: fd }, true);
};
