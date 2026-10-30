'use client';

import { useApp } from './AppProvider';

export default function Header() {
  const { s, set, toast, openCamera, setBeaconOpen } = useApp();

  const toggleBleHr = () => {
    const hr = s.heartRate === 142 ? 156 : 142;
    set((p) => ({ ...p, heartRate: hr, bleBadgeHr: hr }));
    toast(`Sensor detak jantung disinkronkan: ${hr} bpm`);
  };

  return (
    <header className="flex items-center justify-between py-2 mb-3">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#438257] to-[#C8F526] p-0.5">
            <div className="w-full h-full rounded-full bg-[#161B18] flex items-center justify-center font-display font-bold text-sm text-[#C8F526]">
              AS
            </div>
          </div>
          <span
            className="w-3 h-3 rounded-full bg-[#C8F526] border-2 border-[#0E110F] absolute -bottom-0.5 -right-0.5"
            title="Offline-First IndexedDB Ready"
          ></span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium opacity-75">Keep Moving Today! 💪</span>
            <span
              onClick={toggleBleHr}
              className="cursor-pointer text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30"
            >
              ♥ BLE {s.bleBadgeHr} bpm
            </span>
          </div>
          <h1 className="text-base font-extrabold tracking-tight leading-tight">Hi, Athlete FitSync</h1>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Beacon SafeLink Trigger */}
        <button
          onClick={() => setBeaconOpen(true)}
          className="p-2 rounded-full surface-card-alt text-xs font-bold flex items-center gap-1"
          title="Strava Beacon SafeLink"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 beacon-dot"></span>
          <span className="hidden sm:inline text-[11px]">Beacon</span>
        </button>
        {/* Live Camera Trigger */}
        <button onClick={() => openCamera()} className="p-2 rounded-full surface-card-alt text-xs font-bold" title="Kamera IG Story & AI Food">
          📷
        </button>
        {/* Theme Switcher */}
        <button
          onClick={() => set((p) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }))}
          className="px-2.5 py-2 rounded-full surface-card-alt text-[11px] font-bold"
        >
          {s.theme === 'dark' ? '☀️ Sage' : '🌙 Obsidian'}
        </button>
      </div>
    </header>
  );
}
