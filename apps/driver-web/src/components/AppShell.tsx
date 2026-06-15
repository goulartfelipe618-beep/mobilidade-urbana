import { NavLink, Outlet } from "react-router-dom";
import { Car, CircleDollarSign, History, Home, User } from "lucide-react";

const links = [
  { to: "/", label: "Início", icon: Home },
  { to: "/ride", label: "Corrida", icon: Car },
  { to: "/earnings", label: "Ganhos", icon: CircleDollarSign },
  { to: "/activity", label: "Atividade", icon: History },
  { to: "/account", label: "Conta", icon: User },
];

export function AppShell() {
  return (
    <div className="shell">
      <main className="shell-main">
        <Outlet />
      </main>
      <nav className="shell-nav" aria-label="Navegação principal">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
