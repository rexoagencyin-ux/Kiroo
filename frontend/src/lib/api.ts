'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const BASE = `${API_URL}/api`;

const ACCESS_KEY = 'ms_access_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}
export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(ACCESS_KEY, token);
  else localStorage.removeItem(ACCESS_KEY);
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
  retry?: boolean;
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) return false;
        const data = await res.json();
        if (data?.accessToken) {
          setToken(data.accessToken);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        setTimeout(() => (refreshing = null), 0);
      }
    })();
  }
  return refreshing;
}

async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, retry = true, headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };
  const token = getToken();
  if (auth && token) finalHeaders.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: finalHeaders,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && retry) {
    const ok = await tryRefresh();
    if (ok) return request<T>(path, { ...options, retry: false });
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(res.status, data?.message || 'Request failed', data?.details);
  }
  return data as T;
}

/** For multipart uploads (admin image upload). */
async function upload<T = unknown>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: 'include',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new ApiError(res.status, data?.message || 'Upload failed', data?.details);
  return data as T;
}

export const api = {
  get: <T = unknown>(path: string, auth = true) => request<T>(path, { method: 'GET', auth }),
  post: <T = unknown>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: 'POST', body, auth }),
  patch: <T = unknown>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: 'PATCH', body, auth }),
  put: <T = unknown>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: 'PUT', body, auth }),
  delete: <T = unknown>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: 'DELETE', body, auth }),
  upload,
};

export { API_URL };
