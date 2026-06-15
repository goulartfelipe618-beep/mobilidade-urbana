import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/providers";

export function AccountPage() {
  const { user, operational, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="card stack">
      <h1 className="h1">Conta</h1>
      <p><strong>{user?.name}</strong></p>
      <p className="muted">{user?.email}</p>
      <p className="muted">{user?.phone}</p>
      <p className="muted">Status operacional: {operational?.status ?? "—"}</p>
      <button
        className="btn danger"
        onClick={() => {
          signOut();
          navigate("/auth", { replace: true });
        }}
      >
        Sair
      </button>
    </div>
  );
}
