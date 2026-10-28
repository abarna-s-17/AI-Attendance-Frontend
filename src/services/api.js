import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    // Expired token, deleted account or a reset database: go back to the login page instead of showing errors.
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.includes('/auth/')) {
      const role = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null')?.role; } catch { return null; } })();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login/' + (role || 'student');
    }
    return Promise.reject(error);
  }
);

/** Readable message for any failed request (server message, unreachable server, timeout...). */
export function errorMessage(error, fallback = 'Something went wrong') {
  const message = error?.response?.data?.message;
  if (message) return message;
  if (error?.response) return `${fallback} (server error ${error.response.status})`;
  if (error?.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  if (error?.code === 'ERR_NETWORK' || error?.request) {
    return `Cannot reach the server at ${BASE_URL}. Make sure the backend is running (python app.py) and VITE_API_URL is correct.`;
  }
  return error?.message || fallback;
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadCSV() {
  const response = await api.get('/reports/attendance.csv', { responseType: 'blob' });
  saveBlob(response.data, 'attendance_report.csv');
}

export async function downloadFile(path, fallbackName) {
  const response = await api.get(path, { responseType: 'blob' });
  const header = response.headers?.['content-disposition'] || '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  saveBlob(response.data, match ? decodeURIComponent(match[1]) : fallbackName);
}

export async function downloadLeaveLetter(id) {
  const response = await api.get(`/leaves/${id}/letter`, { responseType: 'blob' });
  const header = response.headers?.['content-disposition'] || '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  saveBlob(response.data, match ? decodeURIComponent(match[1]) : `leave_letter_${id}`);
}

export async function downloadMarksheetFile(id, fallbackName = 'marksheet') {
  const response = await api.get(`/academics/marksheets/${id}/download`, { responseType: 'blob' });
  const header = response.headers?.['content-disposition'] || '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  saveBlob(response.data, match ? decodeURIComponent(match[1]) : fallbackName);
}

export async function uploadMarksheetFile(formData) {
  return api.post('/academics/marksheets/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export default api;

