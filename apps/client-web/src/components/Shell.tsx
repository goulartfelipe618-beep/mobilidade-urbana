import { Clock3, Home, MapPinned, UserRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

export function Shell() {
  return (
    <div className="shell">
      <main className="shell-main"><Outlet /></main>
      <nav className="bottom-nav" aria-label="Navegacao passageiro">
        <NavLink to="/" end><Home size={22} /><span>Inicio</span></NavLink>
        <NavLink to="/corrida"><MapPinned size={22} /><span>Corrida</span></NavLink>
        <NavLink to="/atividade"><Clock3 size={22} /><span>Atividade</span></NavLink>
        <NavLink to="/conta"><UserRound size={22} /><span>Conta</span></NavLink>
      </nav>
    </div>
  );
}
