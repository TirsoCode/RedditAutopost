// Thin fetch wrapper around the backend API.
const BASE = '/api';

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
  return data;
}

/** Ensure the MVP session cookie exists. */
export function bootstrap() {
  return request('/auth/login', { method: 'POST' });
}

export const api = {
  drafts: () => request('/posts/drafts'),
  published: () => request('/posts/published'),
  approve: (id) => request(`/posts/${id}/approve`, { method: 'POST' }),
  reject: (id) => request(`/posts/${id}/reject`, { method: 'POST' }),
  edit: (id, { content, title }) => request(`/posts/${id}/edit`, { method: 'PATCH', body: { content, title } }),
  publish: (id) => request(`/publish/${id}`, { method: 'POST' }),

  subreddits: () => request('/subreddits'),
  addSubreddit: (name) => request('/subreddits', { method: 'POST', body: { name } }),
  toggleSubreddit: (name, active) => request(`/subreddits/${encodeURIComponent(name)}`, { method: 'PATCH', body: { active } }),
  removeSubreddit: (name) => request(`/subreddits/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  stats: () => request('/stats/overview'),

  settings: () => request('/settings'),
  updateSettings: (body) => request('/settings', { method: 'PUT', body }),

  connectReddit: () => request('/auth/reddit/connect', { method: 'POST' }),
  disconnectReddit: () => request('/auth/reddit/disconnect', { method: 'POST' }),
};