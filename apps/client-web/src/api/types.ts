export type UserType = "PASSAGEIRO" | "MOTORISTA" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: UserType;
  active?: boolean;
  createdAt?: string;
}

export interface SessionResult {
  token: string;
  expiresAt: string;
  user: User;
}

export interface Category {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  passengerLimitMin?: number;
  passengerLimitMax?: number;
  isShared?: boolean;
  isPremium?: boolean;
}

export interface QuoteBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  minimumFare: number;
  total: number;
}

export interface PricingQuote {
  categoryCode: string;
  currency: "BRL" | string;
  distanceKm: number;
  durationMinutes: number;
  breakdown: QuoteBreakdown;
}

export interface Ride {
  id: string;
  passengerId: string;
  driverId: string | null;
  status: string;
  categoryCode: string | null;
  originAddress: string | null;
  destinationAddress: string | null;
  estimatedDistanceM: number | null;
  estimatedValueCentavos: number | null;
  finalValueCentavos: number | null;
  cancelledAt?: string | null;
  createdAt: string;
}

export interface PlaceDraft {
  address: string;
  latitude: number;
  longitude: number;
}
