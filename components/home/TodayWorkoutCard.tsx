'use client';

import { useState } from 'react';
import { SPLIT_DESC, gymCompletedSets, gymPrCount, muscles, type MuscleGroup } from '@/lib/state';
import { useApp } from '../AppProvider';

const CHIPS: { id: MuscleGroup; label: string }[] = [
  { id: 'bahu', label: 'Bahu' },
  { id: 'dada', label: 'Dada' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'punggung', label: 'Punggung' },
  { id: 'perut', label: 'Perut' },
  { id: 'kaki', label: 'Kaki' },
  { id: 'leher', label: 'Leher' },
];

// Right half of the figure (viewBox 200×400, centre x=100); the left half is the same shapes mirrored.
// Each muscle shape names the chip it belongs to; `null` = shown but never highlighted.
type Shape = { d: string; m: MuscleGroup | null };
const FRONT: Shape[] = [
  { d: 'M101 52 L111 54 L113 68 L104 72 L101 70 Z', m: 'leher' },
  { d: 'M112 60 Q122 66 134 70 L120 78 L111 72 Z', m: 'leher' },
  { d: 'M134 70 Q151 73 155 94 Q153 106 145 112 Q137 96 126 84 L121 78 Z', m: 'bahu' },
  { d: 'M101 76 L121 79 Q137 90 136 106 Q120 118 101 113 Z', m: 'dada' },
  { d: 'M144 113 Q156 120 156 140 Q152 156 143 160 Q135 145 137 124 Z', m: 'biceps' },
  { d: 'M143 163 Q157 170 159 196 Q155 213 149 222 L141 221 Q136 197 138 172 Z', m: null },
  { d: 'M101 117 L111 117 L111 131 L101 131 Z M101 134 L111 134 L111 148 L101 148 Z M101 151 L111 151 L111 165 L101 165 Z M101 168 L109 168 L105 192 L101 192 Z', m: 'perut' },
  { d: 'M114 117 Q131 120 133 142 Q131 168 118 186 L114 168 Z', m: 'perut' },
  { d: 'M103 198 Q122 193 135 203 Q139 240 131 282 Q121 292 109 287 Q101 250 103 198 Z', m: 'kaki' },
  { d: 'M108 306 Q124 300 130 318 Q132 350 124 372 L114 372 Q106 344 108 306 Z', m: 'kaki' },
];
const BACK: Shape[] = [
  { d: 'M101 50 L112 56 L135 71 L118 92 L101 108 Z', m: 'punggung' },
  { d: 'M135 71 Q152 74 155 95 Q153 106 145 112 Q137 98 127 88 Z', m: 'bahu' },
  { d: 'M142 112 Q156 120 154 146 Q148 160 139 158 Q134 134 137 118 Z', m: 'triceps' },
  { d: 'M143 163 Q157 170 159 196 Q155 213 149 222 L141 221 Q136 197 138 172 Z', m: null },
  { d: 'M119 94 L133 100 Q137 130 125 160 L104 166 L104 116 Z', m: 'punggung' },
  { d: 'M101 152 L115 154 L115 186 L101 190 Z', m: 'punggung' },
  { d: 'M101 192 Q126 187 133 205 Q131 229 111 233 Q101 225 101 192 Z', m: 'kaki' },
  { d: 'M104 238 Q124 233 133 247 Q135 275 127 291 L111 291 Q104 265 104 238 Z', m: 'kaki' },
  { d: 'M108 304 Q128 298 132 322 Q130 346 120 357 L112 357 Q104 330 108 304 Z', m: 'kaki' },
];
const SILHOUETTE =
  'M100 50 L112 52 Q118 64 134 69 Q157 74 160 100 L162 160 Q166 200 162 226 L154 248 Q148 250 142 240 Q139 200 137 172 L135 196 Q141 250 133 300 Q138 340 129 376 Q132 394 118 394 L105 392 Q103 340 104 300 L102 210 L100 210 Z';

function Figure({ shapes, active }: { shapes: Shape[]; active: Set<MuscleGroup> }) {
  const half = (
    <>
      <path d={SILHOUETTE} fill="#262B29" />
      {shapes.map((sh) => {
        const on = sh.m != null && active.has(sh.m);
        return (
          <path
            key={sh.d}
            d={sh.d}
            fill={on ? '#8BEA3B' : '#454C48'}
            stroke={on ? '#D4FF9E' : '#5A625D'}
            strokeOpacity={on ? 0.8 : 0.5}
            strokeWidth={on ? 1.4 : 0.8}
            className="transition-colors duration-300"
          />
        );
      })}
    </>
  );
  return (
    <svg viewBox="0 0 200 400" className="h-72 w-auto" role="img" aria-label="Peta otot">
      <defs>
        <filter id="muscle-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <ellipse cx="100" cy="30" rx="17" ry="21" fill="#2F3532" />
      <g filter="url(#muscle-glow)">
        {half}
        <g transform="translate(200,0) scale(-1,1)">{half}</g>
      </g>
      <ellipse cx="148" cy="236" rx="7" ry="12" fill="#2F3532" />
      <ellipse cx="52" cy="236" rx="7" ry="12" fill="#2F3532" />
    </svg>
  );
}

export default function TodayWorkoutCard() {
  const { s, set, switchTab } = useApp();
  const [side, setSide] = useState<'front' | 'back'>('front');
  const cfg = SPLIT_DESC[s.currentSplit] ?? SPLIT_DESC.Push;
  const active = new Set(muscles(s));

  const toggle = (m: MuscleGroup) =>
    set((p) => {
      const cur = muscles(p);
      const next = cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m];
      return { ...p, musclesBySplit: { ...p.musclesBySplit, [p.currentSplit]: next } };
    });

  return (
    <div className="surface-card p-4 relative overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[11px] uppercase font-bold tracking-wider opacity-60">Latihan Hari Ini</span>
          <h3 className="text-lg font-extrabold mt-0.5">{cfg.title}</h3>
          <p className="text-[11px] opacity-65">Pilih otot target</p>
        </div>
        <div className="flex p-0.5 rounded-xl surface-card-alt text-[11px] font-bold">
          {(['front', 'back'] as const).map((v) => (
            <button key={v} onClick={() => setSide(v)} className={`px-2.5 py-1 rounded-lg ${side === v ? 'lime-btn' : 'opacity-70'}`}>
              {v === 'front' ? 'Depan' : 'Belakang'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-3 items-center">
        <div className="flex flex-col gap-1.5 shrink-0">
          {CHIPS.map(({ id, label }) => {
            const on = active.has(id);
            return (
              <button
                key={id}
                onClick={() => toggle(id)}
                aria-pressed={on}
                className={`flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full border text-[11px] font-bold transition ${
                  on ? 'border-[#8BEA3B] text-[color:var(--text-main)]' : 'border-[color:var(--border-col)] opacity-60'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${on ? 'bg-[#8BEA3B] text-[#0E110F]' : 'border border-current'}`}>
                  {on ? '✓' : ''}
                </span>
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex-1 flex justify-center">
          <Figure shapes={side === 'front' ? FRONT : BACK} active={active} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[color:var(--border-col)]">
        <span className="text-xs font-bold">{`${gymCompletedSets(s.gymSets)} set selesai • ${gymPrCount(s.gymSets, s.gymBests)} PR`}</span>
        <button onClick={() => switchTab('workout')} className="lime-btn px-4 py-2 rounded-xl text-xs">
          Mulai Latihan ✦
        </button>
      </div>
    </div>
  );
}
