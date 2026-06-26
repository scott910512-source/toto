import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (id, password) => {
    const d = await api.post('/auth/login', { id, password });
    setUser(d.user);
    return d.user;
  }, []);

  const signup = useCallback((payload) => api.post('/auth/signup', payload), []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setUser(null);
  }, []);

  const isAdmin = user && user.role === 'admin';

  return (
    <AuthCtx.Provider value={{ user, loading, login, signup, logout, isAdmin }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
