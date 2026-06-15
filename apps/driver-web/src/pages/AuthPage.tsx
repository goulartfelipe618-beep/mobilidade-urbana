import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login, registerDriver, setToken } from "../api/client";
import { useAuth } from "../app/providers";

export function AuthPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const session =
        mode === "login"
          ? await login(String(fd.get("login") ?? ""), String(fd.get("password") ?? ""))
          : await registerDriver({
              name: String(fd.get("name") ?? ""),
              email: String(fd.get("email") ?? ""),
              phone: String(fd.get("phone") ?? ""),
              password: String(fd.get("password") ?? ""),
            });
      if (session.user.type !== "MOTORISTA") {
        throw new Error("Use uma conta de motorista");
      }
      setToken(session.token);
      await refresh();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na autenticaÃ§Ã£o");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h1 className="h1">Transporte.PRO Motorista</h1>
      <p className="muted">Entre ou cadastre-se para operar corridas.</p>
      <form className="stack" onSubmit={onSubmit} style={{ marginTop: 16 }}>
        {mode === "register" && (
          <>
            <label className="field">
              Nome
              <input name="name" required />
            </label>
            <label className="field">
              E-mail
              <input name="email" type="email" required />
            </label>
            <label className="field">
              Telefone
              <input name="phone" required />
            </label>
          </>
        )}
        {mode === "login" && (
          <label className="field">
            E-mail ou telefone
            <input name="login" required />
          </label>
        )}
        <label className="field">
          Senha
          <input name="password" type="password" required minLength={6} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
        </button>
      </form>
      <button
        type="button"
        className="btn"
        style={{ marginTop: 10 }}
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login" ? "Criar conta de motorista" : "JÃ¡ tenho conta"}
      </button>
    </div>
  );
}

