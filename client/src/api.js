// Small fetch wrapper. Handles the JWT, the sliding 30-minute session (FR-2)
// via X-Refresh-Token, and turns API errors into readable messages.
const KEY = 'connectx_token';

export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t) => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY));

let onExpired = () => {};
export const setOnExpired = (fn) => (onExpired = fn);

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: form || (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const fresh = res.headers.get('X-Refresh-Token');
  if (fresh) setToken(fresh);
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    if (res.status === 401 && token) {
      setToken(null);
      onExpired(data.error);
    }
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.code = data.code;
    throw err;
  }
  return data;
}

export const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
export const initials = (name = '') =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
export const fmtDate = (d) =>
  new Date(d).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
