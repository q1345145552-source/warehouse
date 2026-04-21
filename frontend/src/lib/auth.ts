export type UserRole = 'warehouse' | 'admin';

const ACCESS_TOKEN_KEY = 'wm_access_token';
const REFRESH_TOKEN_KEY = 'wm_refresh_token';
const ROLE_KEY = 'wm_role';
const ACCOUNT_KEY = 'wm_account';
const WAREHOUSE_KEY = 'wm_warehouse_id';

export function saveAuth(payload: {
  accessToken: string;
  refreshToken: string;
  role: UserRole;
  account: string;
  warehouseId: string | null;
}) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, payload.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
  localStorage.setItem(ROLE_KEY, payload.role);
  localStorage.setItem(ACCOUNT_KEY, payload.account);
  localStorage.setItem(WAREHOUSE_KEY, payload.warehouseId ?? '');
}

export function updateAccessToken(accessToken: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function updateRefreshToken(refreshToken: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(ACCOUNT_KEY);
  localStorage.removeItem(WAREHOUSE_KEY);
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getRole(): UserRole | null {
  if (typeof window === 'undefined') return null;
  const role = localStorage.getItem(ROLE_KEY);
  return role === 'admin' || role === 'warehouse' ? role : null;
}

export function getAccount() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCOUNT_KEY);
}

export function getWarehouseId() {
  if (typeof window === 'undefined') return null;
  const id = localStorage.getItem(WAREHOUSE_KEY);
  return id || null;
}

export function isLoggedIn() {
  return Boolean(getToken() && getRole());
}
