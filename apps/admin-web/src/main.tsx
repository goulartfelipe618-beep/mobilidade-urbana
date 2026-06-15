import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  BellRing,
  Car,
  ChartLine,
  CheckCircle2,
  Cog,
  FileText,
  Gift,
  Headphones,
  LockKeyhole,
  MapPinned,
  RadioTower,
  Route,
  SlidersHorizontal,
  UserCheck,
  Users,
  WalletCards,
} from "lucide-react";
import "./styles.css";

type Severity = "ok" | "warn" | "critical" | "info";
interface HealthResult { service?: string; status?: string; error?: string }
interface CategoryLike { code: string; name: string; description?: string | null; active?: boolean }
interface KpiData { title: string; value: string; detail: string; tone: Severity }

const dashboard: KpiData[] = [
  { title: "Corridas hoje", value: "697", detail: "tempo real por cidade", tone: "ok" },
  { title: "Em andamento", value: "41", detail: "tracking ativo", tone: "info" },
  { title: "Concluidas", value: "612", detail: "87,8% do volume", tone: "ok" },
  { title: "Canceladas", value: "44", detail: "6,3% geral", tone: "warn" },
  { title: "Motoristas online", value: "264", detail: "128 em BC", tone: "ok" },
  { title: "Passageiros ativos", value: "1.842", detail: "ultimas 24h", tone: "info" },
  { title: "Faturamento dia", value: "R$ 36.050", detail: "take R$ 7.931", tone: "ok" },
  { title: "Faturamento mes", value: "R$ 842 mil", detail: "meta 71%", tone: "ok" },
  { title: "Ticket medio", value: "R$ 51,72", detail: "+8,4% semana", tone: "info" },
  { title: "Taxa aceite", value: "78,6%", detail: "meta 75%", tone: "ok" },
  { title: "Taxa cancelamento", value: "6,3%", detail: "alerta em 8%", tone: "ok" },
];

const cityData = [
  ["Balneario Camboriu", "342", "R$ 18.420", "128 online"],
  ["Itajai", "188", "R$ 9.780", "74 online"],
  ["Camboriu", "96", "R$ 4.210", "38 online"],
  ["Itapema", "71", "R$ 3.640", "24 online"],
];
const rideHourly = [52,44,31,22,18,27,48,82,116,134,128,119,142,151,138,122,146,189,214,198,176,132,96,68];
const revenueDaily = [8400,9100,10200,9800,12100,13600,18420];
const userGrowth = [1200,1540,1890,2340,2980,3760,4215];

const categoriesFallback: CategoryLike[] = [
  { code: "MOTO", name: "Moto", description: "1 passageiro, sem bagagem volumosa, bloqueio em chuva forte" },
  { code: "ECONOMICO", name: "Economico", description: "padrao, ate 4 passageiros" },
  { code: "COMFORT", name: "Comfort", description: "reputacao 4.75+, conforto superior" },
  { code: "EXECUTIVO", name: "Executivo", description: "corporativo e aeroportuario" },
  { code: "BLACK", name: "Black", description: "premium e alta reputacao" },
  { code: "SUV", name: "SUV", description: "grupo e bagagem volumosa" },
  { code: "PET", name: "Pet", description: "motorista preparado e kit limpeza" },
  { code: "PCD", name: "PCD", description: "atendimento inclusivo e prioridade" },
  { code: "AEROPORTO", name: "Aeroporto", description: "fila virtual e taxa aeroportuaria" },
  { code: "CORPORATIVO", name: "Corporativo", description: "centro de custo e B2B" },
];

