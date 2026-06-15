import { useEffect, useState } from "react";
import { fetchEarnings, formatBRL } from "../api/client";
import type { DriverEarnings } from "../api/types";

export function EarningsPage() {
  const [data, setData] = useState<DriverEarnings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEarnings()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, []);

  return (
    <div className="card">
      <h1 className="h1">Ganhos</h1>
      {error && <p className="error">{error}</p>}
      {data && (
        <div className="stack">
          <p>Hoje: <strong>{formatBRL(data.todayNetCentavos)}</strong></p>
          <p>Semana: <strong>{formatBRL(data.weekNetCentavos)}</strong></p>
          <p>Pendente: <strong>{formatBRL(data.pendingNetCentavos)}</strong></p>
          <p className="muted">Corridas concluídas: {data.completedRides}</p>
        </div>
      )}
    </div>
  );
}
