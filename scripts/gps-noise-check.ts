// Realistic GPS noise test: run with `node scripts/gps-noise-check.ts` (part of `npm test`).
// Simulates a city ride and a run with the errors real phones produce, then measures how clean the
// recorded track is. Old = the first recorder filter (accuracy/speed gate only), New = lib/ride.ts filterFix.
import assert from 'node:assert/strict';
import { filterFix, haversineM, rideStats, type FilterState, type TrackPoint } from '../lib/ride.ts';

const LAT0 = -0.305, LON0 = 100.369, M_PER_DEG = 111_195;
const toLatLon = (x: number, y: number) => ({ lat: LAT0 + y / M_PER_DEG, lon: LON0 + x / (M_PER_DEG * Math.cos((LAT0 * Math.PI) / 180)) });

// Deterministic PRNG so results are reproducible.
function rng(seed: number) {
  let a = seed;
  const u = () => ((a = (a + 0x6d2b79f5) | 0), (((a ^ (a >>> 15)) * (a | 1)) >>> 0) / 4294967296);
  const gauss = () => Math.sqrt(-2 * Math.log(u() + 1e-12)) * Math.cos(2 * Math.PI * u());
  return { u, gauss };
}

type Sim = { fixes: TrackPoint[]; truthAt: (t: number) => { lat: number; lon: number }; truthDist: number; truthMoving: number; stops: [number, number][] };

/** City loop with right-angle streets, two 2-minute traffic-light stops and a 40 s tunnel. */
function simulate(speed: number, seed: number): Sim {
  const R = rng(seed);
  const wp = [[0, 0], [800, 0], [800, 600], [1500, 600], [1500, -400], [300, -400], [300, 200], [0, 200], [0, 0]];
  const stopAt = new Set([2, 5]); // waypoint indices
  const legs: { from: number[]; to: number[]; t0: number; t1: number }[] = [];
  const stops: [number, number][] = [];
  let t = 0, dist = 0;
  for (let i = 0; i < wp.length - 1; i++) {
    const len = Math.hypot(wp[i + 1][0] - wp[i][0], wp[i + 1][1] - wp[i][1]);
    legs.push({ from: wp[i], to: wp[i + 1], t0: t, t1: t + len / speed });
    t += len / speed;
    dist += len;
    if (stopAt.has(i + 1)) { stops.push([t, t + 120]); legs.push({ from: wp[i + 1], to: wp[i + 1], t0: t, t1: t + 120 }); t += 120; }
  }
  const T = t;
  const posAt = (s: number) => {
    const leg = legs.find((l) => s >= l.t0 && s <= l.t1) ?? legs[legs.length - 1];
    const f = leg.t1 > leg.t0 ? (s - leg.t0) / (leg.t1 - leg.t0) : 0;
    return toLatLon(leg.from[0] + (leg.to[0] - leg.from[0]) * f, leg.from[1] + (leg.to[1] - leg.from[1]) * f);
  };

  const t0 = Date.UTC(2026, 9, 30, 6, 0, 0);
  const fixes: TrackPoint[] = [];
  let bx = 0, by = 0; // slowly wandering bias: real GPS error is correlated, not white noise
  for (let s = 0; s <= T; s++) {
    if (s >= 500 && s < 540) continue; // tunnel: no fixes at all
    bx = Math.max(-8, Math.min(8, bx + R.gauss() * 0.5));
    by = Math.max(-8, Math.min(8, by + R.gauss() * 0.5));
    let ex = bx + R.gauss() * 2.5, ey = by + R.gauss() * 2.5;
    let acc = 5 + Math.abs(R.gauss()) * 3;
    if (s < 8) { ex += 60 - 7 * s; ey += 30 - 4 * s; acc = 22 + (8 - s) * 3; } // cold start: first fixes are off
    else if (R.u() < 0.02) { const a = R.u() * 2 * Math.PI, m = 40 + R.u() * 40; ex += m * Math.cos(a); ey += m * Math.sin(a); acc = 10 + R.u() * 4; } // multipath jump
    const p = posAt(s);
    const n = toLatLon(0, 0);
    const off = toLatLon(ex, ey);
    fixes.push({ lat: p.lat + (off.lat - n.lat), lon: p.lon + (off.lon - n.lon), t: t0 + s * 1000, alt: 900 + R.gauss() * 3, acc });
  }
  return { fixes, truthAt: (tm) => posAt((tm - t0) / 1000), truthDist: dist, truthMoving: dist / speed, stops: stops.map(([a, b]) => [t0 + a * 1000, t0 + b * 1000]) };
}

