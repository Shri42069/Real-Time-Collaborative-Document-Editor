import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setAuthHeader } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      console.log('[AUTH] Attempting silent refresh on mount...');
      try {
        const { data: refreshData } = await api.post('/auth/refresh');
        console.log('[AUTH] Silent refresh succeeded — token received');
        setAuthHeader(refreshData.accessToken);
        setAccessToken(refreshData.accessToken);
        const { data: profileData } = await api.get('/profile');
        setUser(profileData.user);
        console.log('[AUTH] Session restored for user:', profileData.user.username);
      } catch (err) {
        console.log('[AUTH] Silent refresh failed (no session):', err.response?.data?.error || err.message);
        setAuthHeader(null);
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
        console.log('[AUTH] Auth loading complete');
      }
    })();
  }, []);

  const register = useCallback(async (username, email, password) => {
    console.log('[AUTH] Registering user:', username);
    const { data } = await api.post('/auth/register', { username, email, password });
    console.log('[AUTH] Register success — setting token synchronously');
    setAuthHeader(data.accessToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data;
  }, []);

  const login = useCallback(async (email, password) => {
    console.log('[AUTH] Logging in:', email);
    const { data } = await api.post('/auth/login', { email, password });
    console.log('[AUTH] Login success — setting token synchronously');
    setAuthHeader(data.accessToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
    console.log('[AUTH] Token set, user:', data.user.username);
    return data;
  }, []);

  const logout = useCallback(async () => {
    console.log('[AUTH] Logging out');
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setAuthHeader(null);
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};