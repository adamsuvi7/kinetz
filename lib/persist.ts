// Offline-first persistence: user-editable slices of AppState in one IndexedDB record.
// Static catalogs (exercise lists, sports, segments...) stay in code so updates ship without migrations.
import { initialState, todayKey, type AppState, type BodyMetric, type GymExercise } from './state';

const DB_NAME = 'kinetz';
const STORE = 'kv';
const KEY = 'appState';
const VERSION = 1; // bump when a persisted field changes shape; older records are then ignored

const PERSISTED = [
  'theme', 'heartRate', 'bleBadgeHr', 'tdee', 'bmr', 'targetProtein', 'dietLog', 'bodyLog', 'goalWeight',
  'tdeeInputs', 'fastingProtocol', 'fastingSecondsLeft', 'beaconFastingStatus', 'weeklySchedule',
  'currentSplit', 'gymSets', 'gymBests', 'gymLog', 'musclesBySplit', 'runData', 'selectedMultiSportIndex', 'multiDurationMin', 'socialFeed',
  'activeMeal', 'studio', 'activeRide',
] as const satisfies readonly (keyof AppState)[];
// Finished rides hold every GPS fix, so they live under their own key and are written only when they change.
const RIDES_KEY = 'rides';

type Saved = Pick<AppState, (typeof PERSISTED)[number]> & { v: number };

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const req = op(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function toSaved(s: AppState): Saved {
  const picked = Object.fromEntries(PERSISTED.map((k) => [k, s[k]])) as Pick<AppState, (typeof PERSISTED)[number]>;
  return {
    ...picked,
    v: VERSION,
    runData: { ...s.runData, runningLive: false },
    studio: { ...s.studio, bgImage: null }, // HTMLImageElement can't be stored
  };
}

export function fromSaved(raw: unknown): AppState {
  const saved = raw as Partial<Saved> | undefined;
  if (!saved || saved.v !== VERSION) return initialState;
  const picked = Object.fromEntries(PERSISTED.filter((k) => k in saved).map((k) => [k, saved[k]]));
  return { ...initialState, ...picked, ...migrate(saved), studio: { ...initialState.studio, ...saved.studio, bgImage: null } };
}

type OldGymSet = { id: number; name: string; weight: number; reps: number; sets: number; done: boolean };
type OldBody = Record<BodyMetric, number[]>;

/** Upgrades records saved by older builds in place of a version bump, so nobody loses data. */
function migrate(saved: Record<string, unknown>): Partial<AppState> {
  const out: Partial<AppState> = {};
  const gym = saved.gymSets as (GymExercise | OldGymSet)[] | undefined;
  // Old: one weight/reps for N identical sets. New: each set has its own kg/reps.
  if (gym?.some((g) => 'weight' in g)) {
    out.gymSets = gym.map((g) =>
      'weight' in g ? { id: g.id, name: g.name, sets: Array.from({ length: g.sets }, () => ({ kg: g.weight, reps: g.reps, done: g.done })) } : g,
    );
  }
  // Old builds kept a fixed W1..Now demo curve; only the latest values may be real, so keep just those.
  const body = saved.bodyHistory as OldBody | undefined;
  const latest = (k: BodyMetric) => body![k][body![k].length - 1];
  // Untouched demo values (72 kg, 78.5 cm waist…) were never measured by the user: start empty instead.
  const isDemo = body && latest('weight') === 72 && latest('waist') === 78.5 && latest('thigh') === 56 && latest('arm') === 36.5 && latest('chest') === 101;
  if (body && !saved.bodyLog && !isDemo) {
    out.bodyLog = [{ date: todayKey(), weight: latest('weight'), waist: latest('waist'), thigh: latest('thigh'), arm: latest('arm'), chest: latest('chest') }];
  }
  return out;
}

export async function loadState(): Promise<AppState> {
  const [saved, rides] = await Promise.all([run('readonly', (st) => st.get(KEY)), run('readonly', (st) => st.get(RIDES_KEY))]);
  return { ...fromSaved(saved), rides: Array.isArray(rides) ? rides : [] };
}
export const saveState = (s: AppState) => run('readwrite', (st) => st.put(toSaved(s), KEY));
export const saveRides = (rides: AppState['rides']) => run('readwrite', (st) => st.put(rides, RIDES_KEY));
