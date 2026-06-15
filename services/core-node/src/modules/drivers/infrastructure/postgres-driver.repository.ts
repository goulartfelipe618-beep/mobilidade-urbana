import { Pool } from "pg";
import { Ride } from "../../rides/domain/ride";
import {
  DriverEarningsSummary,
  DriverLocation,
  DriverOffer,
  DriverOfferSource,
  DriverOperationalState,
  DriverRepository,
} from "../domain/driver";

const DEFAULT_RADIUS_M = 15000;

interface OfferRow {
  id: string;
  ride_id: string;
  status?: string;
  expires_at?: string | Date | null;
  category_code?: string | null;
  origem_endereco?: string | null;
  destino_endereco?: string | null;
  valor_estimado_centavos?: number | string | null;
  distancia_estimada_m?: number | string | null;
  pickup_lat?: number | string | null;
  pickup_lng?: number | string | null;
  distance_to_pickup_m?: number | string | null;
}

interface RideRow {
  id: string;
  passageiro_id: string;
  motorista_id?: string | null;
  status: string;
  category_code?: string | null;
  origem_endereco?: string | null;
  destino_endereco?: string | null;
  distancia_estimada_m?: number | string | null;
  valor_estimado_centavos?: number | string | null;
  valor_final_centavos?: number | string | null;
  cancelada_em?: string | Date | null;
  criado_em: string | Date;
}

export class PostgresDriverRepository implements DriverRepository {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: connectionString.includes("sslmode=") ? undefined : { rejectUnauthorized: false },
    });
  }
