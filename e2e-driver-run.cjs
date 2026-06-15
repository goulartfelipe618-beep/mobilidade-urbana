const fs = require('fs');
const BASE = 'http://localhost:3000';
const ts = Date.now();

const results = { startedAt: new Date().toISOString(), steps: [], backendRestarted: true };

async function req(step, name, method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res, text;
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    text = await res.text();
  } catch (e) {
    results.steps.push({ step, name, pass: false, error: String(e) });
    return null;
  }
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  const pass = res.ok;
  results.steps.push({
    step,
    name,
    pass,
    status: res.status,
    data: data,
    error: pass ? undefined : (data?.message || text),
  });
  return { ok: pass, status: res.status, data };
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  await req(1, 'GET /healthz', 'GET', '/healthz');

  const driverEmail = `e2e-driver-${ts}@test.local`;
  const passengerEmail = `e2e-passenger-${ts}@test.local`;
  const phoneDriver = `+5541999${String(ts).slice(-7)}`;
  const phonePassenger = `+5541888${String(ts).slice(-7)}`;

  const regDriver = await req(2, 'Register driver', 'POST', '/api/v1/users/register', {
    name: 'E2E Driver',
    email: driverEmail,
    phone: phoneDriver,
    password: 'e2e-pass-1',
    type: 'MOTORISTA',
  });
  const driverToken = regDriver?.data?.token;
  const driverId = regDriver?.data?.user?.id;

  const regPass = await req(3, 'Register passenger', 'POST', '/api/v1/users/register', {
    name: 'E2E Passenger',
    email: passengerEmail,
    phone: phonePassenger,
    password: 'e2e-pass-1',
    type: 'PASSAGEIRO',
  });
  const passengerId = regPass?.data?.user?.id;

  await req(4, 'Driver go-online', 'POST', '/api/v1/drivers/me/go-online', {
    latitude: -25.4284,
    longitude: -49.2733,
  }, driverToken);

  const rideBody = {
    passengerId,
    categoryCode: 'ECONOMICO',
    originLatitude: -25.4284,
    originLongitude: -49.2733,
    originAddress: 'Centro Curitiba E2E',
    destinationLatitude: -25.437,
    destinationLongitude: -49.281,
    destinationAddress: 'Batel Curitiba E2E',
    distanceKm: 3.5,
    durationMinutes: 12,
    estimatedFare: 2500,
  };

  const rideRes = await req(5, 'Passenger request ride', 'POST', '/api/v1/rides', rideBody);
  let rideId = rideRes?.data?.id;
  let rideStatus = rideRes?.data?.status;

  let offers = [];
  for (let i = 0; i < 5; i++) {
    const off = await req(6, `Driver GET offers (attempt ${i + 1})`, 'GET', '/api/v1/drivers/me/offers', undefined, driverToken);
    if (off?.data?.offers) offers = off.data.offers;
    if (offers.length > 0) break;
    await sleep(800);
  }

  const step6 = results.steps.filter(s => s.name.startsWith('Driver GET offers'));
  const lastOffersStep = step6[step6.length - 1];
  if (lastOffersStep) {
    lastOffersStep.name = 'Driver GET /drivers/me/offers';
    lastOffersStep.pass = offers.length > 0 || rideStatus === 'MOTORISTA_A_CAMINHO';
    lastOffersStep.keyData = { offerCount: offers.length, rideStatusAfterRequest: rideStatus };
  }

  let acceptOk = false;
  if (rideStatus === 'SOLICITADA' && offers.length > 0) {
    const key = offers[0].id || offers[0].rideId;
    const acc = await req(7, 'Driver accept offer', 'POST', `/api/v1/drivers/me/offers/${key}/accept`, {}, driverToken);
    acceptOk = acc?.ok;
    if (acc?.data?.id) rideId = acc.data.id;
    rideStatus = acc?.data?.status;
  } else if (rideStatus === 'MOTORISTA_A_CAMINHO') {
    results.steps.push({
      step: 7,
      name: 'Driver accept offer',
      pass: true,
      status: 200,
      keyData: { skipped: true, reason: 'ride already assigned (auto-match)' },
    });
    acceptOk = true;
  } else if (offers.length > 0) {
    const key = offers[0].id || offers[0].rideId;
    const acc = await req(7, 'Driver accept offer', 'POST', `/api/v1/drivers/me/offers/${key}/accept`, {}, driverToken);
    acceptOk = acc?.ok;
    rideId = acc?.data?.id || rideId;
    rideStatus = acc?.data?.status || rideStatus;
  } else {
    results.steps.push({
      step: 7,
      name: 'Driver accept offer',
      pass: false,
      error: 'no offers and ride not assigned',
      keyData: { rideStatus, rideId },
    });
  }

  if (rideId && acceptOk) {
    const arr = await req(8, 'Driver arrive', 'POST', `/api/v1/drivers/me/rides/${rideId}/arrive`, {}, driverToken);
    rideStatus = arr?.data?.status || rideStatus;
    const st = await req("8b", 'Driver start', 'POST', `/api/v1/drivers/me/rides/${rideId}/start`, {}, driverToken);
    rideStatus = st?.data?.status || rideStatus;
    const comp = await req("8c", 'Driver complete', 'POST', `/api/v1/drivers/me/rides/${rideId}/complete`, {}, driverToken);
    rideStatus = comp?.data?.status || rideStatus;
    results.steps.push({
      step: 8,
      name: 'Driver lifecycle (arrive/start/complete)',
      pass: comp?.ok && rideStatus === 'CONCLUIDA',
      keyData: { finalStatus: rideStatus, rideId },
    });
  }

  const finalRide = await req(9, 'Verify ride GET', 'GET', `/api/v1/rides/${rideId}`, undefined, driverToken);
  const concluida = finalRide?.data?.status === 'CONCLUIDA';
  const verifyStep = results.steps.find(s => s.step === 9);
  if (verifyStep) {
    verifyStep.pass = concluida;
    verifyStep.keyData = { status: finalRide?.data?.status, rideId };
  }

  const earnings = await req(9, 'Driver earnings', 'GET', '/api/v1/drivers/me/earnings', undefined, driverToken);
  const history = await req(9, 'Driver ride history', 'GET', '/api/v1/drivers/me/rides', undefined, driverToken);

  const histRide = history?.data?.rides?.find(r => r.id === rideId);
  results.steps.push({
    step: 9,
    name: 'Verify earnings and history',
    pass: concluida && (earnings?.ok ?? false) && histRide?.status === 'CONCLUIDA',
    keyData: {
      earnings: earnings?.data,
      historyRideStatus: histRide?.status,
      driverId,
      passengerId,
      driverEmail,
      passengerEmail,
    },
  });

  results.finishedAt = new Date().toISOString();
  results.summary = {
    total: results.steps.length,
    passed: results.steps.filter(s => s.pass).length,
    failed: results.steps.filter(s => !s.pass).length,
  };

  fs.writeFileSync('C:\\MOBILIDADE URBANA\\e2e-results.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results.summary));
  console.log('---STEPS---');
  for (const s of results.steps) {
    console.log(`${s.pass ? 'PASS' : 'FAIL'} [${s.step}] ${s.name} status=${s.status ?? '-'} ${s.keyData ? JSON.stringify(s.keyData) : (s.error || '')}`);
  }
}

main().catch(e => {
  results.steps.push({ step: 0, name: 'fatal', pass: false, error: String(e) });
  fs.writeFileSync('C:\\MOBILIDADE URBANA\\e2e-results.json', JSON.stringify(results, null, 2));
  console.error(e);
  process.exit(1);
});