const drivers = [
  ["Carlos Mendes","***.342.***-11","CNH AB valid. 2029","Online","1264","4.92","R$ 8.420","Aprovado","Aprovar Â· Rejeitar Â· Suspender Â· Bloquear Â· Reativar"],
  ["Juliana Rocha","***.812.***-04","CNH B valid. 2028","Em corrida","842","4.81","R$ 6.130","Aprovado","Monitorar Â· Suspender Â· Bloquear"],
  ["Rafael Lima","***.219.***-88","CNH A valid. 2030","Pendente","0","-","R$ 0","CNH em analise","Aprovar Â· Rejeitar"],
  ["Marcos Vieira","***.551.***-32","CNH B valid. 2027","Suspenso","438","4.21","R$ 2.940","Seguro vencido","Reativar Â· Bloquear"],
];
const vehicles = [
  ["Toyota","Corolla","2022","Prata","RTA4C21","EXECUTIVO","CRLV + seguro OK","Aprovado","Aprovar Â· Rejeitar Â· Bloquear"],
  ["Honda","CG 160","2021","Preta","MOT8A77","MOTO","CRLV OK","Aprovado","Aprovar Â· Rejeitar Â· Bloquear"],
  ["Jeep","Compass","2020","Branco","SUV2B18","SUV","Fotos pendentes","Analise","Aprovar Â· Rejeitar"],
  ["BMW","320i","2019","Preto","BLK9D40","BLACK","Seguro vencido","Bloqueado","Reativar"],
];
const passengers = [
  ["Ana Souza","***.902.***-70","+55 47 99999-0001","ana@test.local","48","R$ 1.842","4.86","Liberado","Bloquear Â· Historico"],
  ["Felipe Goulart","***.118.***-55","+55 47 99999-0002","felipe@test.local","73","R$ 2.610","4.92","Liberado","Bloquear Â· Historico"],
  ["Conta Risco","***.000.***-01","+55 47 99999-0003","risco@test.local","5","R$ 98","3.72","Restrito","Liberar Â· Historico"],
];
const rides = [
  ["TP-10491","Ana Souza","Carlos Mendes","Centro","Aeroporto","R$ 62,40","19,8 km","Em andamento"],
  ["TP-10490","Felipe","Juliana Rocha","Praia Central","Itajai","R$ 48,10","13,2 km","Concluida"],
  ["TP-10489","Roberto","-","Camboriu","Centro","R$ 21,80","5,6 km","Aguardando motorista"],
  ["TP-10488","Marina","Marcos Vieira","Barra Sul","Shopping","R$ 17,50","3,1 km","Cancelada"],
];
const pricingRegions = [
  ["Centro","R$ 5,00","R$ 2,00","R$ 0,40","R$ 8,00","1.35x","1.15x","1.20x"],
  ["Aeroporto","R$ 7,50","R$ 2,45","R$ 0,55","R$ 14,00","1.50x","1.18x","1.30x"],
  ["Praias","R$ 6,20","R$ 2,20","R$ 0,46","R$ 10,00","1.42x","1.12x","1.25x"],
  ["Municipios vizinhos","R$ 5,80","R$ 2,35","R$ 0,44","R$ 11,00","1.28x","1.10x","1.15x"],
];
const tickets = [["#9102","Passageiro","Cobranca","2h","Aberto","Chat Â· Reembolso Â· Historico"],["#9101","Motorista","Documento","4h","Em analise","Chat Â· Anexos Â· Bloqueio"],["#9098","Passageiro","Objeto perdido","8h","Resolvido","Historico Â· Notificar"]];
const auditEvents = [["master@transporte.pro","Aprovou motorista","Rafael Lima","189.4.22.10","19:42"],["financeiro@transporte.pro","Liberou saque","Carlos Mendes","189.4.22.11","18:51"],["ops@transporte.pro","Alterou multiplicador","Centro","189.4.22.12","17:20"]];
const roles = [["Master","Tudo: configuracoes, financeiro, RBAC, API keys e auditoria"],["Administrador","Operacao, usuarios, motoristas, corridas e relatorios"],["Financeiro","Receitas, saques, taxas, conciliacao e relatorios"],["Operacional","Mapa, corridas, motoristas online e suporte operacional"],["Suporte","Tickets, chat, reembolso limitado e historico"],["Marketing","Cupons, campanhas, notificacoes e segmentacao"]];

