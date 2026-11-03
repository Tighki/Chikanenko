import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";

export type Role = "APPLICANT" | "STAFF" | "ADMIN";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  phone: string | null;
  mustChangePassword: boolean;
};

type AuthState = {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  register: (payload: { email: string; password: string; fullName: string; phone?: string }) => Promise<SessionUser>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function homeFor(role: Role) {
  return role === "APPLICANT" ? "/app" : "/staff";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      return;
    }
    const data = await api<{ user: SessionUser }>("/api/auth/me");
    setUser(data.user);
  }

  useEffect(() => {
    refresh()
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
    const onLogout = () => setUser(null);
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const data = await api<{ token: string; user: SessionUser }>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        localStorage.setItem("token", data.token);
        setUser(data.user);
        return data.user;
      },
      register: async (payload) => {
        const data = await api<{ token: string; user: SessionUser }>("/api/auth/register", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        localStorage.setItem("token", data.token);
        setUser(data.user);
        return data.user;
      },
      logout: () => {
        localStorage.removeItem("token");
        setUser(null);
      },
      refresh,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider отсутствует");
  return value;
}
