import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedUser = authService.getCurrentUser();
    if (storedUser) setUser(storedUser);
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setLoading(true); setError(null);
    try {
      const response = await authService.login(email, password);
      setUser(response.data.user);
      return response.data.user;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    } finally { setLoading(false); }
  };

  const register = async (payload) => {
    setLoading(true); setError(null);
    try {
      const response = await authService.register(payload);
      if (response.data.token) setUser(response.data.user);
      return response.data;
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally { setLoading(false); }
  };

  const googleSignIn = async (idToken) => {
    setLoading(true); setError(null);
    try {
      const response = await authService.googleSignIn(idToken);
      setUser(response.data.user);
      return response.data.user;
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
      throw err;
    } finally { setLoading(false); }
  };

  const logout = async () => {
    setLoading(true);
    try { await authService.logout(); setUser(null); }
    finally { setLoading(false); }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, googleSignIn, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
