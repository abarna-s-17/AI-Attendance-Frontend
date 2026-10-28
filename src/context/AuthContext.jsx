import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const C = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });

  const store = (profile) => { localStorage.setItem('user', JSON.stringify(profile)); setUser(profile); };

  const login = async (data) => {
    const r = await api.post('/auth/login', data);
    localStorage.setItem('token', r.data.token);
    store(r.data.user);
    return r.data;
  };

  const logout = () => {
    const portal = user?.role || 'student';  // back to the login page of the portal you were in
    localStorage.clear();
    setUser(null);
    location.href = '/login/' + portal;
  };

  // Refresh the profile so a change made by the administrator (for example Staff -> Class Advisor) shows up without a new login.
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api.get('/auth/me').then((r) => store(r.data.user)).catch((e) => {
      if (e.response?.status === 401) { localStorage.clear(); setUser(null); }
    });
  }, []);

  const refresh = () => api.get('/auth/me').then((r) => store(r.data.user)).catch(() => {});

  return <C.Provider value={{ user, login, logout, refresh }}>{children}</C.Provider>;
}

export const useAuth = () => useContext(C);
