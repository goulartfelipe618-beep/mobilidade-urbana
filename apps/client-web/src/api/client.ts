import type { Category, PricingQuote, Ride, SessionResult } from "./types";

const API = import.meta.env.VITE_API_BASE_URL || "";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);

  const res = await fetch(`${API}${path}`, { ...init, headers });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.message ?? res.statusText, res.status);
  return data as T;
}

export const api = {
  auth: {
    login(login: string, password: string) {
      return request<SessionResult>("/api/v1/users/login", { method: "POST", body: JSON.stringify({ login, password }) });
    },
    register(body: { name: string; email: string; phone: string; password: string }) {
      return request<SessionResult>("/api/v1/users/register", {
        method: "POST",
        body: JSON.stringify({ ...body, type: "PASSAGEIRO" }),
      });
    },
  },
  categories() {
    return request<Category[]>("/api/v1/categories");
  },
  quote(body: { categoryCode: string; distanceKm: number; durationMinutes: number; dynamicMultiplier?: number }) {
    return request<PricingQuote>("/api/v1/pricing/quote", { method: "POST", body: JSON.stringify(body) });
  },
  createRide(body: {
    passengerId: string;
    categoryCode: string;
    originLatitude: number;
    originLongitude: number;
    originAddress: string;
    destinationLatitude: number;
    destinationLongitude: number;
    destinationAddress: string;
    distanceKm: number;
    durationMinutes: number;
    estimatedFare: number;
    paymentMethodType?: string;
  }) {
    return request<Ride>("/api/v1/rides", { method: "POST", body: JSON.stringify(body) });
  },
  ride(id: string) {
    return request<Ride>(`/api/v1/rides/${id}`);
  },
  cancelRide(id: string, passengerId: string) {
    return request<Ride>(`/api/v1/rides/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ cancellerUserId: passengerId, cancellerRole: "PASSENGER", reasonCode: "PASSENGER_CANCELLED" }),
    });
  },
};

export function cents(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((value ?? 0) / 100);
}

export function fare(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    SOLICITADA: "Procurando motorista",
    MOTORISTA_A_CAMINHO: "Motorista a caminho",
    MOTORISTA_CHEGOU: "Motorista chegou",
    EM_ANDAMENTO: "Viagem em andamento",
    CONCLUIDA: "Concluida",
    CANCELADA: "Cancelada",
  };
  return map[status] ?? status.replaceAll("_", " ");
}
