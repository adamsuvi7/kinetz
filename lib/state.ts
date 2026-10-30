// Central state + formulas ported 1:1 from prototype-reference.html (appState & helper functions).
import type { ActiveRide, Ride } from './ride';
import { DEFAULT_LAYERS, type Layer } from './story';

export type Tab = 'ride' | 'home' | 'workout' | 'nutrition' | 'analytics' | 'studio';
export type WorkoutSub = 'gym' | 'run' | 'multi' | 'kom';
export type StudioTemplate = 'ride' | 'gym' | 'run' | 'cycle' | 'meal' | 'recomp';
export type BodyMetric = 'weight' | 'waist' | 'thigh' | 'arm' | 'chest';

export type GymSet = { id: number; name: string; weight: number; reps: number; sets: number; done: boolean; isPr: boolean };
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
  consumedCalories: number;
  consumedProtein: number;
  fastingProtocol: string;
  fastingSecondsLeft: number;
  beaconFastingStatus: string;
  aiText: string;
  weeklySchedule: { day: string; label: string; done: boolean; num: string; active?: boolean }[];
  currentSplit: string;
  gymExercisesBySplit: Record<string, string[]>;
  gymSets: GymSet[];
  runData: RunData;
  multiSports: { id: string; icon: string; name: string; met: number; unit: string }[];
  selectedMultiSportIndex: number;
  multiDurationMin: number;
  segments: { name: string; dist: string; kom: string; userBest: string; legendCount: number; isLegend: boolean; type: string }[];
  challenges: { id: string; title: string; current: number; target: number; unit: string; badge: string }[];
  socialFeed: { id: number; author: string; tag: string; metric: string; kudos: number; fistbumps: number; liked: boolean; bumped: boolean; comments: string[] }[];
  presetMeals: { title: string; cal: number; prot: number; carb: number; fat: number }[];
  activeMeal: Meal;
  bodyHistory: { labels: string[] } & Record<BodyMetric, number[]>;
  weeklyConsistency: { day: string; pct: number }[];
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
  consumedCalories: 943,
  consumedProtein: 138,
  fastingProtocol: '16:8',
  fastingSecondsLeft: 14 * 3600 + 22 * 60 + 9,
  beaconFastingStatus: 'IF 16:8 (Fasted Cardio)',
  aiText:
    'Volume Push Day kamu naik <strong>+8.4%</strong> minggu ini dengan asupan protein <strong>92% terpenuhi (138g/150g)</strong>. Lingkar pinggang turun <strong>-1.8 cm</strong> dalam 14 hari terakhir (indikasi <em>body recomposition</em> positif). Kamu siap mengejar PB Lari 5K di pace <strong>5\'10"/km</strong> sore ini!',

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

  gymSets: [
    { id: 1, name: 'Incline Dumbbell Press', weight: 32, reps: 10, sets: 4, done: true, isPr: true },
    { id: 2, name: 'Barbell Bench Press', weight: 80, reps: 8, sets: 4, done: true, isPr: true },
    { id: 3, name: 'Cable Lateral Raises', weight: 14, reps: 15, sets: 4, done: true, isPr: false },
    { id: 4, name: 'Tricep Rope Pushdown', weight: 28, reps: 12, sets: 3, done: true, isPr: false },
  ],

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

  segments: [
    { name: 'Tanjakan Sianok Sprint (Road)', dist: '1.8 km • Grade 6.4%', kom: '4:12 (KOM)', userBest: '4:19 (Rank #2)', legendCount: 14, isLegend: true, type: 'road' },
    { name: 'Loop Lapangan Kantin 5K Fast', dist: '5.0 km • Flat 0.8%', kom: '19:45 (KOM)', userBest: '21:10 (Top 5%)', legendCount: 22, isLegend: true, type: 'road' },
    { name: 'Gym Iron Legend: Bench Press Ratio', dist: 'Relative Strength (1RM / BW)', kom: '1.48x BW', userBest: '1.41x BW (101.3 kg)', legendCount: 18, isLegend: true, type: 'gym' },
  ],

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

  bodyHistory: {
    labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'Now'],
    weight: [74.5, 73.9, 73.2, 72.8, 72.4, 72.0],
    waist: [81.7, 81.0, 80.2, 79.5, 79.0, 78.5],
    thigh: [54.5, 54.8, 55.2, 55.5, 55.8, 56.0],
    arm: [35.2, 35.5, 35.8, 36.0, 36.2, 36.5],
    chest: [99.0, 99.5, 100.0, 100.4, 100.8, 101.0],
  },

  weeklyConsistency: [
    { day: 'MON', pct: 100 },
    { day: 'TUE', pct: 85 },
    { day: 'WED', pct: 100 },
    { day: 'THU', pct: 92 },
    { day: 'FRI', pct: 100 },
    { day: 'SAT', pct: 78 },
    { day: 'SUN', pct: 95 },
  ],

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
  },
};

export const SPLIT_DESC: Record<string, { title: string; meta: string; muscles: string[] }> = {
  Push: { title: 'Push Day (Hypertrophy)', meta: '620 kcal • Chest, Shoulders, Triceps', muscles: ['muscle-shoulders-l', 'muscle-shoulders-r', 'muscle-chest-l', 'muscle-chest-r', 'muscle-arms-l', 'muscle-arms-r'] },
  Pull: { title: 'Pull Day (V-Taper Back)', meta: '590 kcal • Lats, Traps, Rear Delt, Biceps', muscles: ['muscle-shoulders-l', 'muscle-shoulders-r', 'muscle-arms-l', 'muscle-arms-r', 'muscle-abs'] },
  Legs: { title: 'Leg Day (Quad & Glute)', meta: '710 kcal • Quads, Hamstrings, Calves', muscles: ['muscle-legs-l', 'muscle-legs-r', 'muscle-calves-l', 'muscle-calves-r', 'muscle-abs'] },
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

export const gymTotalVolume = (sets: GymSet[]) => sets.reduce((acc, s) => (s.done ? acc + s.weight * s.reps * s.sets : acc), 0);
export const gymCompletedSets = (sets: GymSet[]) => sets.reduce((acc, s) => (s.done ? acc + s.sets : acc), 0);
export const gymPrCount = (sets: GymSet[]) => sets.filter((s) => s.done && s.isPr).length;
