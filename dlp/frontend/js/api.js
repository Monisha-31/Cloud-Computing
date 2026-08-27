const API_BASE = '/api';

function getToken() { return localStorage.getItem('dlp_token'); }
function getUser() { const raw = localStorage.getItem('dlp_user'); return raw ? JSON.parse(raw) : null; }
function setSession(user, token) {
  localStorage.setItem('dlp_token', token);
  localStorage.setItem('dlp_user', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('dlp_token');
  localStorage.removeItem('dlp_user');
}

async function apiRequest(path, { method = 'GET', body, isFormData = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

function requireAuth() {
  const user = getUser();
  if (!user || !getToken()) {
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

function logout() {
  clearSession();
  window.location.href = 'index.html';
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