// The original recorder filter, kept here only for the before/after comparison.
function oldAccept(prev: TrackPoint | undefined, p: TrackPoint) {
  if (p.acc > 35) return false;
  if (!prev) return true;
  const dt = (p.t - prev.t) / 1000;
  if (dt <= 0) return false;
  const d = haversineM(prev, p);
  if (d / dt > 120 / 3.6) return false;
  return d >= 3 || dt >= 10;
}

function record(sim: Sim, mode: 'old' | 'new', maxSpeedMs?: number) {
  const out: TrackPoint[] = [];
  let state: FilterState = null;
  for (const p of sim.fixes) {
    if (mode === 'old') { if (oldAccept(out.at(-1), p)) out.push(p); continue; }
    const r = filterFix(state, out.at(-1), p, maxSpeedMs);
    state = r.state;
    if (r.point) out.push(r.point);
  }
  return out;
}

function measure(sim: Sim, pts: TrackPoint[]) {
  const s = rideStats([pts]);
  const inStop = (t: number) => sim.stops.some(([a, b]) => t >= a + 5000 && t <= b);
  let stopDrift = 0;
  for (let i = 1; i < pts.length; i++) if (inStop(pts[i - 1].t) && inStop(pts[i].t)) stopDrift += haversineM(pts[i - 1], pts[i]);
  const dev = pts.slice(10).map((p) => haversineM(p, sim.truthAt(p.t))).sort((a, b) => a - b);
  return {
    distErrPct: (Math.abs(s.distanceM - sim.truthDist) / sim.truthDist) * 100,
    movingErrPct: (Math.abs(s.movingSec - sim.truthMoving) / sim.truthMoving) * 100,
    stopDriftM: stopDrift,
    meanDevM: dev.reduce((a, b) => a + b, 0) / dev.length,
    p95DevM: dev[Math.floor(dev.length * 0.95)],
    maxDevM: dev[dev.length - 1],
    maxKmh: s.maxKmh,
  };
}

const fmt = (m: ReturnType<typeof measure>) =>
  `jarak ±${m.distErrPct.toFixed(1)}% | waktu gerak ±${m.movingErrPct.toFixed(1)}% | coretan saat berhenti ${m.stopDriftM.toFixed(0)} m | ` +
  `simpangan rata2 ${m.meanDevM.toFixed(1)} m, p95 ${m.p95DevM.toFixed(1)} m, maks ${m.maxDevM.toFixed(0)} m | kec. maks ${m.maxKmh.toFixed(1)} km/j`;

type M = ReturnType<typeof measure>;
const worst = (ms: M[]) => Object.fromEntries(Object.keys(ms[0]).map((k) => [k, Math.max(...ms.map((m) => m[k as keyof M]))])) as M;

// Worst case over three random routes per activity, so one lucky route can't hide a problem.
for (const [label, speed, maxSpeedMs] of [['Gowes 21,6 km/j', 6, undefined], ['Lari 10 km/j', 2.8, 8]] as const) {
  const before: M[] = [];
  const after: M[] = [];
  for (const seed of [1, 2, 3]) {
    const sim = simulate(speed, seed);
    before.push(measure(sim, record(sim, 'old')));
    after.push(measure(sim, record(sim, 'new', maxSpeedMs)));
  }
  const b = worst(before);
  const a = worst(after);
  console.log(`\n${label}, terburuk dari 3 rute`);
  console.log('  lama :', fmt(b));
  console.log('  baru :', fmt(a));
  assert.ok(a.distErrPct < 3, `${label}: distance error ${a.distErrPct.toFixed(1)}%`);
  assert.ok(a.movingErrPct < 5, `${label}: moving time error ${a.movingErrPct.toFixed(1)}%`);
  assert.ok(a.stopDriftM < 10, `${label}: scribble at stops ${a.stopDriftM.toFixed(0)} m`);
  assert.ok(a.p95DevM < 12.5, `${label}: p95 deviation ${a.p95DevM.toFixed(1)} m`);
  assert.ok(a.maxDevM < 30, `${label}: spike ${a.maxDevM.toFixed(0)} m`);
  assert.ok(a.maxKmh < speed * 3.6 * 1.5, `${label}: max speed ${a.maxKmh.toFixed(1)} km/h`);
}
console.log('\ngps noise check: all assertions passed');
