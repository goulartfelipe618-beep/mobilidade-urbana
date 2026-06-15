import type {
  DriverEarnings,
  DriverOffer,
  DriverOperationalState,
  Ride,
  SessionResult,
  User,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";
const TOKEN_KEY = "tp_driver_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (!token) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const message =
      typeof data === "object" && data && "message" in data
        ? String((data as { message: string }).message)
        : res.statusText;
    throw new Error(message || `HTTP ${res.status}`);
  }
  return data as T;
}

export async function login(login: string, password: string): Promise<SessionResult> {
  return request<SessionResult>("/api/v1/users/login", {
    method: "POST",
    body: JSON.stringify({ login, password }),
  });
}

export async function registerDriver(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<SessionResult> {
  return request<SessionResult>("/api/v1/users/register", {
    method: "POST",
    body: JSON.stringify({ ...input, type: "MOTORISTA" }),
  });
}

export async function fetchMe(): Promise<{ user: User; operational: DriverOperationalState }> {
  return request("/api/v1/drivers/me");
}

export async function goOnline(latitude: number, longitude: number): Promise<DriverOperationalState> {
  return request("/api/v1/drivers/me/go-online", {
    method: "POST",
    body: JSON.stringify({ latitude, longitude }),
  });
}

export async function goOffline(): Promise<DriverOperationalState> {
  return request("/api/v1/drivers/me/go-offline", { method: "POST" });
}

export async function fetchOffers(): Promise<DriverOffer[]> {
  const data = await request<{ offers: DriverOffer[] }>("/api/v1/drivers/me/offers");
  return data.offers;
}

export async function acceptOffer(key: string): Promise<Ride> {
  return request(`/api/v1/drivers/me/offers/${encodeURIComponent(key)}/accept`, { method: "POST", body: "{}" });
}

export async function rejectOffer(key: string): Promise<void> {
  await request(`/api/v1/drivers/me/offers/${encodeURIComponent(key)}/reject`, { method: "POST", body: "{}" });
}

export async function fetchActiveRide(): Promise<Ride | null> {
  const data = await request<{ ride: Ride | null }>("/api/v1/drivers/me/active-ride");
  return data.ride;
}

export async function arriveRide(rideId: string): Promise<Ride> {
  return request(`/api/v1/drivers/me/rides/${rideId}/arrive`, { method: "POST", body: "{}" });
}

export async function startRide(rideId: string): Promise<Ride> {
  return request(`/api/v1/drivers/me/rides/${rideId}/start`, { method: "POST", body: "{}" });
}

export async function completeRide(rideId: string, finalValueCentavos?: number): Promise<Ride> {
  return request(`/api/v1/drivers/me/rides/${rideId}/complete`, {
    method: "POST",
    body: JSON.stringify(finalValueCentavos === undefined ? {} : { finalValueCentavos }),
  });
}

export async function fetchRideHistory(): Promise<Ride[]> {
  const data = await request<{ rides: Ride[] }>("/api/v1/drivers/me/rides");
  return data.rides;
}

export async function fetchEarnings(): Promise<DriverEarnings> {
  return request("/api/v1/drivers/me/earnings");
}

export function formatBRL(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
}
