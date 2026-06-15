import { type FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api/client";
import { useSession } from "../app/session";

export function AuthPage() {
  const { user, setSession } = useSession();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", login: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = mode === "login"
        ? await api.auth.login(form.login || form.email, form.password)
        : await api.auth.register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      if (session.user.type !== "PASSAGEIRO") throw new Error("Esta conta nao e de passageiro");
      setSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="brand-mark">TP</div>
      <h1>Transporte.PRO</h1>
      <p>Mobilidade urbana com categorias, pagamento garantido e match operacional.</p>
      <div className="tabs">
        <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Entrar</button>
        <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Criar conta</button>
      </div>
      <form onSubmit={submit} className="card form-card">
        {mode === "register" && <>
          <input placeholder="Nome completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
        </>}
        {mode === "login" && <input placeholder="E-mail ou telefone" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} required />}
        <input placeholder="Senha" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        {error && <p className="error">{error}</p>}
        <button className="btn primary" disabled={loading}>{loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}</button>
      </form>
    </div>
  );
}
