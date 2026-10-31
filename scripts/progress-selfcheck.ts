// Run: npm test
import assert from 'node:assert/strict';
import { bmi, bodyFatPct, energyBalance, goalEta, logStreak, trendPerWeek } from '../lib/progress.ts';

const near = (a: number, b: number, tol: number, msg: string) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const day = (i: number) => `2026-10-${String(i).padStart(2, '0')}`;
const entry = (i: number, weight: number) => ({ date: day(i), weight, waist: 80, thigh: 55, arm: 35, chest: 100 });

// Losing 0.5 kg per week, weighed every 2 days for 3 weeks
const log = Array.from({ length: 11 }, (_, k) => entry(1 + 2 * k, 75 - (0.5 / 7) * 2 * k));
near(trendPerWeek(log)!, -0.5, 0.001, 'trend per week');
assert.equal(trendPerWeek([entry(1, 75)]), null, 'one entry: no trend');
assert.equal(trendPerWeek([entry(1, 75), entry(2, 74)]), null, 'entries too close: no trend');

const eta = goalEta(73, 72, -0.5, new Date('2026-10-31T12:00:00'));
assert.equal(eta?.toISOString().slice(0, 10), '2026-11-14', '1 kg at 0.5 kg/week = 2 weeks');
assert.equal(goalEta(73, 72, +0.3), null, 'trend away from goal: no ETA');

const diet = { [day(1)]: { kcal: 1800, protein: 140 }, [day(2)]: { kcal: 2200, protein: 120 }, [day(4)]: { kcal: 1700, protein: 150 } };
const eb = energyBalance([day(1), day(2), day(3), day(4)], diet, 2000);
assert.equal(eb.loggedDays, 3, 'unlogged day ignored');
near(eb.balance, -300, 0.001, 'balance');
near(eb.avgKcal, 1900, 0.001, 'average of logged days');
near(eb.fatKg, -300 / 7700, 1e-9, 'kcal to fat');

near(bmi(72, 173), 24.06, 0.01, 'BMI');
near(bodyFatPct(24.06, 24), 18.19, 0.01, 'Deurenberg');

assert.equal(logStreak(diet, [day(1), day(2), day(3), day(4)]), 1, 'streak broken by an empty day');
assert.equal(logStreak(diet, [day(1), day(2)]), 2, 'streak');
assert.equal(logStreak(diet, [day(1), day(2), day(3)]), 2, 'today not logged yet still counts yesterday');

console.log('progress self-check: all assertions passed');
