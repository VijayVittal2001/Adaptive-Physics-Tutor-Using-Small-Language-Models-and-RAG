export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export const apiRequest = async (path, options = {}) => {
  const token = localStorage.getItem('physics_rag_token');
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) data = await res.json();
  else data = await res.text();
  if (!res.ok) {
    const msg = data?.detail || data?.message || `API error ${res.status}`;
    throw new Error(msg);
  }
  return { data, status: res.status, message: 'Success' };
};

export default apiRequest;