public async getOperationalState(driverId: string): Promise<DriverOperationalState> {
        const loc = await this.pool.query(`
      select
        lm.status,
        st_y(lm.localizacao::geometry) as lat,
        st_x(lm.localizacao::geometry) as lng,
        lm.heading,
        lm.atualizado_em as updated_at,
        lm.viagem_atual_id
      from localizacoes_motoristas lm
      where lm.motorista_id = $1
      limit 1
      `, [driverId]);
        const session = await this.pool.query(`
      select id from driver_online_sessions
      where driver_id = $1 and ended_at is null
      order by started_at desc
      limit 1
      `, [driverId]);
        if (!loc.rows.length) {
            return {
                driverId,
                status: "OFFLINE",
                sessionId: session.rows[0]?.id ? String(session.rows[0].id) : null,
                location: null,
                activeRideId: null,
            };
        }
        const row = loc.rows[0];
        const status = String(row.status);
        return {
            driverId,
            status,
            sessionId: session.rows[0]?.id ? String(session.rows[0].id) : null,
            location: row.lat !== null && row.lng !== null
                ? {
                    latitude: Number(row.lat),
                    longitude: Number(row.lng),
                    heading: row.heading !== null ? Number(row.heading) : null,
                    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
                }
                : null,
            activeRideId: row.viagem_atual_id ? String(row.viagem_atual_id) : null,
        };
    }
    public async goOnline(driverId: string, latitude: number, longitude: number, vehicleId?: string | null): Promise<DriverOperationalState> {
        await this.pool.query(`
      insert into localizacoes_motoristas (motorista_id, localizacao, status, atualizado_em)
      values ($1, st_setsrid(st_makepoint($3, $2), 4326), 'ONLINE', now())
      on conflict (motorista_id) do update
      set localizacao = excluded.localizacao,
          status = 'ONLINE',
          atualizado_em = now()
      `, [driverId, latitude, longitude]);
        await this.pool.query(`
      update driver_online_sessions
      set ended_at = now(), status = 'OFFLINE', updated_at = now()
      where driver_id = $1 and ended_at is null
      `, [driverId]);
        await this.pool.query(`
      insert into driver_online_sessions (driver_id, vehicle_id, status, location_point, last_heartbeat_at)
      values ($1, $2, 'ONLINE', st_setsrid(st_makepoint($4, $3), 4326), now())
      `, [driverId, vehicleId ?? null, latitude, longitude]);
        return this.getOperationalState(driverId);
    }
    public async goOffline(driverId: string): Promise<DriverOperationalState> {
        await this.pool.query(`
      update localizacoes_motoristas
      set status = 'OFFLINE', viagem_atual_id = null, atualizado_em = now()
      where motorista_id = $1
      `, [driverId]);
        await this.pool.query(`
      update driver_online_sessions
      set ended_at = now(), status = 'OFFLINE', updated_at = now()
      where driver_id = $1 and ended_at is null
      `, [driverId]);
        return this.getOperationalState(driverId);
    }
    public async updateLocation(driverId: string, latitude: number, longitude: number, heading?: number | null): Promise<DriverLocation> {
        const result = await this.pool.query(`
      update localizacoes_motoristas
      set localizacao = st_setsrid(st_makepoint($3, $2), 4326),
          heading = $4,
          atualizado_em = now()
      where motorista_id = $1
      returning atualizado_em as updated_at
      `, [driverId, latitude, longitude, heading ?? null]);
        await this.pool.query(`
      update driver_online_sessions
      set location_point = st_setsrid(st_makepoint($3, $2), 4326),
          last_heartbeat_at = now(),
          updated_at = now()
      where driver_id = $1 and ended_at is null
      `, [driverId, latitude, longitude]);
        return {
            latitude,
            longitude,
            heading: heading ?? null,
            updatedAt: result.rows[0]?.updated_at ? new Date(result.rows[0].updated_at).toISOString() : new Date().toISOString(),
        };
    }
    public async listPendingOffers(driverId: string): Promise<DriverOffer[]> {
        const result = await this.pool.query(`
      select
        ro.id,
        ro.ride_id,
        ro.status,
        ro.expires_at,
        v.category_code,
        v.origem_endereco,
        v.destino_endereco,
        v.valor_estimado_centavos,
        v.distancia_estimada_m,
        st_y(v.origem::geometry) as pickup_lat,
        st_x(v.origem::geometry) as pickup_lng,
        case
          when lm.localizacao is null then null
          else st_distance(lm.localizacao::geography, v.origem::geography)
        end as distance_to_pickup_m
      from ride_offers ro
      join viagens v on v.id = ro.ride_id
      left join localizacoes_motoristas lm on lm.motorista_id = $1
      where ro.driver_id = $1
        and ro.status = 'PENDING'
        and ro.expires_at > now()
        and v.status = 'SOLICITADA'
      order by ro.created_at desc
      limit 20
      `, [driverId]);
        return result.rows.map(mapOfferRow("OFFER"));
    }
    public async listOpenRidesNear(driverId: string, radiusMeters = DEFAULT_RADIUS_M): Promise<DriverOffer[]> {
        const result = await this.pool.query(`
      select
        v.id as id,
        v.id as ride_id,
        'OPEN' as status,
        null as expires_at,
        v.category_code,
        v.origem_endereco,
        v.destino_endereco,
        v.valor_estimado_centavos,
        v.distancia_estimada_m,
        st_y(v.origem::geometry) as pickup_lat,
        st_x(v.origem::geometry) as pickup_lng,
        st_distance(lm.localizacao::geography, v.origem::geography) as distance_to_pickup_m
      from viagens v
      join localizacoes_motoristas lm on lm.motorista_id = $1
      where v.status = 'SOLICITADA'
        and v.motorista_id is null
        and lm.status in ('ONLINE', 'EM_CORRIDA')
        and st_dwithin(v.origem::geography, lm.localizacao::geography, $2)
        and (
          not exists (select 1 from driver_categories dc where dc.driver_id = $1)
          or exists (
            select 1
            from driver_categories dc
            join ride_categories rc on rc.id = dc.ride_category_id
            where dc.driver_id = $1
              and upper(rc.code) = upper(coalesce(v.category_code, ''))
          )
        )
      order by distance_to_pickup_m asc
      limit 15
      `, [driverId, radiusMeters]);
        return result.rows.map(mapOfferRow("OPEN_RIDE"));
    }
    public async markOfferAccepted(offerId: string, driverId: string): Promise<void> {
        await this.pool.query(`
      update ride_offers
      set status = 'ACCEPTED', updated_at = now()
      where id = $1 and driver_id = $2 and status = 'PENDING'
      `, [offerId, driverId]);
    }
    public async markOfferRejected(offerId: string, driverId: string): Promise<void> {
        await this.pool.query(`
      update ride_offers
      set status = 'REJECTED', updated_at = now()
      where id = $1 and driver_id = $2 and status = 'PENDING'
      `, [offerId, driverId]);
    }
    public async setDriverBusy(driverId: string, rideId: string): Promise<void> {
        await this.pool.query(`
      update localizacoes_motoristas
      set status = 'EM_CORRIDA', viagem_atual_id = $2, atualizado_em = now()
      where motorista_id = $1
      `, [driverId, rideId]);
        await this.pool.query(`
      update driver_online_sessions
      set status = 'BUSY', updated_at = now()
      where driver_id = $1 and ended_at is null
      `, [driverId]);
    }
    public async setDriverOnline(driverId: string): Promise<void> {
        await this.pool.query(`
      update localizacoes_motoristas
      set status = 'ONLINE', viagem_atual_id = null, atualizado_em = now()
      where motorista_id = $1
      `, [driverId]);
        await this.pool.query(`
      update driver_online_sessions
      set status = 'ONLINE', updated_at = now()
      where driver_id = $1 and ended_at is null
      `, [driverId]);
    }
    public async findActiveRide(driverId: string): Promise<Ride | null> {
        const result = await this.pool.query(`
      select
        id, passageiro_id, motorista_id, status, category_code,
        origem_endereco, destino_endereco,
        distancia_estimada_m, valor_estimado_centavos, valor_final_centavos,
        cancelada_em, criado_em
      from viagens
      where motorista_id = $1
        and status in ('MOTORISTA_A_CAMINHO', 'MOTORISTA_CHEGOU', 'EM_ANDAMENTO')
      order by criado_em desc
      limit 1
      `, [driverId]);
        return result.rows.length ? mapRideRow(result.rows[0]) : null;
    }
    public async listRideHistory(driverId: string, limit = 20): Promise<Ride[]> {
        const result = await this.pool.query(`
      select
        id, passageiro_id, motorista_id, status, category_code,
        origem_endereco, destino_endereco,
        distancia_estimada_m, valor_estimado_centavos, valor_final_centavos,
        cancelada_em, criado_em
      from viagens
      where motorista_id = $1
      order by criado_em desc
      limit $2
      `, [driverId, limit]);
        return result.rows.map(mapRideRow);
    }
    public async getEarningsSummary(driverId: string): Promise<DriverEarningsSummary> {
        const result = await this.pool.query(`
      select
        coalesce(sum(case when settled_at::date = current_date then net_centavos else 0 end), 0) as today_net,
        coalesce(sum(case when settled_at >= date_trunc('week', current_date) then net_centavos else 0 end), 0) as week_net,
        coalesce(sum(case when status = 'PENDING' then net_centavos else 0 end), 0) as pending_net,
        (
          select count(*)::text from viagens
          where motorista_id = $1 and status = 'CONCLUIDA'
        ) as completed_rides
      from driver_payout_ledger
      where driver_id = $1
      `, [driverId]);
        const row = result.rows[0];
        return {
            todayNetCentavos: Number(row?.today_net ?? 0),
            weekNetCentavos: Number(row?.week_net ?? 0),
            pendingNetCentavos: Number(row?.pending_net ?? 0),
            completedRides: Number(row?.completed_rides ?? 0),
        };
    }
    public async isDriverEligibleForRide(driverId: string, categoryCode: string | null): Promise<boolean> {
        if (!categoryCode)
            return true;
        const hasAny = await this.pool.query(`select count(*)::text as count from driver_categories where driver_id = $1`, [driverId]);
        if (Number(hasAny.rows[0]?.count ?? 0) === 0)
            return true;
        const result = await this.pool.query(`
      select exists (
        select 1 from driver_categories dc
        join ride_categories rc on rc.id = dc.ride_category_id
        where dc.driver_id = $1 and upper(rc.code) = upper($2)
      ) as ok
      `, [driverId, categoryCode]);
        return Boolean(result.rows[0]?.ok);
    }
}

