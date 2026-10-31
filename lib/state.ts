// Central state + formulas ported 1:1 from prototype-reference.html (appState & helper functions).
import type { ActiveRide, Ride } from './ride';
import { DEFAULT_LAYERS, type Layer } from './story';

export type Tab = 'ride' | 'home' | 'workout' | 'nutrition' | 'studio';
export type WorkoutSub = 'gym' | 'run' | 'multi';
export type StudioTemplate = 'ride' | 'gym' | 'run' | 'cycle' | 'meal' | 'recomp';
export type BodyMetric = 'weight' | 'waist' | 'thigh' | 'arm' | 'chest';

/** One set of an exercise; every set has its own load and reps (e.g. a pyramid 30×10, 32×8, 34×6). */
export type GymSetEntry = { kg: number; reps: number; done: boolean };
export type GymExercise = { id: number; name: string; sets: GymSetEntry[] };
export type GymSession = { date: string; split: string; volume: number; sets: number };
export type DayDiet = { kcal: number; protein: number };
/** A dated body measurement; one entry per day (saving again the same day overwrites it). */
export type BodyEntry = { date: string } & Record<BodyMetric, number>;
export type MuscleGroup = 'bahu' | 'dada' | 'biceps' | 'triceps' | 'punggung' | 'perut' | 'kaki' | 'leher';
export type RunData = {
  title: string;
  distanceKm: number;
  movingSeconds: number;
  cadence: number;
  elevationM: number;
  gradePct: number;
  runningLive: boolean;
  splits: { km: number; pace: string; elev: string; hr: number }[];
};
export type Meal = { title: string; baseCal: number; baseProt: number; baseCarb: number; baseFat: number; scale: number; note: string };

export type AppState = {
  theme: 'dark' | 'light';
  activeTab: Tab;
  activeWorkoutSub: WorkoutSub;
  heartRate: number;
  bleBadgeHr: number;
  steps: number;
  activeCalories: number;
  tdee: number;
  bmr: number;
  targetProtein: number;
  tdeeInputs: { weight: string; height: string; goal: string };
  fastingProtocol: string;
  fastingSecondsLeft: number;
  beaconFastingStatus: string;
  weeklySchedule: { day: string; label: string; done: boolean; num: string; active?: boolean }[];
  currentSplit: string;
  gymExercisesBySplit: Record<string, string[]>;
  gymSets: GymExercise[];
  /** Best estimated 1RM per exercise from saved sessions; a higher one in the current session is a PR. */
  gymBests: Record<string, number>;
  gymLog: GymSession[];
  musclesBySplit: Record<string, MuscleGroup[]>;
  runData: RunData;
  multiSports: { id: string; icon: string; name: string; met: number; unit: string }[];
  selectedMultiSportIndex: number;
  multiDurationMin: number;
  challenges: { id: string; title: string; current: number; target: number; unit: string; badge: string }[];
  socialFeed: { id: number; author: string; tag: string; metric: string; kudos: number; fistbumps: number; liked: boolean; bumped: boolean; comments: string[] }[];
  presetMeals: { title: string; cal: number; prot: number; carb: number; fat: number }[];
  activeMeal: Meal;
  /** Food logged per local day (YYYY-MM-DD). */
  dietLog: Record<string, DayDiet>;
  bodyLog: BodyEntry[];
  goalWeight: number;
  rides: Ride[];
  activeRide: ActiveRide | null;
  studio: {
    ratio: '9:16' | '4:5';
    template: StudioTemplate;
    hudOffsetY: number;
    bgImage: HTMLImageElement | null;
    transparent: boolean;
    showBadge: boolean;
    rideId: string | null;
    rideLayers: Layer[];
    rideTemplate: string;
  };
};

