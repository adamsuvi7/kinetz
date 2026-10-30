// Pure GPS ride math (no DOM): filtering, stats, projection. Covered by scripts/ride-selfcheck.ts.

export type TrackPoint = { lat: number; lon: number; t: number; alt: number | null; acc: number };
/** A ride is a list of segments; a new segment starts after every pause, so the gap isn't counted as distance. */
export type Segments = TrackPoint[][];

export type Sport = 'ride' | 'run';
/** `sport` is missing on rides recorded before running was added; treat those as rides. */
export type Ride = { id: string; name: string; startedAt: number; segments: Segments; sport?: Sport };
export type ActiveRide = {
  startedAt: number;
  sport?: Sport;
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
const FIRST_FIX_ACCURACY_M = 20; // the first fix anchors the track, so wait for a decent lock
const MAX_SPEED_MS = 90 / 3.6; // fast descent on a bike; anything quicker between fixes is a GPS jump
/** Fastest plausible movement per sport; used to reject GPS jumps (sprinting tops out well below 8 m/s). */
export const SPORT_MAX_SPEED_MS: Record<Sport, number> = { ride: MAX_SPEED_MS, run: 8 };
const ACCEL_NOISE = 1; // Kalman: expected acceleration (m/s²): braking, sprinting, turning a corner
// Stop detection: staying within STILL_RADIUS for STILL_AFTER = stopped; the track holds its position
// until the rider is clearly LEAVE_M away (GPS drifts several metres while standing at a traffic light).
const STILL_RADIUS_M = 6;
const STILL_AFTER_MS = 8000;
const LEAVE_M = 20;
const MIN_STEP_M = 8; // don't store points closer than this while moving (less zigzag, honest distance)
const GATE_SIGMA = 4; // fixes further than this many standard deviations from the prediction are jumps
const MAX_REJECTS = 5; // after this many rejected jumps in a row, trust the new position (e.g. leaving a tunnel)
const GAP_RESET_S = 10; // after a longer signal loss, start a fresh estimate (it must be confirmed again)
const MIN_MOVING_MS = 0.8; // ~3 km/h: below this the bike is considered stopped
const MAX_GAP_S = 60; // longer gaps (signal loss) never count as moving time
const ELEV_HYSTERESIS_M = 4; // GPS altitude jitters; only count climbs that persist
// Max speed / best pace is averaged over this long, so GPS jitter can't fake a sprint. Pace reacts far more
// to small position errors at running speed, so runs average over longer.
const SPEED_WINDOW_S: Record<Sport, number> = { ride: 10, run: 30 };

const toRad = (d: number) => (d * Math.PI) / 180;

export function haversineM(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Constant-velocity Kalman estimate in local metres around (lat0, lon0); null = no estimate yet
 * (start or after a pause). x/y = position, vx/vy = velocity; the covariance is the same for both axes.
 */
export type FilterState = {
  lat0: number; lon0: number; kx: number; // metres per degree of longitude at lat0
  x: number; y: number; vx: number; vy: number;
  p00: number; p01: number; p11: number;
  t: number; rejects: number;
  /** False until a second fix agrees with the first one; nothing is recorded before that. */
  confirmed: boolean;
  /** Stop detection anchor (local metres) and since when the rider has stayed near it. */
  ax: number; ay: number; at: number; still: boolean;
} | null;

const M_PER_DEG = (Math.PI / 180) * R_EARTH;

/**
 * Turns one raw GPS fix into the point to record (or null to skip it):
 * accuracy gate → predict → reject jumps far outside the prediction → Kalman update weighted by the
 * fix's accuracy → hold position while the estimated speed says the rider is standing still.
 * Pure function; the caller keeps `state` between fixes and passes the last recorded point.
 */
export function filterFix(state: FilterState, last: TrackPoint | undefined, p: TrackPoint, maxSpeedMs = MAX_SPEED_MS): { state: FilterState; point: TrackPoint | null } {
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon) || p.acc > (state ? MAX_ACCURACY_M : FIRST_FIX_ACCURACY_M)) return { state, point: null };
  const r = p.acc ** 2;

  let s = state;
  if (s) {
    const dt = (p.t - s.t) / 1000;
    if (dt <= 0) return { state: s, point: null };
    if (dt > GAP_RESET_S) s = null;
  }
  if (s) {
    const dt = (p.t - s.t) / 1000;
    // Predict (x += v·dt) and grow the uncertainty by the possible acceleration.
    const q = ACCEL_NOISE ** 2;
    const pred = {
      x: s.x + s.vx * dt, y: s.y + s.vy * dt,
      p00: s.p00 + 2 * dt * s.p01 + dt * dt * s.p11 + (q * dt ** 4) / 4,
      p01: s.p01 + dt * s.p11 + (q * dt ** 3) / 2,
      p11: s.p11 + q * dt * dt,
    };
    const zx = (p.lon - s.lon0) * s.kx, zy = (p.lat - s.lat0) * M_PER_DEG;
    const ix = zx - pred.x, iy = zy - pred.y;
    const sVar = pred.p00 + r;
    // Multipath jump: far outside the prediction, or faster than anyone rides.
    const jump = Math.hypot(ix, iy);
    const tooFar = jump * jump > GATE_SIGMA ** 2 * sVar || jump > maxSpeedMs * dt + 3 * p.acc;
    if (tooFar && s.confirmed && s.rejects < MAX_REJECTS) return { state: { ...s, rejects: s.rejects + 1 }, point: null };
    if (tooFar) s = null; // consistently elsewhere: signal came back after a gap, start over from here
    else {
      const k0 = pred.p00 / sVar, k1 = pred.p01 / sVar;
      s = {
        ...s,
        x: pred.x + k0 * ix, y: pred.y + k0 * iy,
        vx: s.vx + k1 * ix, vy: s.vy + k1 * iy,
        p00: (1 - k0) * pred.p00, p01: (1 - k0) * pred.p01, p11: pred.p11 - k1 * pred.p01,
        t: p.t, rejects: 0, confirmed: true,
      };
    }
  }
  if (!s) {
    // A single fix (first one, or the first after a tunnel) can be a reflection far off; wait until the
    // next fix agrees with it before drawing anything.
    // Start: position from this fix, speed unknown (variance of a fast bike).
    s = {
      lat0: p.lat, lon0: p.lon, kx: M_PER_DEG * Math.cos(toRad(p.lat)),
      x: 0, y: 0, vx: 0, vy: 0, p00: r, p01: 0, p11: 100, t: p.t, rejects: 0, confirmed: false,
      ax: 0, ay: 0, at: p.t, still: false,
    };
    return { state: s, point: null };
  }

  const fromAnchor = Math.hypot(s.x - s.ax, s.y - s.ay);
  if (s.still) {
    if (fromAnchor > LEAVE_M) s = { ...s, still: false, ax: s.x, ay: s.y, at: p.t };
  } else if (fromAnchor > STILL_RADIUS_M) s = { ...s, ax: s.x, ay: s.y, at: p.t };
  else if (p.t - s.at >= STILL_AFTER_MS) s = { ...s, still: true };

  const point: TrackPoint = { lat: s.lat0 + s.y / M_PER_DEG, lon: s.lon0 + s.x / s.kx, t: p.t, alt: p.alt, acc: Math.sqrt(s.p00) };
  if (!last) return { state: s, point };
  if (!s.still && haversineM(last, point) >= MIN_STEP_M) return { state: s, point };
  // Standing still: don't let jitter scribble on the map. Every 10 s add a point on the same spot,
  // so the stop shows up as time without distance.
  if (s.still && p.t - last.t >= 10_000) return { state: s, point: { ...last, t: p.t, alt: p.alt ?? last.alt } };
  return { state: s, point: null };
}

