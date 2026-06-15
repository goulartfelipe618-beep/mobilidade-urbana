import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  BadgeDollarSign,
  Car,
  CheckCircle2,
  Database,
  FileWarning,
  Gauge,
  Globe2,
  MapPinned,
  RadioTower,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Users,
  WalletCards,
} from "lucide-react";
import "./styles.css";

interface HealthResult {
  service?: string;
  status?: string;
  error?: string;
}

interface CategoryLike {
  id?: string;
  code: string;
  name: string;
  description?: string | null;
  active?: boolean;
}

type Severity = "ok" | "warn" | "critical" | "info";

const modules = [
  { name: "Usuarios", status: "Operacional", metric: "cadastro/login/me", icon: Users, tone: "ok" as Severity },
  { name: "Motoristas", status: "Online, ofertas e lifecycle", metric: "/drivers/me", icon: Car, tone: "ok" as Severity },
  { name: "Corridas", status: "Solicitar, aceitar, chegar, iniciar, concluir", metric: "status versionado", icon: Route, tone: "ok" as Severity },
  { name: "Pagamentos", status: "Garantia obrigatoria", metric: "sem pagar depois", icon: WalletCards, tone: "warn" as Severity },
  { name: "Match", status: "PostGIS + ofertas", metric: "raio incremental", icon: MapPinned, tone: "info" as Severity },
  { name: "Realtime", status: "Outbox planejado", metric: "WebSocket pendente", icon: RadioTower, tone: "warn" as Severity },
];

const operationalCards = [
  { title: "Request -> Assign", value: "SLA 45s", detail: "Tempo alvo para associar motorista", icon: Gauge, tone: "ok" as Severity },
  { title: "Oferta", value: "6s", detail: "Timeout por motorista em premium/criticas", icon: RadioTower, tone: "info" as Severity },
  { title: "Raio", value: "800m -> 10km", detail: "Expansao progressiva por estagio", icon: Globe2, tone: "info" as Severity },
  { title: "Pagamento", value: "Garantido", detail: "PIX/cartao antes do inicio; dinheiro por reputacao", icon: BadgeDollarSign, tone: "warn" as Severity },
];

const checklist = [
  "Banco relacional como fonte de verdade para entidades criticas",
  "Redis apenas cache/coordenador efemero, nunca fonte unica",
  "Outbox transacional para eventos criticos",
  "Sem pagar depois, sem saldo negativo, sem credito futuro",
  "Match valida categoria, status online, documento, localizacao fresca e bloqueios",
  "IA nunca decide fluxo critico sincrono",
  "Toda regra de pricing, reputacao e score deve ser versionada",
  "Nunca commitar delecoes inesperadas ou arquivos com secrets",
];

const riskRules = [
  { area: "GPS falso", rule: "saltos impossiveis, mock location e baixa confianca reduzem prioridade", severity: "critical" as Severity },
  { area: "Conta duplicada", rule: "documento, telefone, cartao, device e IP correlacionados", severity: "warn" as Severity },
  { area: "Cupom", rule: "limite por usuario, device, documento, cartao e geofence", severity: "warn" as Severity },
  { area: "Corrida suspeita", rule: "origem/destino repetidos, loops entre pares e duracoes anomalas", severity: "critical" as Severity },
];

const categoriesFallback: CategoryLike[] = [
  { code: "MOTO", name: "Moto", description: "1 passageiro, sem bagagem volumosa, bloqueavel em chuva forte" },
  { code: "ECONOMICO", name: "Economico", description: "Categoria padrao, ate 4 passageiros" },
  { code: "COMFORT", name: "Comfort", description: "Reputacao 4.75+, conforto superior" },
  { code: "EXECUTIVO", name: "Executivo", description: "Corporativo e aeroportuario, regras mais rigidas" },
  { code: "BLACK", name: "Black", description: "Premium, prioridade para clientes de alta reputacao" },
  { code: "SUV", name: "SUV", description: "Grupo e bagagem volumosa, ate 6 passageiros" },
  { code: "PET", name: "Pet", description: "Motorista preparado, capa e kit de limpeza" },
  { code: "PCD", name: "PCD", description: "Atendimento inclusivo e prioridade operacional" },
];

