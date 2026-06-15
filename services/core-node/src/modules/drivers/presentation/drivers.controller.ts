import { IncomingMessage, ServerResponse } from "node:http";
import { DriverService } from "../application/driver.service";

export class DriversController {
  constructor(private readonly service: DriverService) {}

  public async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = req.url ?? "";
    const token = extractBearer(req);

    if (url === "/api/v1/drivers/me" && req.method === "GET") {
      writeJson(res, 200, await this.service.me(token));
      return true;
    }

    if (url === "/api/v1/drivers/me/go-online" && req.method === "POST") {
      const body = await readJson(req);
      const state = await this.service.goOnline(
        token,
        Number(body.latitude),
        Number(body.longitude),
        body.vehicleId === undefined ? undefined : body.vehicleId === null ? null : String(body.vehicleId),
      );
      writeJson(res, 200, state);
      return true;
    }

    if (url === "/api/v1/drivers/me/go-offline" && req.method === "POST") {
      writeJson(res, 200, await this.service.goOffline(token));
      return true;
    }

    if (url === "/api/v1/drivers/me/location" && req.method === "PUT") {
      const body = await readJson(req);
      writeJson(
        res,
        200,
        await this.service.updateLocation(
          token,
          Number(body.latitude),
          Number(body.longitude),
          body.heading === undefined ? undefined : body.heading === null ? null : Number(body.heading),
        ),
      );
      return true;
    }

    if (url === "/api/v1/drivers/me/offers" && req.method === "GET") {
      writeJson(res, 200, { offers: await this.service.listOffers(token) });
      return true;
    }

    const acceptMatch = url.match(/^\/api\/v1\/drivers\/me\/offers\/([^/?#]+)\/accept$/);
    if (acceptMatch && req.method === "POST") {
      writeJson(res, 200, await this.service.acceptOffer(token, acceptMatch[1]));
      return true;
    }

    const rejectMatch = url.match(/^\/api\/v1\/drivers\/me\/offers\/([^/?#]+)\/reject$/);
    if (rejectMatch && req.method === "POST") {
      await this.service.rejectOffer(token, rejectMatch[1]);
      writeJson(res, 204, null);
      return true;
    }

    if (url === "/api/v1/drivers/me/active-ride" && req.method === "GET") {
      writeJson(res, 200, { ride: await this.service.getActiveRide(token) });
      return true;
    }

    if (url === "/api/v1/drivers/me/rides" && req.method === "GET") {
      writeJson(res, 200, { rides: await this.service.listHistory(token) });
      return true;
    }

    if (url === "/api/v1/drivers/me/earnings" && req.method === "GET") {
      writeJson(res, 200, await this.service.getEarnings(token));
      return true;
    }

    const arriveMatch = url.match(/^\/api\/v1\/drivers\/me\/rides\/([^/?#]+)\/arrive$/);
    if (arriveMatch && req.method === "POST") {
      writeJson(res, 200, await this.service.arrive(token, arriveMatch[1]));
      return true;
    }

    const startMatch = url.match(/^\/api\/v1\/drivers\/me\/rides\/([^/?#]+)\/start$/);
    if (startMatch && req.method === "POST") {
      writeJson(res, 200, await this.service.start(token, startMatch[1]));
      return true;
    }

    const completeMatch = url.match(/^\/api\/v1\/drivers\/me\/rides\/([^/?#]+)\/complete$/);
    if (completeMatch && req.method === "POST") {
      const body = await readJson(req);
      const finalValueCentavos =
        body.finalValueCentavos === undefined ? undefined : Number(body.finalValueCentavos);
      writeJson(res, 200, await this.service.complete(token, completeMatch[1], finalValueCentavos));
      return true;
    }

    return false;
  }
}

function extractBearer(req: IncomingMessage): string {
  const header = req.headers.authorization ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new Error("authorization header required");
  }
  return match[1].trim();
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const payload = Buffer.concat(chunks).toString("utf-8").trim();
  if (!payload) return {};
  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    throw new Error("invalid json body");
  }
}

function writeJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  if (payload === null || statusCode === 204) {
    res.end();
    return;
  }
  res.end(JSON.stringify(payload));
}
