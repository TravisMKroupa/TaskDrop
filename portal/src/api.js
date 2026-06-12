const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('taskdrop_token');
}

function setSession(tokenResponse) {
  localStorage.setItem('taskdrop_token', tokenResponse.accessToken);
  localStorage.setItem('taskdrop_refresh', tokenResponse.refreshToken);
  localStorage.setItem('taskdrop_user', JSON.stringify(tokenResponse.user));
}

export function getUser() {
  const raw = localStorage.getItem('taskdrop_user');
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  localStorage.removeItem('taskdrop_token');
  localStorage.removeItem('taskdrop_refresh');
  localStorage.removeItem('taskdrop_user');
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    logout();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: async (body) => {
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify(body) });
    setSession(data);
    return data;
  },
  me: () => request('/auth/me'),
  createDesktopCode: (body) => request('/auth/desktop/code', { method: 'POST', body: JSON.stringify(body) }),
  getOrg: () => request('/org'),
  updateOrg: (body) => request('/org', { method: 'PUT', body: JSON.stringify(body) }),
  getMembers: () => request('/org/members'),
  inviteMember: (body) => request('/org/members', { method: 'POST', body: JSON.stringify(body) }),
  updateMember: (id, body) => request(`/org/members/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  removeMember: (id) => request(`/org/members/${id}`, { method: 'DELETE' }),
  checkout: (planId) => request('/billing/checkout', { method: 'POST', body: JSON.stringify({ planId }) }),
  portal: () => request('/billing/portal', { method: 'POST', body: JSON.stringify({}) }),
  getLatestRelease: () => request('/releases/latest'),
};
