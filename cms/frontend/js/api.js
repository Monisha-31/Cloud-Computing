// Small fetch wrapper shared by every page.
// Assumes the frontend is served from the same origin as the API
// (server.js serves both), so relative paths work as-is.

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('cms_token');
}

function getUser() {
  const raw = localStorage.getItem('cms_user');
  return raw ? JSON.parse(raw) : null;
}

function setSession(user, token) {
  localStorage.setItem('cms_token', token);
  localStorage.setItem('cms_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('cms_token');
  localStorage.removeItem('cms_user');
}

async function apiRequest(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  return data;
}

// Redirect helper: bounces a logged-out user back to login,
// or a logged-in user to the dashboard matching their role.
function requireRole(expectedRole) {
  const user = getUser();
  if (!user || !getToken()) {
    window.location.href = 'index.html';
    return null;
  }
  if (user.role !== expectedRole) {
    window.location.href = dashboardForRole(user.role);
    return null;
  }
  return user;
}

function dashboardForRole(role) {
  if (role === 'admin') return 'admin-dashboard.html';
  if (role === 'staff') return 'staff-dashboard.html';
  return 'user-dashboard.html';
}

function logout() {
  clearSession();
  window.location.href = 'index.html';
}

function statusBadgeClass(status) {
  return {
    'Open': 'badge-open',
    'In Progress': 'badge-progress',
    'Resolved': 'badge-resolved',
    'Rejected': 'badge-rejected',
  }[status] || 'badge-open';
}

function priorityBadgeClass(priority) {
  return {
    'Low': 'badge-priority-low',
    'Medium': 'badge-priority-medium',
    'High': 'badge-priority-high',
    'Urgent': 'badge-priority-urgent',
  }[priority] || 'badge-priority-medium';
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