function App() {
  const [health, setHealth] = useState<HealthResult>({});
  const [categories, setCategories] = useState<CategoryLike[]>(categoriesFallback);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  useEffect(() => { const refresh = async () => { const [h,c] = await Promise.allSettled([fetch("/healthz").then(r=>r.json()), fetch("/api/v1/categories").then(r=>r.ok?r.json():Promise.reject(new Error(String(r.status))))]); setHealth(h.status === "fulfilled" ? h.value : {status:"error", error:String(h.reason)}); if(c.status === "fulfilled" && Array.isArray(c.value) && c.value.length) setCategories(c.value); setLastRefresh(new Date()); }; void refresh(); const id=window.setInterval(refresh,15000); return () => window.clearInterval(id); }, []);
  const kpis = useMemo(() => [...dashboard, { title:"Backend", value: health.status === "ok" ? "OK" : "Alerta", detail: health.service ?? health.error ?? "checando", tone: health.status === "ok" ? "ok" : "critical" } as KpiData], [health]);
  return <div className="admin-shell"><Sidebar/><main>
    <section id="dashboard" className="hero"><div><span className="eyebrow">Administrador Master</span><h1>Controle total da plataforma</h1><p>Operacao completa estilo Uber, 99 e inDrive: frota, passageiros, corridas, mapa, financeiro, pricing, match, cupons, suporte, notificacoes, configuracoes, auditoria e RBAC.</p></div><div className="hero-status"><Status tone={health.status === "ok" ? "ok" : "critical"}>{health.status === "ok" ? "Backend OK" : "Backend alerta"}</Status><small>Atualizado {lastRefresh.toLocaleTimeString("pt-BR")}</small></div></section>
    <KpiGrid items={kpis}/><Charts/><Drivers/><Vehicles/><Passengers/><Rides/><OperationalMap/><Finance/><Pricing categories={categories}/><MatchEngine/><Coupons/><Support/><Notifications/><PlatformSettings/><Audit/><RBAC/><Persistence/>
  </main></div>;
}
function Sidebar(){const links=[["dashboard","Dashboard"],["drivers","Motoristas"],["vehicles","Veiculos"],["passengers","Passageiros"],["rides","Corridas"],["map","Mapa"],["finance","Financeiro"],["pricing","Pricing"],["match","Match"],["coupons","Cupons"],["support","Suporte"],["notifications","Notificacoes"],["settings","Configuracoes"],["audit","Auditoria"],["rbac","RBAC"]];return <aside className="sidebar"><div className="logo">TP</div><nav>{links.map(([id,label])=><a href={'#'+id} key={id}>{label}</a>)}</nav></aside>}
function Status({tone,children}:{tone:Severity;children:React.ReactNode}){return <span className={'status '+tone}>{children}</span>}
function KpiGrid({items}:{items:KpiData[]}){return <section className="kpi-grid">{items.map(k=><article key={k.title} className={'kpi '+k.tone}><span>{k.title}</span><strong>{k.value}</strong><p>{k.detail}</p></article>)}</section>}
function Section({id,icon:Icon,title,subtitle,children}:{id:string;icon:typeof Activity;title:string;subtitle:string;children:React.ReactNode}){return <section id={id} className="panel"><header className="panel-title"><Icon size={22}/><div><h2>{title}</h2><p>{subtitle}</p></div></header>{children}</section>}
function BarChart({values,label}:{values:number[];label:string}){const max=Math.max(...values);return <div><h3>{label}</h3><div className="bars">{values.map((v,i)=><span key={i} style={{height:String(Math.max(8,(v/max)*100))+'%'}} title={String(v)}/>)}</div></div>}
function Charts(){return <Section id="charts" icon={ChartLine} title="Graficos executivos" subtitle="Corridas por hora, cidade, crescimento de usuarios e receita diaria."><div className="chart-grid"><BarChart values={rideHourly} label="Corridas por hora"/><BarChart values={revenueDaily} label="Receita diaria"/><BarChart values={userGrowth} label="Crescimento de usuarios"/><div><h3>Corridas por cidade</h3><div className="city-list">{cityData.map(c=><div key={c[0]}><strong>{c[0]}</strong><span>{c[1]} corridas Â· {c[2]} Â· {c[3]}</span></div>)}</div></div></div></Section>}
function Drivers(){return <Section id="drivers" icon={UserCheck} title="Gestao de Motoristas" subtitle="Cadastro, CPF, CNH, documentos, aprovacao, bloqueio, monitoramento, avaliacao e ganhos."><DataTable headers={["Nome","CPF","CNH","Status","Corridas","Avaliacao","Ganhos","Docs","Acoes"]} rows={drivers}/><DocGrid items={["CNH frente e verso","Comprovante de residencia","Foto de perfil","Antecedentes opcionais","Localizacao atual","Status online/offline","Aprovar motorista","Rejeitar motorista","Suspender","Bloquear","Reativar"]}/></Section>}
function Vehicles(){return <Section id="vehicles" icon={Car} title="Gestao de Veiculos" subtitle="Marca, modelo, ano, cor, placa, categoria, CRLV, seguro, fotos e bloqueio."><DataTable headers={["Marca","Modelo","Ano","Cor","Placa","Categoria","Docs","Status","Acoes"]} rows={vehicles}/><DocGrid items={["CRLV","Seguro","Fotos externas","Fotos internas","Aprovar","Rejeitar","Bloquear"]}/></Section>}
function Passengers(){return <Section id="passengers" icon={Users} title="Gestao de Passageiros" subtitle="Nome, CPF, telefone, e-mail, corridas, gasto, avaliacao, bloqueio e historico."><DataTable headers={["Nome","CPF","Telefone","E-mail","Corridas","Valor gasto","Avaliacao","Status","Acoes"]} rows={passengers}/></Section>}
function Rides(){return <Section id="rides" icon={Route} title="Gestao de Corridas" subtitle="Lista, filtros, detalhes, timeline, rota percorrida, tempo total e eventos."><div className="filters"><input placeholder="Data"/><input placeholder="Cidade"/><input placeholder="Categoria"/><input placeholder="Status"/></div><DataTable headers={["ID","Passageiro","Motorista","Origem","Destino","Valor","Distancia","Status"]} rows={rides}/><Timeline/></Section>}
function OperationalMap(){return <Section id="map" icon={MapPinned} title="Mapa Operacional" subtitle="Motoristas online/ocupados, corridas em andamento e solicitacoes aguardando."><div className="map"><div className="heat h1"/><div className="heat h2"/><div className="pin p1">128 online</div><div className="pin p2">41 em corrida</div><div className="pin p3">12 aguardando</div></div><DocGrid items={["Zoom por regiao","Heatmap de demanda","Rastreamento ao vivo","Motoristas online","Motoristas ocupados","Corridas em andamento","Solicitacoes aguardando motorista"]}/></Section>}
function Finance(){return <Section id="finance" icon={WalletCards} title="Central Financeira" subtitle="Receitas, comissao, taxas, saques, pendencias e relatorios."><div className="card-grid"><Info title="Total arrecadado" value="R$ 842 mil"/><Info title="Comissao plataforma" value="R$ 176 mil"/><Info title="Taxas" value="R$ 24 mil"/><Info title="Saldo motoristas" value="R$ 91 mil"/><Info title="Saques" value="R$ 38 mil"/><Info title="Pendencias" value="17"/></div><DocGrid items={["Relatorio diario","Relatorio semanal","Relatorio mensal","Relatorio anual","Pagamentos motoristas","Pendencias de captura"]}/></Section>}
function Pricing({categories}:{categories:CategoryLike[]}){return <Section id="pricing" icon={SlidersHorizontal} title="Pricing Engine" subtitle="Regioes tarifarias, tarifa base, km, minuto, minimo e multiplicadores."><DataTable headers={["Regiao","Base","Km","Minuto","Minimo","Pico","Chuva","Eventos"]} rows={pricingRegions}/><div className="category-table">{categories.map(c=><article key={c.code}><strong>{c.name}</strong><code>{c.code}</code><p>{c.description}</p></article>)}</div></Section>}
function MatchEngine(){return <Section id="match" icon={RadioTower} title="Match Engine" subtitle="Raio de busca, lote de motoristas, tempo de espera, criterios e monitoramento."><div className="card-grid"><Info title="Raio inicial" value="800m"/><Info title="Raio maximo" value="10km"/><Info title="Max motoristas" value="5"/><Info title="Tempo espera" value="6s"/><Info title="Taxa aceite" value="78,6%"/><Info title="Despacho medio" value="31s"/></div><DocGrid items={["Distancia/ETA","Reputacao","Aceitacao","Cancelamento","Tempo online","Compatibilidade categoria","Bloqueios par-a-par","Locks Redis"]}/></Section>}
function Coupons(){return <Section id="coupons" icon={Gift} title="Cupons e Promocoes" subtitle="Cupons, cashback, campanhas, limite de uso, validade e regiao."><DataTable headers={["Campanha","Tipo","Limite","Validade","Regiao","Status"]} rows={[["BC10","Cupom","1 uso/usuario","30/06","Balneario","Ativa"],["VOLTA20","Cashback","R$ 20","7 dias","Nacional","Ativa"],["AERO","Campanha","500 usos","15/07","Aeroporto","Pausada"]]}/></Section>}
function Support(){return <Section id="support" icon={Headphones} title="Atendimento e Suporte" subtitle="Tickets, chat interno, historico completo, reembolso e ferramentas."><DataTable headers={["Ticket","Perfil","Assunto","SLA","Status","Ferramentas"]} rows={tickets}/></Section>}
function Notifications(){return <Section id="notifications" icon={BellRing} title="Notificacoes" subtitle="Push, SMS, WhatsApp, e-mail e segmentacao."><DocGrid items={["Push","SMS","WhatsApp","E-mail","Segmentar por cidade","Segmentar por categoria","Motoristas","Passageiros"]}/></Section>}
function PlatformSettings(){return <Section id="settings" icon={Cog} title="Configuracoes da Plataforma" subtitle="Aplicativo, taxa, pagamentos, chaves de API, Mapbox, Supabase, Redis e webhooks."><DocGrid items={["Nome do aplicativo","Logo","Cores","Taxa da plataforma","Metodos de pagamento","Mapbox","Supabase","Redis","Webhooks","Chaves de API"]}/></Section>}
function Audit(){return <Section id="audit" icon={FileText} title="Auditoria" subtitle="Quem alterou, quando alterou, o que alterou e IP de origem."><DataTable headers={["Quem","Acao","Alvo","IP","Quando"]} rows={auditEvents}/></Section>}
function RBAC(){return <Section id="rbac" icon={LockKeyhole} title="Controle de Acesso (RBAC)" subtitle="Master, administrador, financeiro, operacional, suporte e marketing."><DataTable headers={["Perfil","Permissoes"]} rows={roles}/></Section>}
function Persistence(){return <Section id="persistence" icon={CheckCircle2} title="Trava contra excluir edicoes" subtitle="Entrega so depois de persistencia, build, commit e push."><DocGrid items={["node scripts/verify-persistence.cjs","Test-Path nos apps","Build admin/client/driver","Sem delecoes inesperadas","Sem secrets no commit","Push para GitHub oficial"]}/></Section>}
function Timeline(){return <div className="timeline">{["Solicitada","Oferta enviada","Aceita","Chegou","Iniciada","Concluida"].map((s,i)=><div key={s}><span>{i+1}</span><strong>{s}</strong><p>Evento auditavel no outbox</p></div>)}</div>}
function Info({title,value}:{title:string;value:string}){return <article className="info"><strong>{value}</strong><span>{title}</span></article>}
function DocGrid({items}:{items:string[]}){return <div className="doc-grid">{items.map(i=><span key={i}>{i}</span>)}</div>}
function DataTable({headers,rows}:{headers:string[];rows:string[][]}){return <div className="table"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table></div>}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

