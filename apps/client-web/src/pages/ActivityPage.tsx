import { Link, Navigate } from "react-router-dom";
import { cents, statusLabel } from "../api/client";
import { useSession } from "../app/session";

export function ActivityPage() {
  const { user, activeRide } = useSession();
  if (!user) return <Navigate to="/auth" replace />;
  return (
    <div className="page">
      <h1>Atividade</h1>
      {activeRide ? <article className="card activity"><strong>{activeRide.destinationAddress}</strong><span>{statusLabel(activeRide.status)}</span><p>{cents(activeRide.finalValueCentavos ?? activeRide.estimatedValueCentavos)}</p><Link to="/corrida">Ver detalhes</Link></article> : <div className="empty"><p>Nenhuma viagem registrada neste dispositivo.</p><Link className="btn primary" to="/">Solicitar</Link></div>}
    </div>
  );
}
