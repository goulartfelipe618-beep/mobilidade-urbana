import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Ride, SessionResult, User } from "../api/types";

const SESSION_KEY = "tp.client.session";
const ACTIVE_RIDE_KEY = "tp.client.activeRide";

function loadSession(): SessionResult | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as SessionResult;
    if (Date.parse(session.expiresAt) <= Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function loadRide(): Ride | null {
  try {
    const raw = localStorage.getItem(ACTIVE_RIDE_KEY);
    return raw ? (JSON.parse(raw) as Ride) : null;
  } catch {
    return null;
  }
}

interface SessionState {
  user: User | null;
  token: string | null;
  activeRide: Ride | null;
  setSession: (session: SessionResult) => void;
  setActiveRide: (ride: Ride | null) => void;
  logout: () => void;
}

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<SessionResult | null>(() => loadSession());
  const [activeRideState, setActiveRideState] = useState<Ride | null>(() => loadRide());

  const value = useMemo<SessionState>(() => ({
    user: session?.user ?? null,
    token: session?.token ?? null,
    activeRide: activeRideState,
    setSession(next) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      setSessionState(next);
    },
    setActiveRide(ride) {
      if (ride) localStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(ride));
      else localStorage.removeItem(ACTIVE_RIDE_KEY);
      setActiveRideState(ride);
    },
    logout() {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(ACTIVE_RIDE_KEY);
      setSessionState(null);
      setActiveRideState(null);
    },
  }), [session, activeRideState]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession outside SessionProvider");
  return ctx;
}
