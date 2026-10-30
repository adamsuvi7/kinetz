'use client';

import { useEffect, useState } from 'react';
import { useApp } from '../AppProvider';

const HOURS: Record<string, number> = { '16:8': 16, '18:6': 18, '20:4': 20, '23:1': 23 };

const TICKS = Array.from({ length: 25 }, (_, i) => {
  const angle = Math.PI + (i / 24) * Math.PI;
  return {
    x1: (120 + Math.cos(angle) * 76).toFixed(1),
    y1: (110 + Math.sin(angle) * 76).toFixed(1),
    x2: (120 + Math.cos(angle) * 84).toFixed(1),
    y2: (110 + Math.sin(angle) * 84).toFixed(1),
  };
});

// Own state so the 1s tick re-renders only this <text>, not the whole app (and the 1080x1920 canvas).
function Countdown({ initial }: { initial: number }) {
  const [secs, setSecs] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => setSecs((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <text x="120" y="112" textAnchor="middle" fill="#8E9B93" className="font-display text-xs">
      {`${pad(Math.floor(secs / 3600))}:${pad(Math.floor((secs % 3600) / 60))}:${pad(secs % 60)}`}
    </text>
  );
}

export default function FastingGauge() {
  const { s, set, toast } = useApp();

  const changeFastingProtocol = (proto: string) => {
    const h = HOURS[proto] || 16;
    set((p) => ({
      ...p,
      fastingProtocol: proto,
      fastingSecondsLeft: (h - 2) * 3600 + 15 * 60,
      beaconFastingStatus: `Protokol ${proto} Aktif`,
    }));
    toast(`Protokol diet diubah ke ${proto}`);
  };

  const selectScheduleDay = (idx: number) => {
    const chosen = s.weeklySchedule[idx].label;
    set((p) => ({
      ...p,
      weeklySchedule: p.weeklySchedule.map((d, i) => ({ ...d, active: i === idx })),
      currentSplit: ['Push', 'Pull', 'Legs'].includes(chosen) ? chosen : p.currentSplit,
    }));
  };

  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold">Training Schedule & IF Window</h3>
          <p className="text-[11px] opacity-65">Jadwal Latihan & Protokol Puasa Interaktif</p>
        </div>
        <select
          value={s.fastingProtocol}
          onChange={(e) => changeFastingProtocol(e.target.value)}
          className="surface-card-alt text-[11px] font-bold px-2.5 py-1.5 rounded-lg outline-none"
        >
          <option value="16:8">IF 16:8 (Lean Cut)</option>
          <option value="18:6">IF 18:6 (Fat Burn)</option>
          <option value="20:4">IF 20:4 (Warrior)</option>
          <option value="23:1">OMAD 23:1</option>
        </select>
      </div>

      {/* Semi-Circle Gauge SVG */}
      <div className="flex flex-col items-center justify-center my-1">
        <svg viewBox="0 0 240 125" className="w-60 h-32">
          <g stroke="currentColor" className="opacity-25">
            {TICKS.map((t, i) => (
              <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} strokeWidth="1.5" />
            ))}
          </g>
          <path d="M 25 110 A 95 95 0 0 1 215 110" fill="none" stroke="rgba(142,155,147,0.15)" strokeWidth="10" strokeLinecap="round" />
          <path d="M 25 110 A 95 95 0 0 1 185 45" fill="none" stroke="#C8F526" strokeWidth="10" strokeLinecap="round" />
          <line x1="120" y1="62" x2="120" y2="22" stroke="#C8F526" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="120" cy="62" r="4" fill="#C8F526" />
          <text x="120" y="92" textAnchor="middle" fill="currentColor" className="font-display font-bold text-xl">
            6:00 PM
          </text>
          <Countdown key={s.fastingProtocol} initial={s.fastingSecondsLeft} />
        </svg>
      </div>

      {/* Weekly Schedule Selector Pill Bar */}
      <div className="grid grid-cols-7 gap-1.5 mt-2">
        {s.weeklySchedule.map((d, i) => (
          <button key={d.day} onClick={() => selectScheduleDay(i)} className={`p-1.5 rounded-xl text-center transition ${d.active ? 'lime-btn' : 'surface-card-alt'}`}>
            <div className="text-[10px] opacity-75">{d.day}</div>
            <div className="text-[10px] font-extrabold truncate">{d.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
