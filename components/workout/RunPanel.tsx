'use client';

import { useEffect, useRef, useState } from 'react';
import { computePaceString, computeRiegelTime, formatDurationMMSS, riegelSeconds } from '@/lib/state';
import { renderRunRouteCanvas } from '@/lib/canvas';
import { useApp } from '../AppProvider';

const PRESETS: Record<string, { title: string; distanceKm: number; movingSeconds: number; cadence: number }> = {
  morning: { title: 'Morning 5K Tempo Run', distanceKm: 5.24, movingSeconds: 1646, cadence: 176 },
  tempo: { title: 'Tempo Threshold 8K', distanceKm: 8.1, movingSeconds: 2490, cadence: 180 },
  interval: { title: 'Track Interval 400m x 10', distanceKm: 4.5, movingSeconds: 1290, cadence: 186 },
  long: { title: 'Sunday Long Run 15K', distanceKm: 15.2, movingSeconds: 5120, cadence: 172 },
};

const RACES = [
  { label: '5K Road Race', km: 5 },
  { label: '10K Race', km: 10 },
  { label: 'Half Marathon (21.1K)', km: 21.0975 },
  { label: 'Full Marathon (42.2K)', km: 42.195 },
];

export default function RunPanel() {
  const { s, set, toast, exportToStudio } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [preset, setPreset] = useState(() => Object.keys(PRESETS).find((k) => PRESETS[k].title === s.runData.title) || 'morning');
  const [started, setStarted] = useState(false);
  const d = s.runData;
  const live = d.runningLive;

  // Static map; draw once web fonts are in so the KM labels use Plus Jakarta Sans.
  useEffect(() => {
    document.fonts.ready.then(() => canvasRef.current && renderRunRouteCanvas(canvasRef.current));
  }, []);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      set((p) => ({
        ...p,
        runData: { ...p.runData, movingSeconds: p.runData.movingSeconds + 1, distanceKm: +(p.runData.distanceKm + 0.004).toFixed(2) },
      }));
    }, 1000);
    return () => clearInterval(id);
  }, [live, set]);

  const changeRunPreset = (key: string) => {
    const cfg = PRESETS[key] || PRESETS.morning;
    setPreset(key);
    set((p) => ({ ...p, runData: { ...p.runData, ...cfg } }));
    toast(`Preset lari diubah ke ${cfg.title}`);
  };

  const toggleRunLiveTimer = () => {
    setStarted(true);
    set((p) => ({ ...p, runData: { ...p.runData, runningLive: !p.runData.runningLive } }));
  };

  return (
    <>
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">GPS ENGINE</span>
            <h2 className="text-base font-extrabold mt-1">Pelacak Lari & Peta 3D</h2>
          </div>
          <select value={preset} onChange={(e) => changeRunPreset(e.target.value)} className="surface-card-alt text-xs font-bold px-2.5 py-1.5 rounded-xl outline-none">
            <option value="morning">Morning 5K Run</option>
            <option value="tempo">Tempo Threshold 8K</option>
            <option value="interval">Track Interval 400m</option>
            <option value="long">Sunday Long Run 15K</option>
          </select>
        </div>

        {/* Interactive 3D-Style Route & Elevation Grade Canvas */}
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0B100D]">
          <canvas ref={canvasRef} width={440} height={230} className="w-full h-48 block"></canvas>
          <div className="absolute top-2.5 left-2.5 flex gap-1.5">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 text-[#C8F526] backdrop-blur">🛰️ GPS Lock: Akurat 3m</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 text-white backdrop-blur">Elev: +118m (Grade 4.2%)</span>
          </div>
        </div>

        {/* 4 Core Run Telemetry Boxes */}
        <div className="grid grid-cols-4 gap-2 my-3 text-center">
          <div className="surface-card-alt p-2.5">
            <div className="font-display font-bold text-base text-[#C8F526]">{d.distanceKm.toFixed(2)}</div>
            <div className="text-[10px] opacity-65">Jarak (KM)</div>
          </div>
          <div className="surface-card-alt p-2.5">
            <div className="font-display font-bold text-base">{computePaceString(d.distanceKm, d.movingSeconds)}</div>
            <div className="text-[10px] opacity-65">Avg Pace /km</div>
          </div>
          <div className="surface-card-alt p-2.5">
            <div className="font-display font-bold text-base">{formatDurationMMSS(d.movingSeconds)}</div>
            <div className="text-[10px] opacity-65">Moving Time</div>
          </div>
          <div className="surface-card-alt p-2.5">
            <div className="font-display font-bold text-base text-emerald-400">{d.cadence}</div>
            <div className="text-[10px] opacity-65">Cadence spm</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={toggleRunLiveTimer} className="flex-1 py-2.5 rounded-xl text-xs lime-btn">
            {live ? '⏸ Jeda Live GPS Run' : started ? '▶ Lanjutkan Live GPS Run' : '▶ Mulai Live GPS Run'}
          </button>
          <button
            onClick={() => exportToStudio('run')}
            className="px-4 py-2.5 rounded-xl text-xs surface-card-alt font-bold border border-[#C8F526]/40 text-[#C8F526]"
          >
            Share Story
          </button>
        </div>
      </div>

      {/* Splits per KM Table */}
      <div className="surface-card p-4">
        <h3 className="text-sm font-bold mb-2">📊 Splits per Kilometer & Grade</h3>
        <div className="space-y-2 text-xs">
          {d.splits.map((sp) => (
            <div key={sp.km} className="surface-card-alt px-3 py-2 flex items-center justify-between">
              <span className="font-bold">KM {sp.km}</span>
              <span className="font-display font-bold text-[#C8F526]">{sp.pace} /km</span>
              <span className="opacity-75">Elev {sp.elev}</span>
              <span className="text-emerald-400 font-semibold">♥ {sp.hr} bpm</span>
            </div>
          ))}
        </div>
      </div>

      {/* Race Predictor (Riegel Formula) */}
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-bold">🏁 Prediksi Waktu Finis Lomba (Race Predictor)</h3>
            <p className="text-[11px] opacity-65">Dihitung otomatis dari performa lari kamu (Riegel Formula)</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 mt-2">
          {RACES.map((r) => (
            <div key={r.label} className="surface-card-alt p-3">
              <div className="text-[10px] opacity-65">{r.label}</div>
              <div className="font-display font-bold text-base text-[#C8F526] mt-0.5">{computeRiegelTime(d, r.km)}</div>
              <div className="text-[10px] opacity-75">Est. Pace: {computePaceString(r.km, riegelSeconds(d, r.km))}/km</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
