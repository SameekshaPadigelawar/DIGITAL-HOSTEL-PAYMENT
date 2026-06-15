const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SESSION_KEY = 'hostelpay_session';

export const SHARING_RENTS = {
  single: 12000,
  double: 8000,
  triple: 6000,
  quad: 5000,
};

export const SHARING_LABELS = {
  single: 'Single Sharing',
  double: 'Double Sharing',
  triple: 'Triple Sharing',
  quad: 'Quad Sharing',
};

export const DEFAULT_SHARING_OPTIONS = Object.entries(SHARING_RENTS).map(([sharing, rent]) => ({
  sharing,
  label: SHARING_LABELS[sharing],
  rent,
}));

export function getSharingLabel(sharing, options = []) {
  const configuredOption = options.find((option) => option.sharing === sharing);
  return configuredOption?.label || SHARING_LABELS[sharing] || sharing || '-';
}

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch {
    return {
      success: false,
      message: 'Backend is not running. Start it with: cd backend && npm run dev',
    };
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      success: false,
      message: data.message || 'Something went wrong. Please try again.',
    };
  }

  return data;
}

export function getSession() {
  return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
}

export function setSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function registerUser(userData) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function login(email, password, role) {
  const result = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });

  if (result.success) {
    setSession(result.user);
  }

  return result;
}

export async function getUserById(id) {
  const result = await request(`/users/${id}`);
  return result.success ? result.user : null;
}

export async function getTenantsForOwner(ownerId) {
  const result = await request(`/owners/${ownerId}/tenants`);
  return result.success ? result.tenants : [];
}

export async function getAvailableHostels() {
  const result = await request('/hostels');
  return result.success ? result.hostels : [];
}

export async function getHostelByOwnerId(ownerId) {
  if (!ownerId) return null;
  const result = await request(`/hostels/${ownerId}`);
  return result.success ? result.hostel : null;
}

export async function getOwnerStats(ownerId) {
  const result = await request(`/owners/${ownerId}/stats`);
  return result.success ? result.stats : null;
}

export async function getOwnerSettings(ownerId) {
  const result = await request(`/owners/${ownerId}/settings`);
  return result.success
    ? result.settings
    : { hostelName: '', ownerName: '', upiId: '', location: '', qrCode: '', sharingOptions: DEFAULT_SHARING_OPTIONS };
}

export async function saveOwnerSettings(ownerId, settings) {
  return request(`/owners/${ownerId}/settings`, {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function getPayments(filters = {}) {
  const params = new URLSearchParams();
  if (filters.tenantId) params.set('tenantId', filters.tenantId);
  if (filters.ownerId) params.set('ownerId', filters.ownerId);
  const query = params.toString() ? `?${params.toString()}` : '';
  const result = await request(`/payments${query}`);
  return result.success ? result.payments : [];
}

export async function savePayment(payment) {
  return request('/payments', {
    method: 'POST',
    body: JSON.stringify(payment),
  });
}

export async function approvePayment(paymentId) {
  return request(`/payments/${paymentId}/approve`, {
    method: 'PUT',
  });
}

export async function getComplaints(filters = {}) {
  const params = new URLSearchParams();
  if (filters.tenantId) params.set('tenantId', filters.tenantId);
  if (filters.ownerId) params.set('ownerId', filters.ownerId);
  const query = params.toString() ? `?${params.toString()}` : '';
  const result = await request(`/complaints${query}`);
  return result.success ? result.complaints : [];
}

export async function saveComplaint(complaint) {
  return request('/complaints', {
    method: 'POST',
    body: JSON.stringify(complaint),
  });
}

export async function resolveComplaint(complaintId) {
  return request(`/complaints/${complaintId}/resolve`, {
    method: 'PUT',
  });
}

export async function getReminders(filters = {}) {
  const params = new URLSearchParams();
  if (filters.ownerId) params.set('ownerId', filters.ownerId);
  const query = params.toString() ? `?${params.toString()}` : '';
  const result = await request(`/reminders${query}`);
  return result.success ? result.reminders : [];
}

export async function saveReminder(reminder) {
  return request('/reminders', {
    method: 'POST',
    body: JSON.stringify(reminder),
  });
}

export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonth(monthStr) {
  const [y, m] = monthStr.split('-');
  return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function formatCurrency(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}
