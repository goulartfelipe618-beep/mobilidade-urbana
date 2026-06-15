import { useEffect, useMemo, useState } from "react";
import { LocateFixed, MapPin, ShieldCheck } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, fare } from "../api/client";
import type { Category, PlaceDraft, PricingQuote } from "../api/types";
import { useSession } from "../app/session";

const fallbackCategories: Category[] = [
  { id: "moto", code: "MOTO", name: "Moto", description: "Rapida para 1 passageiro sem bagagem volumosa", passengerLimitMax: 1 },
  { id: "economico", code: "ECONOMICO", name: "Economico", description: "Categoria padrao para ate 4 passageiros", passengerLimitMax: 4 },
  { id: "comfort", code: "COMFORT", name: "Comfort", description: "Mais conforto e veiculos melhores", passengerLimitMax: 4, isPremium: true },
  { id: "executivo", code: "EXECUTIVO", name: "Executivo", description: "Viagens corporativas e aeroportuarias", passengerLimitMax: 4, isPremium: true },
  { id: "suv", code: "SUV", name: "SUV", description: "Grupo ou bagagem volumosa", passengerLimitMax: 6, isPremium: true },
  { id: "pet", code: "PET", name: "Pet", description: "Motoristas preparados para animais", passengerLimitMax: 4 },
  { id: "pcd", code: "PCD", name: "PCD", description: "Transporte adaptado conforme necessidade", passengerLimitMax: 4 },
];

const originDefault: PlaceDraft = { address: "Av. Sete de Setembro, Curitiba", latitude: -25.4284, longitude: -49.2733 };
const destinationDefault: PlaceDraft = { address: "Shopping Curitiba", latitude: -25.4409, longitude: -49.2797 };

export function HomePage() {
  const { user, activeRide, setActiveRide } = useSession();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);
  const [categoryCode, setCategoryCode] = useState("ECONOMICO");
  const [origin, setOrigin] = useState(originDefault);
  const [destination, setDestination] = useState(destinationDefault);
  const [quote, setQuote] = useState<PricingQuote | null>(null);
  const [paymentMethodType, setPaymentMethodType] = useState("CREDIT_CARD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.categories().then((items) => setCategories(items.length ? items : fallbackCategories)).catch(() => setCategories(fallbackCategories));
  }, []);

  const distanceKm = useMemo(() => estimateDistanceKm(origin, destination), [origin, destination]);
  const durationMinutes = Math.max(6, Math.round(distanceKm * 3.2));

  useEffect(() => {
    let alive = true;
    api.quote({ categoryCode, distanceKm, durationMinutes })
      .then((q) => { if (alive) setQuote(q); })
      .catch(() => { if (alive) setQuote(null); });
    return () => { alive = false; };
  }, [categoryCode, distanceKm, durationMinutes]);

  if (!user) return <Navigate to="/auth" replace />;
  if (activeRide && !["CONCLUIDA", "CANCELADA"].includes(activeRide.status)) return <Navigate to="/corrida" replace />;

  async function useCurrentLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setOrigin({ address: "Localizacao atual", latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    });
  }

  async function requestRide() {
    const currentUser = user;
    if (!currentUser) return;
    setLoading(true);
    setError("");
    try {
      const estimatedFare = quote?.breakdown.total ?? 18;
      const ride = await api.createRide({
        passengerId: currentUser.id,
        categoryCode,
        originLatitude: origin.latitude,
        originLongitude: origin.longitude,
        originAddress: origin.address,
        destinationLatitude: destination.latitude,
        destinationLongitude: destination.longitude,
        destinationAddress: destination.address,
        distanceKm,
        durationMinutes,
        estimatedFare,
        paymentMethodType,
      });
      setActiveRide(ride);
      navigate("/corrida");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel solicitar corrida");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page home-page">
      <header className="hero-card">
        <span>Passageiro</span>
        <h1>Para onde vamos?</h1>
        <p>Escolha categoria, confirme pagamento e solicite com regras do Transporte.PRO.</p>
      </header>
      <section className="map-card"><div className="map-grid" /><button className="locate" onClick={() => void useCurrentLocation()}><LocateFixed size={18} /> usar GPS</button></section>
      <section className="card route-card">
        <label><MapPin size={16} /> Origem</label>
        <input value={origin.address} onChange={(e) => setOrigin({ ...origin, address: e.target.value })} />
        <label><MapPin size={16} /> Destino</label>
        <input value={destination.address} onChange={(e) => setDestination({ ...destination, address: e.target.value })} />
      </section>
      <section className="category-strip">
        {categories.map((cat) => <button type="button" key={cat.code} className={cat.code === categoryCode ? "selected" : ""} onClick={() => setCategoryCode(cat.code)}><strong>{cat.name}</strong><span>{cat.passengerLimitMax ? `ate ${cat.passengerLimitMax}` : cat.code}</span></button>)}
      </section>
      <section className="card quote-card"><div><strong>{categories.find((c) => c.code === categoryCode)?.name ?? categoryCode}</strong><p>{distanceKm.toFixed(1)} km · {durationMinutes} min</p></div><strong className="price">{quote ? fare(quote.breakdown.total) : "Calculando"}</strong></section>
      <section className="card safety-card"><ShieldCheck size={18} /><p>Sem pagar depois: PIX/cartao exigem garantia; dinheiro depende de reputacao, conforme guia.</p></section>
      <select className="payment-select" value={paymentMethodType} onChange={(e) => setPaymentMethodType(e.target.value)}>
        <option value="CREDIT_CARD">Cartao de credito</option>
        <option value="DEBIT_CARD">Cartao de debito</option>
        <option value="PIX">PIX</option>
        <option value="CASH">Dinheiro</option>
      </select>
      {error && <p className="error">{error}</p>}
      <button className="btn primary full" disabled={loading} onClick={() => void requestRide()}>{loading ? "Solicitando..." : "Solicitar viagem"}</button>
    </div>
  );
}

function estimateDistanceKm(a: PlaceDraft, b: PlaceDraft) {
  const R = 6371;
  const dLat = deg(b.latitude - a.latitude);
  const dLon = deg(b.longitude - a.longitude);
  const lat1 = deg(a.latitude);
  const lat2 = deg(b.latitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.max(1.2, 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 1.35);
}
function deg(v: number) { return (v * Math.PI) / 180; }