function App() {
  const [health, setHealth] = useState<HealthResult>({});
  const [categories, setCategories] = useState<CategoryLike[]>(categoriesFallback);
  const [lastRefresh, setLastRefresh] = useState<Date>(() => new Date());

  async function refresh() {
    const [healthResult, categoryResult] = await Promise.allSettled([
      fetch("/healthz").then((r) => r.json()),
      fetch("/api/v1/categories").then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))),
    ]);
    setHealth(healthResult.status === "fulfilled" ? healthResult.value : { status: "error", error: String(healthResult.reason) });
    if (categoryResult.status === "fulfilled" && Array.isArray(categoryResult.value) && categoryResult.value.length) {
      setCategories(categoryResult.value);
    }
    setLastRefresh(new Date());
  }

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(id);
  }, []);

  const activeCategories = useMemo(() => categories.filter((c) => c.active !== false).length, [categories]);

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="logo">TP</div>
        <nav>
          <a href="#cockpit">Cockpit</a>
          <a href="#operations">Operacao</a>
          <a href="#categories">Categorias</a>
          <a href="#risk">Risco</a>
          <a href="#payments">Pagamentos</a>
          <a href="#realtime">Realtime</a>
          <a href="#persistence">Persistencia</a>
        </nav>
      </aside>

      <main>
        <section id="cockpit" className="hero">
          <div>
            <span className="eyebrow">Transporte.PRO Admin</span>
            <h1>Centro de comando operacional</h1>
            <p>Painel detalhado para acompanhar usuarios, motoristas, corridas, match, pagamentos, reputacao, risco e integridade do sistema conforme o guia operacional.</p>
          </div>
          <div className="hero-status">
            <StatusPill tone={health.status === "ok" ? "ok" : "critical"}>{health.status === "ok" ? "Backend OK" : "Backend alerta"}</StatusPill>
            <small>Atualizado {lastRefresh.toLocaleTimeString("pt-BR")}</small>
          </div>
        </section>

        <section className="kpi-grid">
          <Kpi icon={Database} title="Core Node" value={health.service ?? "core-node"} detail={health.status ?? health.error ?? "checando"} tone={health.status === "ok" ? "ok" : "critical"} />
          <Kpi icon={SlidersHorizontal} title="Categorias ativas" value={String(activeCategories)} detail="catalogo e regras do guia" tone="info" />
          <Kpi icon={Activity} title="Fluxo critico" value="E2E API OK" detail="passageiro -> motorista -> concluida" tone="ok" />
          <Kpi icon={FileWarning} title="Pendencias" value="3" detail="WebSocket, payouts, documentos" tone="warn" />
        </section>

        <section id="operations" className="panel">
          <PanelTitle icon={Gauge} title="Operacao em tempo real" subtitle="Sinais principais para atendimento e suporte." />
          <div className="card-grid four">
            {operationalCards.map((item) => <InfoCard key={item.title} {...item} />)}
          </div>
        </section>

        <section className="panel">
          <PanelTitle icon={Route} title="Pipeline de corrida" subtitle="Estados e controles que o admin precisa enxergar." />
          <div className="timeline">
            {[
              ["REQUESTED", "passageiro escolhe categoria, origem, destino e pagamento"],
              ["DRIVER_ASSIGNED", "match confirma motorista elegivel e pagamento garantido"],
              ["DRIVER_ARRIVED", "chegada gera janela de espera e codigos"],
              ["IN_PROGRESS", "dupla validacao obrigatoria, GPS sozinho nao inicia"],
              ["COMPLETED", "captura/liquidacao, recibo, reputacao e payout"],
            ].map(([title, detail], index) => <div key={title}><span>{index + 1}</span><strong>{title}</strong><p>{detail}</p></div>)}
          </div>
        </section>

        <section id="categories" className="panel">
          <PanelTitle icon={Car} title="Categorias e politicas" subtitle="Resumo administrativo das categorias do guia.txt." />
          <div className="category-table">
            {categories.map((cat) => <article key={cat.code}>
              <div><strong>{cat.name}</strong><code>{cat.code}</code></div>
              <p>{cat.description ?? "Sem descricao"}</p>
              <small>{cat.active === false ? "Inativa" : "Ativa"}</small>
            </article>)}
          </div>
        </section>

        <section id="risk" className="panel two-col">
          <div>
            <PanelTitle icon={ShieldCheck} title="Risco e antifraude" subtitle="Sinais deterministicas antes de IA." />
            <div className="risk-list">{riskRules.map((r) => <div key={r.area} className={`risk ${r.severity}`}><strong>{r.area}</strong><p>{r.rule}</p></div>)}</div>
          </div>
          <div>
            <PanelTitle icon={Star} title="Reputacao" subtitle="Faixas operacionais bidirecionais." />
            <div className="score-list">
              <Score label="Elite" value="4.90 - 5.00" />
              <Score label="Premium" value="4.80 - 4.89" />
              <Score label="Confiavel" value="4.60 - 4.79" />
              <Score label="Observacao" value="4.30 - 4.59" />
              <Score label="Restrito" value="abaixo de 4.30" />
            </div>
          </div>
        </section>

        <section id="payments" className="panel two-col">
          <div className="pay-card"><WalletCards /><h3>Pagamento garantido</h3><p>PIX, credito e debito precisam de confirmacao/autorizacao antes do inicio. Dinheiro depende de reputacao minima e limites de risco da praca.</p></div>
          <div className="pay-card"><BadgeDollarSign /><h3>Repasse motorista</h3><p>Driver payout separa base, distancia, tempo, dinamica, pedagio, aeroporto e incentivos. Promocao ao passageiro nao reduz ganho salvo campanha cofinanciada.</p></div>
        </section>

        <section id="realtime" className="panel">
          <PanelTitle icon={RadioTower} title="Realtime e eventos" subtitle="Canais e eventos esperados para WebSocket/Redis/outbox." />
          <div className="event-grid">
            {["ride:{ride_id}", "user:{user_id}", "driver:{driver_id}", "region:{region_id}:supply", "ops:{city_id}"].map((c) => <code key={c}>{c}</code>)}
          </div>
          <div className="event-grid compact">
            {["RIDE_REQUESTED", "RIDE_OFFERED", "RIDE_ACCEPTED", "RIDE_DRIVER_ARRIVED", "RIDE_STARTED", "RIDE_COMPLETED", "PAYMENT_CAPTURED", "GPS_INTEGRITY_ALERT"].map((e) => <span key={e}>{e}</span>)}
          </div>
        </section>

        <section id="persistence" className="panel">
          <PanelTitle icon={CheckCircle2} title="Trava contra perda de edicoes" subtitle="Regras que agora devem ser validadas antes de qualquer commit/push." />
          <div className="checklist">{checklist.map((item) => <label key={item}><input type="checkbox" checked readOnly /> {item}</label>)}</div>
        </section>

        <section className="panel">
          <PanelTitle icon={Activity} title="Modulos monitorados" subtitle="Visao resumida dos dominios ativos e pendentes." />
          <div className="module-grid">{modules.map((m) => <InfoCard key={m.name} icon={m.icon} title={m.name} value={m.status} detail={m.metric} tone={m.tone} />)}</div>
        </section>
      </main>
    </div>
  );
}

function StatusPill({ tone, children }: { tone: Severity; children: React.ReactNode }) {
  return <span className={`status ${tone}`}>{children}</span>;
}

function Kpi({ icon: Icon, title, value, detail, tone }: { icon: typeof Activity; title: string; value: string; detail: string; tone: Severity }) {
  return <article className={`kpi ${tone}`}><Icon size={22} /><span>{title}</span><strong>{value}</strong><p>{detail}</p></article>;
}

function PanelTitle({ icon: Icon, title, subtitle }: { icon: typeof Activity; title: string; subtitle: string }) {
  return <header className="panel-title"><Icon size={22} /><div><h2>{title}</h2><p>{subtitle}</p></div></header>;
}

function InfoCard({ icon: Icon, title, value, detail, tone }: { icon: typeof Activity; title: string; value: string; detail: string; tone: Severity }) {
  return <article className={`info-card ${tone}`}><Icon size={24} /><strong>{value}</strong><span>{title}</span><p>{detail}</p></article>;
}

function Score({ label, value }: { label: string; value: string }) {
  return <div className="score"><span>{label}</span><strong>{value}</strong></div>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