function mapOfferRow(source: DriverOfferSource) {
  return (row: OfferRow): DriverOffer => ({
    id: String(row.id),
    rideId: String(row.ride_id),
    source,
    categoryCode: row.category_code ? String(row.category_code) : null,
    originAddress: row.origem_endereco ? String(row.origem_endereco) : null,
    destinationAddress: row.destino_endereco ? String(row.destino_endereco) : null,
    estimatedValueCentavos:
      row.valor_estimado_centavos !== null && row.valor_estimado_centavos !== undefined
        ? Number(row.valor_estimado_centavos)
        : null,
    estimatedDistanceM:
      row.distancia_estimada_m !== null && row.distancia_estimada_m !== undefined
        ? Number(row.distancia_estimada_m)
        : null,
    pickupLatitude:
      row.pickup_lat !== null && row.pickup_lat !== undefined ? Number(row.pickup_lat) : null,
    pickupLongitude:
      row.pickup_lng !== null && row.pickup_lng !== undefined ? Number(row.pickup_lng) : null,
    distanceToPickupM:
      row.distance_to_pickup_m !== null && row.distance_to_pickup_m !== undefined
        ? Number(row.distance_to_pickup_m)
        : null,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)).toISOString() : null,
    status: String(row.status ?? "PENDING"),
  });
}

function mapRideRow(row: RideRow): Ride {
  return {
    id: String(row.id),
    passengerId: String(row.passageiro_id),
    driverId: row.motorista_id ? String(row.motorista_id) : null,
    status: String(row.status),
    categoryCode: row.category_code ? String(row.category_code) : null,
    originAddress: row.origem_endereco ? String(row.origem_endereco) : null,
    destinationAddress: row.destino_endereco ? String(row.destino_endereco) : null,
    estimatedDistanceM:
      row.distancia_estimada_m !== null && row.distancia_estimada_m !== undefined
        ? Number(row.distancia_estimada_m)
        : null,
    estimatedValueCentavos:
      row.valor_estimado_centavos !== null && row.valor_estimado_centavos !== undefined
        ? Number(row.valor_estimado_centavos)
        : null,
    finalValueCentavos:
      row.valor_final_centavos !== null && row.valor_final_centavos !== undefined
        ? Number(row.valor_final_centavos)
        : null,
    cancelledAt: row.cancelada_em ? new Date(String(row.cancelada_em)).toISOString() : null,
    createdAt: new Date(String(row.criado_em)).toISOString(),
  };
}
