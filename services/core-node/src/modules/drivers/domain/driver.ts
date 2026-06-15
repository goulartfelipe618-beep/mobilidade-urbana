import { Ride } from "../../rides/domain/ride";
import { User } from "../../users/domain/user";

export type DriverStatus = "OFFLINE" | "ONLINE" | "EM_CORRIDA";

export interface DriverLocation {
  latitude: number;
  longitude: number;
  heading: number | null;
  updatedAt: string;
}

export interface DriverOperationalState {
  driverId: string;
  status: DriverStatus | string;
  sessionId: string | null;
  location: DriverLocation | null;
  activeRideId: string | null;
}

export type DriverOfferSource = "OFFER" | "OPEN_RIDE";

export interface DriverOffer {
  id: string;
  rideId: string;
  source: DriverOfferSource;
  categoryCode: string | null;
  originAddress: string | null;
  destinationAddress: string | null;
  estimatedValueCentavos: number | null;
  estimatedDistanceM: number | null;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  distanceToPickupM: number | null;
  expiresAt: string | null;
  status: string;
}

export interface DriverEarningsSummary {
  todayNetCentavos: number;
  weekNetCentavos: number;
  pendingNetCentavos: number;
  completedRides: number;
}

export interface DriverMeResult {
  user: User;
  operational: DriverOperationalState;
}

export interface DriverRepository {
  getOperationalState(driverId: string): Promise<DriverOperationalState>;
  goOnline(
    driverId: string,
    latitude: number,
    longitude: number,
    vehicleId?: string | null,
  ): Promise<DriverOperationalState>;
  goOffline(driverId: string): Promise<DriverOperationalState>;
  updateLocation(
    driverId: string,
    latitude: number,
    longitude: number,
    heading?: number | null,
  ): Promise<DriverLocation>;
  listPendingOffers(driverId: string): Promise<DriverOffer[]>;
  listOpenRidesNear(driverId: string, radiusMeters?: number): Promise<DriverOffer[]>;
  markOfferAccepted(offerId: string, driverId: string): Promise<void>;
  markOfferRejected(offerId: string, driverId: string): Promise<void>;
  setDriverBusy(driverId: string, rideId: string): Promise<void>;
  setDriverOnline(driverId: string): Promise<void>;
  findActiveRide(driverId: string): Promise<Ride | null>;
  listRideHistory(driverId: string, limit?: number): Promise<Ride[]>;
  getEarningsSummary(driverId: string): Promise<DriverEarningsSummary>;
  isDriverEligibleForRide(driverId: string, categoryCode: string | null): Promise<boolean>;
}
