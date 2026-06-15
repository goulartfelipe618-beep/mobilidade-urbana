import { useEffect, useState } from "react";
import { fetchRideHistory, formatBRL } from "../api/client";
import type { Ride } from "../api/types";

export function ActivityPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRideHistory()
      .then(setRides)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, []);

  return (
    <div className="stack">
      <div className="card">
        <h1 className="h1">Atividade</h1>
        {error && <p className="error">{error}</p>}
        {rides.length === 0 && <p className="muted">Sem histórico ainda.</p>}
      </div>
      {rides.map((ride) => (
        <div key={ride.id} className="card">
          <strong>{ride.originAddress ?? ride.id}</strong>
          <p className="muted">{ride.destinationAddress}</p>
          <p className="muted">{ride.status} · {ride.estimatedValueCentavos ? formatBRL(ride.estimatedValueCentavos) : "—"}</p>
        </div>
      ))}
    </div>
  );
}
