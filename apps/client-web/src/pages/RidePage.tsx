import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, cents, statusLabel } from "../api/client";
import type { Ride } from "../api/types";
import { useSession } from "../app/session";

export function RidePage() {
  const { user, activeRide, setActiveRide } = useSession();
  const [ride, setRide] = useState<Ride | null>(activeRide);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeRide || ["CONCLUIDA", "CANCELADA"].includes(activeRide.status)) return;
    const load = () => api.ride(activeRide.id).then((r) => { setRide(r); setActiveRide(r); }).catch(() => undefined);
    void load();
    const id = window.setInterval(load, 5000);
    return () => clearInterval(id);
  }, [activeRide?.id, activeRide?.status, setActiveRide]);

  if (!user) return <Navigate to="/auth" replace />;
  if (!ride) return <div className="page empty"><p>Nenhuma corrida ativa.</p><Link className="btn primary" to="/">Solicitar viagem</Link></div>;

  async function cancel() {
    if (!user || !ride) return;
    try {
      const cancelled = await api.cancelRide(ride.id, user.id);
      setRide(cancelled);
      setActiveRide(cancelled);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel cancelar");
    }
  }

  const steps = ["SOLICITADA", "MOTORISTA_A_CAMINHO", "MOTORISTA_CHEGOU", "EM_ANDAMENTO", "CONCLUIDA"];
  const current = Math.max(0, steps.indexOf(ride.status));

  return (
    <div className="page ride-page">
      <header className="hero-card compact"><span>Corrida</span><h1>{statusLabel(ride.status)}</h1><p>{ride.originAddress} -&gt; {ride.destinationAddress}</p></header>
      <section className="card timeline">
        {steps.map((step, index) => <div key={step} className={index <= current ? "done" : ""}><span>{index + 1}</span><p>{statusLabel(step)}</p></div>)}
      </section>
      <section className="card quote-card"><div><strong>{ride.categoryCode}</strong><p>{ride.driverId ? "Motorista associado" : "Buscando motorista proximo"}</p></div><strong className="price">{cents(ride.finalValueCentavos ?? ride.estimatedValueCentavos)}</strong></section>
      {error && <p className="error">{error}</p>}
      {!["CONCLUIDA", "CANCELADA"].includes(ride.status) && <button className="btn secondary full" onClick={() => void cancel()}>Cancelar corrida</button>}
      {["CONCLUIDA", "CANCELADA"].includes(ride.status) && <Link className="btn primary full" to="/">Nova viagem</Link>}
    </div>
  );
}
