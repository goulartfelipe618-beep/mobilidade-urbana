import { RideLifecycleService } from "../../rides/application/ride-lifecycle.service";
import { User } from "../../users/domain/user";
import { UserService } from "../../users/application/user.service";
import { DriverRepository } from "../domain/driver";

export class DriverService {
  constructor(
    private readonly repository: DriverRepository,
    private readonly userService: UserService,
    private readonly lifecycleService: RideLifecycleService,
  ) {}

  public async me(token: string) {
    const user = await this.requireDriver(token);
    const operational = await this.repository.getOperationalState(user.id);
    return { user, operational };
  }

  public async goOnline(token: string, latitude: number, longitude: number, vehicleId?: string | null) {
    const user = await this.requireDriver(token);
    this.requireCoords(latitude, longitude);
    const active = await this.repository.findActiveRide(user.id);
    if (active) {
      throw new Error("finish active ride before going online again");
    }
    return this.repository.goOnline(user.id, latitude, longitude, vehicleId);
  }

  public async goOffline(token: string) {
    const user = await this.requireDriver(token);
    const active = await this.repository.findActiveRide(user.id);
    if (active) {
      throw new Error("cannot go offline with active ride");
    }
    return this.repository.goOffline(user.id);
  }

  public async updateLocation(token: string, latitude: number, longitude: number, heading?: number | null) {
    const user = await this.requireDriver(token);
    this.requireCoords(latitude, longitude);
    return this.repository.updateLocation(user.id, latitude, longitude, heading);
  }

  public async listOffers(token: string) {
    const user = await this.requireDriver(token);
    const state = await this.repository.getOperationalState(user.id);
    if (state.status === "OFFLINE" || state.status === "EM_CORRIDA") {
      return [];
    }
    const [offers, openRides] = await Promise.all([
      this.repository.listPendingOffers(user.id),
      this.repository.listOpenRidesNear(user.id),
    ]);
    const seen = new Set<string>();
    const merged = [];
    for (const offer of [...offers, ...openRides]) {
      if (seen.has(offer.rideId)) continue;
      seen.add(offer.rideId);
      merged.push(offer);
    }
    return merged;
  }

  public async acceptOffer(token: string, offerKey: string) {
    const user = await this.requireDriver(token);
    const state = await this.repository.getOperationalState(user.id);
    if (state.status !== "ONLINE") {
      throw new Error("driver must be online to accept offers");
    }
    const [offers, openRides] = await Promise.all([
      this.repository.listPendingOffers(user.id),
      this.repository.listOpenRidesNear(user.id),
    ]);
    const offer = [...offers, ...openRides].find((item) => item.id === offerKey || item.rideId === offerKey);
    const rideId = offer?.rideId ?? offerKey;
    const eligible = await this.repository.isDriverEligibleForRide(user.id, offer?.categoryCode ?? null);
    if (!eligible) {
      throw new Error("driver not eligible for ride category");
    }
    const ride = await this.lifecycleService.accept(rideId, user.id);
    if (offer?.source === "OFFER") {
      await this.repository.markOfferAccepted(offer.id, user.id);
    }
    await this.repository.setDriverBusy(user.id, ride.id);
    return ride;
  }

  public async rejectOffer(token: string, offerKey: string) {
    const user = await this.requireDriver(token);
    const offers = await this.repository.listPendingOffers(user.id);
    const offer = offers.find((item) => item.id === offerKey || item.rideId === offerKey);
    if (!offer || offer.source !== "OFFER") {
      return;
    }
    await this.repository.markOfferRejected(offer.id, user.id);
  }

  public async getActiveRide(token: string) {
    const user = await this.requireDriver(token);
    return this.repository.findActiveRide(user.id);
  }

  public async arrive(token: string, rideId: string) {
    const user = await this.requireDriver(token);
    return this.lifecycleService.arrive(rideId, user.id);
  }

  public async start(token: string, rideId: string) {
    const user = await this.requireDriver(token);
    return this.lifecycleService.start(rideId, user.id);
  }

  public async complete(token: string, rideId: string, finalValueCentavos?: number) {
    const user = await this.requireDriver(token);
    const ride = await this.lifecycleService.complete(rideId, user.id, finalValueCentavos);
    await this.repository.setDriverOnline(user.id);
    return ride;
  }

  public async listHistory(token: string) {
    const user = await this.requireDriver(token);
    return this.repository.listRideHistory(user.id);
  }

  public async getEarnings(token: string) {
    const user = await this.requireDriver(token);
    return this.repository.getEarningsSummary(user.id);
  }

  private async requireDriver(token: string): Promise<User> {
    const user = await this.userService.me(token);
    if (user.type !== "MOTORISTA") {
      throw new Error("driver access only");
    }
    return user;
  }

  private requireCoords(latitude: number, longitude: number): void {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("latitude and longitude are required");
    }
  }
}
