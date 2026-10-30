// Pure GPS ride math (no DOM): filtering, stats, projection. Covered by scripts/ride-selfcheck.ts.

export type TrackPoint = { lat: number; lon: number; t: number; alt: number | null; acc: number };
/** A ride is a list of segments; a new segment starts after every pause, so the gap isn't counted as distance. */
export type Segments = TrackPoint[][];

export type Ride = { id: string; name: string; startedAt: number; segments: Segments };
export type ActiveRide = {
  startedAt: number;
  status: 'recording' | 'paused';
  segments: Segments;
  /** Recorded seconds before the current recording span, and when that span started; drives the live timer. */
  elapsedBefore: number;
  resumedAt: number;
};

export type RideStats = {
  distanceM: number;
  movingSec: number;
  elapsedSec: number;
  avgKmh: number;
  maxKmh: number;
  elevGainM: number;
};

const R_EARTH = 6371008.8;
const MAX_ACCURACY_M = 35; // fixes worse than this are dropped
const MAX_SPEED_MS = 120 / 3.6; // anything faster between two fixes is a GPS jump
const MIN_MOVING_MS = 0.8; // ~3 km/h: below this the bike is considered stopped
const MAX_GAP_S = 60; // longer gaps (signal loss) never count as moving time
const ELEV_HYSTERESIS_M = 4; // GPS altitude jitters; only count climbs that persist
const SPEED_WINDOW_S = 5;

const toRad = (d: number) => (d * Math.PI) / 180;

export function haversineM(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Decide whether a new fix should be appended after `prev` (the last kept point of the segment). */
export function acceptFix(prev: TrackPoint | undefined, p: TrackPoint) {
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon) || p.acc > MAX_ACCURACY_M) return false;
  if (!prev) return true;
  const dt = (p.t - prev.t) / 1000;
  if (dt <= 0) return false;
  const d = haversineM(prev, p);
  if (d / dt > MAX_SPEED_MS) return false;
  // Standing still: skip jitter, but keep a heartbeat point every 10 s so moving time stays honest.
  return d >= 3 || dt >= 10;
}

export function rideStats(segments: Segments): RideStats {
  let distanceM = 0, movingSec = 0, elapsedSec = 0, maxMs = 0, elevGainM = 0;

  for (const seg of segments) {
    if (seg.length === 0) continue;
    elapsedSec += (seg[seg.length - 1].t - seg[0].t) / 1000;

    const cum = [0];
    for (let i = 1; i < seg.length; i++) {
      const d = haversineM(seg[i - 1], seg[i]);
      const dt = (seg[i].t - seg[i - 1].t) / 1000;
      cum.push(cum[i - 1] + d);
      if (dt > 0 && dt <= MAX_GAP_S && d / dt >= MIN_MOVING_MS) movingSec += dt;
    }
    distanceM += cum[cum.length - 1];

    // Max speed over a >=5 s window, so a single noisy fix can't spike it.
    let j = 0;
    for (let i = 1; i < seg.length; i++) {
      while (j < i - 1 && seg[i].t - seg[j + 1].t >= SPEED_WINDOW_S * 1000) j++;
      const dt = (seg[i].t - seg[j].t) / 1000;
      if (dt >= SPEED_WINDOW_S && dt <= MAX_GAP_S) maxMs = Math.max(maxMs, (cum[i] - cum[j]) / dt);
    }

    let ref: number | null = null;
    for (const p of seg) {
      if (p.alt == null) continue;
      if (ref == null) ref = p.alt;
      else if (p.alt - ref >= ELEV_HYSTERESIS_M) { elevGainM += p.alt - ref; ref = p.alt; }
      else if (ref - p.alt >= ELEV_HYSTERESIS_M) ref = p.alt;
    }
  }

  return {
    distanceM,
    movingSec,
    elapsedSec,
    avgKmh: movingSec > 0 ? (distanceM / movingSec) * 3.6 : 0,
    maxKmh: maxMs * 3.6,
    elevGainM,
  };
}

/** Speed over the last few seconds of the open segment, for the live display. */
export function currentKmh(segments: Segments) {
  const seg = segments[segments.length - 1] ?? [];
  if (seg.length < 2) return 0;
  const last = seg[seg.length - 1];
  let i = seg.length - 2;
  while (i > 0 && last.t - seg[i].t < 10_000) i--;
  let d = 0;
  for (let k = i + 1; k < seg.length; k++) d += haversineM(seg[k - 1], seg[k]);
  const dt = (last.t - seg[i].t) / 1000;
  return dt > 0 && dt <= MAX_GAP_S ? (d / dt) * 3.6 : 0;
}

// Compendium of Physical Activities, bicycling METs by average speed.
export function cyclingKcal(stats: RideStats, weightKg: number) {
  const v = stats.avgKmh;
  const met = v < 16 ? 4 : v < 19 ? 6.8 : v < 22.5 ? 8 : v < 25.5 ? 10 : v < 30.5 ? 12 : 15.8;
  return met * weightKg * (stats.movingSec / 3600);
}

export function defaultRideName(startedAt: number) {
  const h = new Date(startedAt).getHours();
  if (h >= 4 && h < 10) return 'Gowes Pagi';
  if (h >= 10 && h < 15) return 'Gowes Siang';
  if (h >= 15 && h < 18) return 'Gowes Sore';
  return 'Gowes Malam';
}

/** Project segments into a w×h box (equirectangular, aspect preserved, centered). */
export function fitRoute(segments: Segments, x: number, y: number, w: number, h: number) {
  const pts = segments.flat();
  if (pts.length === 0) return [];
  const k = Math.cos(toRad(pts.reduce((s, p) => s + p.lat, 0) / pts.length));
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    const px = p.lon * k, py = -p.lat;
    minX = Math.min(minX, px); maxX = Math.max(maxX, px);
    minY = Math.min(minY, py); maxY = Math.max(maxY, py);
  }
  const spanX = maxX - minX || 1e-9, spanY = maxY - minY || 1e-9;
  const scale = Math.min(w / spanX, h / spanY);
  const ox = x + (w - spanX * scale) / 2, oy = y + (h - spanY * scale) / 2;
  return segments.map((seg) => seg.map((p) => ({ x: ox + (p.lon * k - minX) * scale, y: oy + (-p.lat - minY) * scale })));
}

export function formatKm(m: number) {
  return (m / 1000).toLocaleString('id-ID', { minimumFractionDigits: m < 100_000 ? 1 : 0, maximumFractionDigits: m < 100_000 ? 1 : 0 });
}

export function formatSpeed(kmh: number) {
  return kmh.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatDuration(sec: number) {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h > 0 ? `${h}j ${m}m` : `${m}m ${String(r).padStart(2, '0')}d`;
}

export function formatClock(sec: number) {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const mm = String(m).padStart(2, '0'), ss = String(r).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatRideDate(ts: number) {
  return new Date(ts).toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
