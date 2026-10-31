// Pure progress analytics for the Home dashboard. Covered by scripts/progress-selfcheck.ts.
import type { BodyEntry, BodyMetric, DayDiet } from './state';

const DAY_MS = 86_400_000;
const KCAL_PER_KG_FAT = 7700;
const parseDay = (key: string) => new Date(`${key}T12:00:00`).getTime();

/**
 * Least-squares slope of a body metric in units per week over the last `windowDays`.
 * Needs at least two entries at least 3 days apart, otherwise there is no honest trend yet.
 */
export function trendPerWeek(log: BodyEntry[], metric: BodyMetric = 'weight', windowDays = 28) {
  if (log.length < 2) return null;
  const end = parseDay(log[log.length - 1].date);
  const pts = log.filter((e) => end - parseDay(e.date) <= windowDays * DAY_MS).map((e) => ({ x: (parseDay(e.date) - end) / DAY_MS, y: e[metric] }));
  if (pts.length < 2 || pts[pts.length - 1].x - pts[0].x < 3) return null;
  const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
  const my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  const num = pts.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0);
  const den = pts.reduce((a, p) => a + (p.x - mx) ** 2, 0);
  return den ? (num / den) * 7 : null;
}

/** Date the goal weight is reached at the current trend, or null if the trend points away from it (or is flat). */
export function goalEta(current: number, goal: number, perWeek: number | null, from = new Date()) {
  if (perWeek == null || Math.abs(perWeek) < 0.05) return null;
  const weeks = (goal - current) / perWeek;
  if (weeks <= 0 || weeks > 104) return null;
  return new Date(from.getTime() + weeks * 7 * DAY_MS);
}

/** Logged days only: energy balance vs target and what it means in fat mass (≈7700 kcal per kg). */
export function energyBalance(days: string[], log: Record<string, DayDiet>, target: number) {
  const logged = days.filter((d) => (log[d]?.kcal ?? 0) > 0);
  const balance = logged.reduce((a, d) => a + (log[d].kcal - target), 0);
  return {
    loggedDays: logged.length,
    avgKcal: logged.length ? logged.reduce((a, d) => a + log[d].kcal, 0) / logged.length : 0,
    balance, // negative = deficit
    fatKg: balance / KCAL_PER_KG_FAT,
  };
}

export const bmi = (weightKg: number, heightCm: number) => weightKg / (heightCm / 100) ** 2;

export function bmiClass(v: number) {
  if (v < 18.5) return 'Kurus';
  if (v < 25) return 'Normal';
  if (v < 30) return 'Berlebih';
  return 'Obesitas';
}

/** Deurenberg et al. (1991) estimate from BMI; men. Rough: ±4% body fat, shown as an estimate. */
export const bodyFatPct = (bmiValue: number, age: number) => 1.2 * bmiValue + 0.23 * age - 16.2;

/** Consecutive days up to today (or yesterday, if nothing is logged yet today) with food logged. */
export function logStreak(log: Record<string, DayDiet>, days: string[]) {
  let i = days.length - 1;
  if (!(log[days[i]]?.kcal > 0)) i--;
  let n = 0;
  while (i >= 0 && log[days[i]]?.kcal > 0) { n++; i--; }
  return n;
}
