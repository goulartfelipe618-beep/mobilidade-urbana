import { Navigate } from "react-router-dom";
import { useSession } from "../app/session";

export function AccountPage() {
  const { user, logout } = useSession();
  if (!user) return <Navigate to="/auth" replace />;
  return (
    <div className="page account-page">
      <header className="hero-card compact"><span>Conta</span><h1>{user.name}</h1><p>{user.email} · {user.phone}</p></header>
      <section className="card"><strong>Regras operacionais</strong><p>Reputacao, pagamento garantido e categoria premium seguem o guia do Transporte.PRO.</p></section>
      <section className="card"><strong>Favoritos</strong><p>Casa, trabalho, recentes e cache Mapbox entram na proxima fase de endereco.</p></section>
      <button className="btn secondary full" onClick={logout}>Sair</button>
    </div>
  );
}
