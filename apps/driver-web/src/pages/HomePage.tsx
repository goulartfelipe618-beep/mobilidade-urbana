import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  acceptOffer,
  fetchOffers,
  formatBRL,
  goOffline,
  goOnline,
  rejectOffer,
} from "../api/client";
import type { DriverOffer } from "../api/types";
import { useAuth } from "../app/providers";

export function HomePage() {
  const { user, operational, refresh } = useAuth();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<DriverOffer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadOffers = useCallback(async () => {
    try {
      setOffers(await fetchOffers());
    } catch {
      setOffers([]);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      void loadOffers();
      void refresh();
    }, 5000);
    void loadOffers();
    return () => clearInterval(id);
  }, [loadOffers, refresh]);

  const status = operational?.status ?? "OFFLINE";
  const badgeClass =
    status === "ONLINE" ? "badge" : status === "EM_CORRIDA" ? "badge busy" : "badge offline";

  async function toggleOnline() {
    setError(null);
    setBusy(true);
    try {
      if (status === "OFFLINE") {
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                await goOnline(pos.coords.latitude, pos.coords.longitude);
                await refresh();
                resolve();
              } catch (e) {
                reject(e);
              }
            },
            () => reject(new Error("Permita a localização para ficar online")),
            { enableHighAccuracy: true, timeout: 10000 },
          );
        });
      } else {
        await goOffline();
        await refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao alterar status");
    } finally {
      setBusy(false);
    }
  }

  async function onAccept(offer: DriverOffer) {
    setBusy(true);
    setError(null);
    try {
      const ride = await acceptOffer(offer.id || offer.rideId);
      await refresh();
      navigate("/ride", { state: { rideId: ride.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível aceitar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <h1 className="h1">Olá, {user?.name?.split(" ")[0] ?? "motorista"}</h1>
        <p className="muted">
          Status: <span className={badgeClass}>{status}</span>
        </p>
        {error && <p className="error">{error}</p>}
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={() => void toggleOnline()} disabled={busy || status === "EM_CORRIDA"}>
            {status === "OFFLINE" ? "Ficar online" : "Ficar offline"}
          </button>
          <button className="btn" onClick={() => navigate("/ride")}>Corrida ativa</button>
        </div>
      </div>

      <div className="card">
        <h2 className="h1" style={{ fontSize: "1.1rem" }}>Ofertas próximas</h2>
        {offers.length === 0 ? (
          <p className="muted">Nenhuma oferta no momento. Mantenha-se online.</p>
        ) : (
          offers.map((offer) => (
            <div key={offer.id} className="card" style={{ marginTop: 8, padding: 12 }}>
              <strong>{offer.originAddress ?? "Origem"}</strong>
              <p className="muted">{offer.destinationAddress ?? "Destino"}</p>
              <p className="muted">
                {offer.categoryCode ?? "—"} · {offer.estimatedValueCentavos ? formatBRL(offer.estimatedValueCentavos) : "—"}
              </p>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn primary" disabled={busy} onClick={() => void onAccept(offer)}>Aceitar</button>
                <button className="btn" disabled={busy} onClick={() => void rejectOffer(offer.id).then(loadOffers)}>Recusar</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
