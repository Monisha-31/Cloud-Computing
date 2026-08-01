// Small fetch wrapper shared by every page.
// Assumes the frontend is served from the same origin as the API
// (server.js serves both), so relative paths work as-is.

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('sms_token');
}

function getUser() {
  const raw = localStorage.getItem('sms_user');
  return raw ? JSON.parse(raw) : null;
}

function setSession(user, token) {
  localStorage.setItem('sms_token', token);
  localStorage.setItem('sms_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('sms_token');
  localStorage.removeItem('sms_user');
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
  return role === 'admin' ? 'admin-dashboard.html' : 'student-dashboard.html';
}

function logout() {
  clearSession();
  window.location.href = 'index.html';
}

function statusBadgeClass(status) {
  return {
    'Pending': 'badge-open',
    'Under Review': 'badge-progress',
    'Approved': 'badge-resolved',
    'Rejected': 'badge-rejected',
  }[status] || 'badge-open';
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
