// Run: npm test  (Node >= 22.6 strips the types natively)
import assert from 'node:assert/strict';
import { acceptFix, cyclingKcal, fitRoute, haversineM, rideStats, type TrackPoint } from '../lib/ride.ts';

const near = (a: number, b: number, tol: number, msg: string) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

// 1° of latitude ≈ 111.2 km
near(haversineM({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }), 111_195, 50, 'haversine');

// Synthetic ride: due north at 20 km/h, one fix per 2 s for 10 min, climbing 1 m per fix with ±1 m jitter.
const t0 = Date.UTC(2026, 9, 30, 6, 0, 0);
const metresPerFix = (20 / 3.6) * 2;
const seg: TrackPoint[] = Array.from({ length: 301 }, (_, i) => ({
  lat: -0.3 + (i * metresPerFix) / 111_195,
  lon: 100.37,
  t: t0 + i * 2000,
  alt: 900 + i * 0.5 + (i % 2 ? 1 : -1),
  acc: 5,
}));
const s = rideStats([seg]);
near(s.distanceM, 3333, 5, 'distance');
near(s.movingSec, 600, 0.1, 'moving time');
near(s.avgKmh, 20, 0.1, 'avg speed');
near(s.maxKmh, 20, 0.2, 'max speed');
near(s.elevGainM, 150, 6, 'elevation gain ignores ±1 m jitter');
near(cyclingKcal(s, 72), 8 * 72 * (600 / 3600), 0.5, 'kcal uses MET 8 at 20 km/h');

// A 10-minute stop (heartbeat fixes, no movement) adds elapsed time but no moving time or distance.
const stopped = Array.from({ length: 61 }, (_, i) => ({ ...seg[300], t: seg[300].t + i * 10_000 }));
const s2 = rideStats([seg, stopped]);
near(s2.distanceM, s.distanceM, 0.01, 'stop adds no distance');
near(s2.movingSec, 600, 0.1, 'stop adds no moving time');
near(s2.elapsedSec, 1200, 0.1, 'elapsed includes stop');

// Pause gap: a second segment far away must not add the jump between segments.
const far = seg.map((p) => ({ ...p, lat: p.lat + 0.1, t: p.t + 3_600_000 }));
near(rideStats([seg, far]).distanceM, 2 * s.distanceM, 10, 'gap between segments ignored');

// Recorder filter
const base = seg[0];
assert.equal(acceptFix(undefined, base), true, 'first fix accepted');
assert.equal(acceptFix(undefined, { ...base, acc: 80 }), false, 'inaccurate fix rejected');
assert.equal(acceptFix(base, { ...base, t: base.t + 1000, lat: base.lat + 0.01 }), false, '1.1 km in 1 s = GPS jump rejected');
assert.equal(acceptFix(base, { ...base, t: base.t + 2000, lat: base.lat + 1 / 111_195 }), false, '1 m jitter while stopped skipped');
assert.equal(acceptFix(base, { ...base, t: base.t + 10_000 }), true, 'stationary heartbeat kept');

// Projection keeps route inside its box
const pts = fitRoute([seg], 100, 200, 400, 400).flat();
assert.ok(pts.every((p) => p.x >= 100 - 1e-6 && p.x <= 500 + 1e-6 && p.y >= 200 - 1e-6 && p.y <= 600 + 1e-6), 'route fits box');
assert.ok(pts[0].y > pts[pts.length - 1].y, 'north is up');

console.log('ride self-check: all assertions passed');
