import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  arriveRide,
  completeRide,
  fetchActiveRide,
  formatBRL,
  startRide,
} from "../api/client";
import type { Ride } from "../api/types";
import { useAuth } from "../app/providers";

export function RidePage() {
  const { refresh } = useAuth();
  const location = useLocation();
  const [ride, setRide] = useState<Ride | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const active = await fetchActiveRide();
      setRide(active);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar corrida");
    }
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 4000);
    return () => clearInterval(id);
  }, [location.state]);

  async function action(fn: () => Promise<Ride>) {
    setBusy(true);
    setError(null);
    try {
      const updated = await fn();
      setRide(updated);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ação indisponível");
    } finally {
      setBusy(false);
    }
  }

  if (!ride) {
    return (
      <div className="card">
        <h1 className="h1">Corrida</h1>
        <p className="muted">Nenhuma corrida ativa.</p>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="card">
        <h1 className="h1">Corrida em andamento</h1>
        <p className="muted">Status: {ride.status}</p>
        <p><strong>Origem:</strong> {ride.originAddress ?? "—"}</p>
        <p><strong>Destino:</strong> {ride.destinationAddress ?? "—"}</p>
        <p className="muted">
          Valor estimado: {ride.estimatedValueCentavos ? formatBRL(ride.estimatedValueCentavos) : "—"}
        </p>
        {error && <p className="error">{error}</p>}
        <div className="stack" style={{ marginTop: 12 }}>
          {ride.status === "MOTORISTA_A_CAMINHO" && (
            <button className="btn primary" disabled={busy} onClick={() => void action(() => arriveRide(ride.id))}>
              Cheguei no embarque
            </button>
          )}
          {ride.status === "MOTORISTA_CHEGOU" && (
            <button className="btn primary" disabled={busy} onClick={() => void action(() => startRide(ride.id))}>
              Iniciar corrida
            </button>
          )}
          {ride.status === "EM_ANDAMENTO" && (
            <button
              className="btn primary"
              disabled={busy}
              onClick={() =>
                void action(() => completeRide(ride.id, ride.estimatedValueCentavos ?? undefined))
              }
            >
              Finalizar corrida
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
