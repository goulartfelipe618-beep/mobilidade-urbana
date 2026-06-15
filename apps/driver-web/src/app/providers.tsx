import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchMe, getToken, setToken } from "../api/client";
import type { DriverOperationalState, User } from "../api/types";

interface AuthState {
  user: User | null;
  operational: DriverOperationalState | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [operational, setOperational] = useState<DriverOperationalState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setOperational(null);
      return;
    }
    const me = await fetchMe();
    setUser(me.user);
    setOperational(me.operational);
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => {
        setToken(null);
        setUser(null);
        setOperational(null);
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      operational,
      loading,
      refresh,
      signOut: () => {
        setToken(null);
        setUser(null);
        setOperational(null);
      },
    }),
    [user, operational, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
