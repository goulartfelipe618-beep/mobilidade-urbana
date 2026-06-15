export type UserType = "PASSAGEIRO" | "MOTORISTA" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: UserType;
  active: boolean;
  createdAt: string;
}

export interface SessionResult {
  token: string;
  expiresAt: string;
  user: User;
}

export interface DriverOperationalState {
  driverId: string;
  status: string;
  sessionId: string | null;
  location: {
    latitude: number;
    longitude: number;
    heading: number | null;
    updatedAt: string;
  } | null;
  activeRideId: string | null;
}

export interface DriverOffer {
  id: string;
  rideId: string;
  source: "OFFER" | "OPEN_RIDE";
  categoryCode: string | null;
  originAddress: string | null;
  destinationAddress: string | null;
  estimatedValueCentavos: number | null;
  estimatedDistanceM: number | null;
  distanceToPickupM: number | null;
  expiresAt: string | null;
  status: string;
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
  cancelledAt: string | null;
  createdAt: string;
}

export interface DriverEarnings {
  todayNetCentavos: number;
  weekNetCentavos: number;
  pendingNetCentavos: number;
  completedRides: number;
}
