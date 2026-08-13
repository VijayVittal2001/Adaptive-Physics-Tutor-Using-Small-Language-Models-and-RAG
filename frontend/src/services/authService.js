import { apiRequest } from './api';

const saveSession = (user, token) => {
  if (user) localStorage.setItem('physics_rag_user', JSON.stringify(user));
  if (token) localStorage.setItem('physics_rag_token', token);
};

export const authService = {
  login: async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, password })
    });
    saveSession(response.data.user, response.data.token);
    return response;
  },
  register: async ({ name, email, password }) => {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email: email.trim().toLowerCase(), password })
    });
    if (response.data.token) saveSession(response.data.user, response.data.token);
    return response;
  },
  googleSignIn: async (idToken) => {
    const response = await apiRequest('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken })
    });
    saveSession(response.data.user, response.data.token);
    return response;
  },
  logout: async () => {
    localStorage.removeItem('physics_rag_user');
    localStorage.removeItem('physics_rag_token');
    return { status: 200 };
  },
  getCurrentUser: () => {
    const data = localStorage.getItem('physics_rag_user');
    if (!data) return null;
    try { return JSON.parse(data); } catch { return null; }
  }
};
