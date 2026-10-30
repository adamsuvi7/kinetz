'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { initialState, type AppState, type StudioTemplate, type Tab, type WorkoutSub } from '@/lib/fitsync';
import { toJpegDataUrl } from '@/lib/image';
import { loadState, saveState } from '@/lib/persist';

export type CameraMode = 'studio' | 'food';

type AppCtx = {
  s: AppState;
  set: (fn: (prev: AppState) => AppState) => void;
  toast: (msg: string) => void;
  switchTab: (tab: Tab) => void;
  switchWorkoutSub: (sub: WorkoutSub) => void;
  exportToStudio: (tpl: StudioTemplate) => void;
  setBgImage: (img: HTMLImageElement, msg: string) => void;
  analyzeFood: (src: HTMLImageElement | HTMLCanvasElement) => Promise<void>;
  camera: CameraMode | null;
  openCamera: (mode?: CameraMode) => void;
  closeCamera: () => void;
  beaconOpen: boolean;
  setBeaconOpen: (open: boolean) => void;
};

const Ctx = createContext<AppCtx | null>(null);

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [s, set] = useState<AppState>(initialState);
  const [toastMsg, setToastMsg] = useState('Tersimpan!');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const [camera, setCamera] = useState<CameraMode | null>(null);
  const [beaconOpen, setBeaconOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadState()
      .then(set)
      .catch((e) => console.warn('FitSync: saved data unavailable, using defaults', e))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => saveState(s).catch((e) => console.warn('FitSync: save failed', e)), 300);
    return () => clearTimeout(t);
  }, [s, loaded]);

  useEffect(() => {
    const cl = document.documentElement.classList;
    cl.toggle('theme-light', s.theme === 'light');
    cl.toggle('theme-dark', s.theme === 'dark');
  }, [s.theme]);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2400);
  }, []);

  const switchTab = useCallback((tab: Tab) => {
    set((p) => ({ ...p, activeTab: tab }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const switchWorkoutSub = useCallback((sub: WorkoutSub) => set((p) => ({ ...p, activeWorkoutSub: sub })), []);

  const exportToStudio = useCallback(
    (tpl: StudioTemplate) => {
      switchTab('studio');
      set((p) => ({ ...p, studio: { ...p.studio, template: tpl } }));
      toast('Kartu IG Story 9:16 siap dibagikan!');
    },
    [switchTab, toast],
  );

  const setBgImage = useCallback(
    (img: HTMLImageElement, msg: string) => {
      set((p) => ({ ...p, studio: { ...p.studio, bgImage: img } }));
      switchTab('studio');
      toast(msg);
    },
    [switchTab, toast],
  );

  const analyzeFood = useCallback(
    async (src: HTMLImageElement | HTMLCanvasElement) => {
      switchTab('nutrition');
      toast('AI Vision sedang menganalisis foto makanan...');
      try {
        const res = await fetch('/api/analyze-food', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: toJpegDataUrl(src) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        set((p) => ({
          ...p,
          activeMeal: {
            title: data.title,
            baseCal: data.calories,
            baseProt: data.protein,
            baseCarb: data.carbs,
            baseFat: data.fat,
            scale: 1,
            note: `Confidence AI: ${data.confidence}% • ${data.items.join(', ')}`,
          },
        }));
        toast(`AI Vision berhasil memindai: ${data.title}`);
      } catch (e) {
        toast(`AI Vision gagal: ${e instanceof Error ? e.message : 'coba lagi'}`);
      }
    },
    [switchTab, toast],
  );

  const openCamera = useCallback((mode: CameraMode = 'studio') => setCamera(mode), []);
  const closeCamera = useCallback(() => setCamera(null), []);

  return (
    <Ctx.Provider
      value={{ s, set, toast, switchTab, switchWorkoutSub, exportToStudio, setBgImage, analyzeFood, camera, openCamera, closeCamera, beaconOpen, setBeaconOpen }}
    >
      {/* Mount after IndexedDB load so tab-local inputs initialise from saved data, not defaults. */}
      {loaded && children}
      {/* TOAST NOTIFICATION */}
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#C8F526] text-[#0E110F] text-xs font-extrabold shadow-2xl pointer-events-none transition-opacity duration-300"
        style={{ opacity: toastVisible ? 1 : 0 }}
      >
        {toastMsg}
      </div>
    </Ctx.Provider>
  );
}