export function rideStats(segments: Segments, sport: Sport = 'ride'): RideStats {
  const windowS = SPEED_WINDOW_S[sport];
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
      while (j < i - 1 && seg[i].t - seg[j + 1].t >= windowS * 1000) j++;
      const dt = (seg[i].t - seg[j].t) / 1000;
      if (dt >= windowS && dt <= MAX_GAP_S) maxMs = Math.max(maxMs, (cum[i] - cum[j]) / dt);
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

// Running: about 1 kcal per kg per km, largely independent of pace.
export function activityKcal(stats: RideStats, weightKg: number, sport: Sport = 'ride') {
  return sport === 'run' ? weightKg * (stats.distanceM / 1000) : cyclingKcal(stats, weightKg);
}

export function defaultRideName(startedAt: number, sport: Sport = 'ride') {
  const what = sport === 'run' ? 'Lari' : 'Gowes';
  const h = new Date(startedAt).getHours();
  if (h >= 4 && h < 10) return `${what} Pagi`;
  if (h >= 10 && h < 15) return `${what} Siang`;
  if (h >= 15 && h < 18) return `${what} Sore`;
  return `${what} Malam`;
}

/** Minutes per km, e.g. 5'12" (runner notation). Slower than 30 min/km shows a dash. */
export function formatPace(kmh: number) {
  if (kmh < 2) return '–';
  const s = Math.round(3600 / kmh);
  return `${Math.floor(s / 60)}'${String(s % 60).padStart(2, '0')}"`;
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