export const initialState: AppState = {
  theme: 'dark',
  activeTab: 'ride',
  activeWorkoutSub: 'gym',
  heartRate: 142,
  bleBadgeHr: 74,
  steps: 5635,
  activeCalories: 620,
  tdee: 2150,
  bmr: 1698,
  targetProtein: 150,
  tdeeInputs: { weight: '72', height: '173', goal: '-400' },
  fastingProtocol: '16:8',
  fastingSecondsLeft: 14 * 3600 + 22 * 60 + 9,
  beaconFastingStatus: 'IF 16:8 (Fasted Cardio)',

  weeklySchedule: [
    { day: 'Sen', label: 'Push', done: true, num: '✓' },
    { day: 'Sel', label: 'Pull', done: true, num: '✓' },
    { day: 'Rab', label: 'Run 5K', done: false, num: '16', active: true },
    { day: 'Kam', label: 'Legs', done: false, num: '17' },
    { day: 'Jum', label: 'Upper', done: false, num: '18' },
    { day: 'Sab', label: 'Cycle', done: false, num: '19' },
    { day: 'Min', label: 'Rest', done: false, num: '20' },
  ],

  currentSplit: 'Push',
  gymExercisesBySplit: {
    Push: ['Incline Dumbbell Press', 'Barbell Bench Press', 'Seated Shoulder Press', 'Cable Lateral Raises', 'Tricep Rope Pushdown'],
    Pull: ['Weighted Pull-Ups', 'Lat Pulldown Wide', 'Barbell Bent-Over Row', 'Face Pulls', 'Incline Dumbbell Curl'],
    Legs: ['Barbell Back Squat', 'Romanian Deadlift (RDL)', 'Leg Press 45°', 'Lying Leg Curl', 'Standing Calf Raise'],
    Upper: ['Incline Bench Press', 'Pendlay Row', 'Overhead Press', 'Cable Fly', 'EZ-Bar Barbell Curl'],
    Lower: ['Hack Squat', 'Bulgarian Split Squat', 'Hip Thrust', 'Seated Hamstring Curl', 'Seated Calf Raise'],
    FullBody: ['Deadlift', 'Bench Press', 'Pull-Ups', 'Dumbbell Shoulder Press', 'Front Squat'],
  },

  // A planned session: tick each set when done. Nothing counts toward volume until it is ticked.
  gymSets: [
    { id: 1, name: 'Incline Dumbbell Press', sets: [{ kg: 26, reps: 12, done: false }, { kg: 30, reps: 10, done: false }, { kg: 32, reps: 8, done: false }, { kg: 32, reps: 7, done: false }] },
    { id: 2, name: 'Barbell Bench Press', sets: [{ kg: 60, reps: 10, done: false }, { kg: 70, reps: 8, done: false }, { kg: 75, reps: 6, done: false }, { kg: 80, reps: 4, done: false }] },
    { id: 3, name: 'Cable Lateral Raises', sets: [{ kg: 10, reps: 15, done: false }, { kg: 12, reps: 12, done: false }, { kg: 12, reps: 12, done: false }] },
    { id: 4, name: 'Tricep Rope Pushdown', sets: [{ kg: 22, reps: 15, done: false }, { kg: 25, reps: 12, done: false }, { kg: 28, reps: 10, done: false }] },
  ],
  gymBests: {},
  gymLog: [],
  musclesBySplit: {},

  runData: {
    title: 'Morning 5K Tempo Run',
    distanceKm: 5.24,
    movingSeconds: 1646, // 27:26
    cadence: 176,
    elevationM: 118,
    gradePct: 4.2,
    runningLive: false,
    splits: [
      { km: 1, pace: "5'18\"", elev: '+18m', hr: 148 },
      { km: 2, pace: "5'12\"", elev: '+24m', hr: 154 },
      { km: 3, pace: "5'08\"", elev: '+31m', hr: 161 },
      { km: 4, pace: "5'16\"", elev: '+28m', hr: 164 },
      { km: 5, pace: "5'04\"", elev: '+17m', hr: 169 },
    ],
  },

  multiSports: [
    { id: 'cycling', icon: '🚴', name: 'Sepedaan Road', met: 8.5, unit: '26.4 km/h' },
    { id: 'padel', icon: '🎾', name: 'Padel / Tenis', met: 7.0, unit: '3 Set Match' },
    { id: 'hiking', icon: '🥾', name: 'Hiking Trail', met: 6.5, unit: '+420m Elev' },
    { id: 'swimming', icon: '🏊', name: 'Renang Lap', met: 8.0, unit: '1,500m Pace' },
    { id: 'basketball', icon: '🏀', name: 'Basket / Futsal', met: 8.0, unit: 'Full Court' },
    { id: 'walking', icon: '🚶', name: 'Jalan Cepat', met: 4.2, unit: '6,800 Steps' },
  ],
  selectedMultiSportIndex: 0,
  multiDurationMin: 60,

  challenges: [
    { id: 'c1', title: '100 KM Oktober Run & Ride Club', current: 78.4, target: 100, unit: 'KM', badge: '🏅 100K Endurance' },
    { id: 'c2', title: '50 Ton Gym Volume Master', current: 42.6, target: 50, unit: 'Ton', badge: '🏋️ Iron 50T' },
    { id: 'c3', title: '21 Days IF 16:8 & Protein Streak', current: 18, target: 21, unit: 'Hari', badge: '🔥 Clean Macro' },
  ],

  socialFeed: [
    { id: 101, author: 'Rizky Pratama', tag: 'Lari GPS • 10.2 KM', metric: "Pace 5'09\"/km • +145m Elev", kudos: 24, fistbumps: 9, liked: false, bumped: false, comments: ['Kenceng banget pace KM terakhir! 🔥'] },
    { id: 102, author: 'Nadia Putri', tag: 'Push Day + IF 16:8', metric: 'Total Volume 4.820 KG • 2 New PR', kudos: 31, fistbumps: 18, liked: true, bumped: false, comments: ['PR Incline mantap kak!'] },
  ],

  presetMeals: [
    { title: 'Dada Ayam Bakar, Nasi Putih 150g & Tempe', cal: 540, prot: 46, carb: 52, fat: 14 },
    { title: 'Sirloin Steak 200g, Kentang Panggang & Telur', cal: 610, prot: 54, carb: 38, fat: 24 },
    { title: 'Ikan Bakar Padang, Lalapan & Tahu Kukus', cal: 480, prot: 42, carb: 44, fat: 12 },
  ],
  activeMeal: {
    baseCal: 540,
    baseProt: 46,
    baseCarb: 52,
    baseFat: 14,
    scale: 1.0,
    title: 'Dada Ayam Bakar, Nasi Putih 150g & Tempe',
    note: 'Confidence AI: 96% • Diet IF 16:8 Compliant',
  },

  dietLog: {},
  bodyLog: [],
  goalWeight: 68,
  rides: [],
  activeRide: null,

  studio: {
    ratio: '9:16',
    template: 'ride',
    hudOffsetY: 25,
    bgImage: null,
    transparent: false,
    showBadge: false,
    rideId: null,
    rideLayers: DEFAULT_LAYERS,
    rideTemplate: 'sorotan',
  },
};

