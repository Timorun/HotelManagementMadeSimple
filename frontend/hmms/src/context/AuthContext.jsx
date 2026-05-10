import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchCurrentUser, login as loginApi, logout as logoutApi, subscribeToUnauthorized } from '../api/backend';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToUnauthorized(() => {
      setUser(null);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const me = await fetchCurrentUser();
        if (mounted) {
          setUser(me);
        }
      } catch {
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(() => ({
    user,
    authLoading,
    isAuthenticated: Boolean(user),
    async login(usernameOrEmail, password) {
      const response = await loginApi(usernameOrEmail, password);
      const me = await fetchCurrentUser();
      setUser(me);
      return response;
    },
    async logout() {
      try {
        await logoutApi();
      } finally {
        setUser(null);
      }
    },
  }), [user, authLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
