import {
  clearAuth,
  getRole,
  getToken,
  getRefreshToken,
  updateAccessToken,
  updateRefreshToken,
} from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api';

type ApiResponse<T, M = undefined> = {
  success: boolean;
  message?: string;
  data: T;
  meta?: M;
};

function authHeaders() {
  const token = getToken();
  const role = getRole();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(role ? { 'x-role': role } : {}),
  };
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearAuth();
    return false;
  }

  const res = (await response.json()) as ApiResponse<{ accessToken: string; refreshToken: string }>;
  if (!res.success) {
    clearAuth();
    return false;
  }

  updateAccessToken(res.data.accessToken);
  updateRefreshToken(res.data.refreshToken);
  return true;
}

async function request<T, M = undefined>(
  path: string,
  init?: RequestInit,
  retried = false,
): Promise<ApiResponse<T, M>> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (response.status === 401 && !retried) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return request<T, M>(path, init, true);
    }
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `请求失败: ${response.status}`);
  }

  return (await response.json()) as ApiResponse<T, M>;
}

export async function apiGet<T, M = undefined>(path: string): Promise<ApiResponse<T, M>> {
  return request<T, M>(path);
}

export async function apiPost<T, B = undefined, M = undefined>(path: string, body?: B): Promise<ApiResponse<T, M>> {
  return request<T, M>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPut<T, B, M = undefined>(path: string, body: B): Promise<ApiResponse<T, M>> {
  return request<T, M>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}