export const SPLIT_DESC: Record<string, { title: string; muscles: MuscleGroup[] }> = {
  Push: { title: 'Push Day', muscles: ['dada', 'bahu', 'triceps'] },
  Pull: { title: 'Pull Day', muscles: ['punggung', 'biceps', 'bahu'] },
  Legs: { title: 'Leg Day', muscles: ['kaki', 'perut'] },
  Upper: { title: 'Upper Body', muscles: ['dada', 'punggung', 'bahu', 'biceps', 'triceps'] },
  Lower: { title: 'Lower Body', muscles: ['kaki', 'perut'] },
  FullBody: { title: 'Full Body', muscles: ['dada', 'punggung', 'bahu', 'kaki', 'perut'] },
};

export const last = <T,>(arr: T[]) => arr[arr.length - 1];

export function formatNumberID(num: number) {
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatDurationMMSS(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function computePaceString(distKm: number, sec: number) {
  if (!distKm || distKm <= 0) return "0'00\"";
  const paceSecPerKm = sec / distKm;
  const m = Math.floor(paceSecPerKm / 60);
  const s = Math.round(paceSecPerKm % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

// Riegel: T2 = T1 * (D2 / D1)^1.06
export const riegelSeconds = (run: RunData, targetKm: number) => run.movingSeconds * Math.pow(targetKm / run.distanceKm, 1.06);

export function computeRiegelTime(run: RunData, targetKm: number) {
  const t2 = riegelSeconds(run, targetKm);
  const h = Math.floor(t2 / 3600);
  const m = Math.floor((t2 % 3600) / 60);
  const s = Math.round(t2 % 60);
  if (h > 0) return `${h}j ${m}m ${s}d`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Epley: 1RM = W * (1 + R/30)
export const e1rm = (kg: number, reps: number) => kg * (1 + reps / 30);
export const bestE1rm = (ex: GymExercise) => Math.max(0, ...ex.sets.filter((st) => st.done).map((st) => e1rm(st.kg, st.reps)));
export const gymTotalVolume = (exs: GymExercise[]) => exs.reduce((acc, ex) => acc + ex.sets.reduce((a, st) => (st.done ? a + st.kg * st.reps : a), 0), 0);
export const gymCompletedSets = (exs: GymExercise[]) => exs.reduce((acc, ex) => acc + ex.sets.filter((st) => st.done).length, 0);
/** Exercises whose best set today beats the saved best (first time an exercise is saved it sets the baseline, not a PR). */
export const gymPrCount = (exs: GymExercise[], bests: Record<string, number>) =>
  exs.filter((ex) => bests[ex.name] !== undefined && bestE1rm(ex) > bests[ex.name] + 0.05).length;

export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const dietToday = (s: AppState): DayDiet => s.dietLog[todayKey()] ?? { kcal: 0, protein: 0 };
/** Latest logged weight, else the weight typed in the TDEE calculator. */
export const currentWeight = (s: AppState) => last(s.bodyLog)?.weight ?? (parseFloat(s.tdeeInputs.weight) || 72);
export const muscles = (s: AppState) => s.musclesBySplit[s.currentSplit] ?? SPLIT_DESC[s.currentSplit]?.muscles ?? [];

/** The last n local days, oldest first. */
export function lastDays(n: number, from = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(from);
    d.setDate(d.getDate() - (n - 1 - i));
    return todayKey(d);
  });
}

/** Days in the last n with any logged activity (ride/run, gym session) or food. */
export function activeDays(s: AppState, n = 7) {
  const days = new Set(lastDays(n));
  const hit = new Set<string>();
  s.rides.forEach((r) => days.has(todayKey(new Date(r.startedAt))) && hit.add(todayKey(new Date(r.startedAt))));
  s.gymLog.forEach((g) => days.has(g.date) && hit.add(g.date));
  Object.keys(s.dietLog).forEach((d) => days.has(d) && s.dietLog[d].kcal > 0 && hit.add(d));
  return hit.size;
}
