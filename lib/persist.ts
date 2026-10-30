// Offline-first persistence: user-editable slices of AppState in one IndexedDB record.
// Static catalogs (exercise lists, sports, segments...) stay in code so updates ship without migrations.
import { initialState, type AppState } from './state';

const DB_NAME = 'kinetz';
const STORE = 'kv';
const KEY = 'appState';
const VERSION = 1; // bump when a persisted field changes shape; older records are then ignored

const PERSISTED = [
  'theme', 'heartRate', 'bleBadgeHr', 'consumedCalories', 'consumedProtein', 'tdee', 'bmr', 'targetProtein',
  'tdeeInputs', 'fastingProtocol', 'fastingSecondsLeft', 'beaconFastingStatus', 'aiText', 'weeklySchedule',
  'currentSplit', 'gymSets', 'runData', 'selectedMultiSportIndex', 'multiDurationMin', 'socialFeed',
  'activeMeal', 'bodyHistory', 'studio', 'activeRide',
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
  return { ...initialState, ...picked, studio: { ...initialState.studio, ...saved.studio, bgImage: null } };
}

export async function loadState(): Promise<AppState> {
  const [saved, rides] = await Promise.all([run('readonly', (st) => st.get(KEY)), run('readonly', (st) => st.get(RIDES_KEY))]);
  return { ...fromSaved(saved), rides: Array.isArray(rides) ? rides : [] };
}
export const saveState = (s: AppState) => run('readwrite', (st) => st.put(toSaved(s), KEY));
export const saveRides = (rides: AppState['rides']) => run('readwrite', (st) => st.put(rides, RIDES_KEY));
