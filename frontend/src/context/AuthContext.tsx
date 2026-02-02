import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type User = {
  id: string;
  login: string;
  name: string | null;
  role: string;
};

type AuthContextType = {
  token: string | null;
  user: User | null;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (u: User | null) => void;
};

export const AUTH_STORAGE_KEY = 'firenotify_auth';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(AUTH_STORAGE_KEY + '_token')
  );
  const [user, setUserState] = useState<User | null>(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY + '_user');
    return raw ? JSON.parse(raw) : null;
  });

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) localStorage.setItem(AUTH_STORAGE_KEY + '_user', JSON.stringify(u));
    else localStorage.removeItem(AUTH_STORAGE_KEY + '_user');
  }, []);

  const login = useCallback(async (loginName: string, password: string) => {
    let res: Response;
    try {
      res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginName, password }),
      });
    } catch {
      throw new Error('Сервер недоступен. Запустите backend на http://localhost:3001');
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? 'Ошибка входа');
    }
    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem(AUTH_STORAGE_KEY + '_token', data.token);
  }, [setUser]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY + '_token');
  }, [setUser]);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function apiFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem(AUTH_STORAGE_KEY + '_token');
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...options, headers });
}
