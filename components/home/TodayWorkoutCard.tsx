'use client';

import { SPLIT_DESC, gymCompletedSets, gymPrCount } from '@/lib/fitsync';
import { useApp } from '../AppProvider';

export default function TodayWorkoutCard() {
  const { s, set, switchTab } = useApp();
  const cfg = SPLIT_DESC[s.currentSplit] || SPLIT_DESC.Push;
  const m = (id: string) => `muscle-part${cfg.muscles.includes(id) ? ' muscle-active' : ''}`;
  const selectSplit = (split: string) => set((p) => ({ ...p, currentSplit: split }));

  return (
    <div className="surface-card p-4 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] uppercase font-bold tracking-wider opacity-60">Today&apos;s Workout</span>
          <h3 className="text-lg font-extrabold mt-0.5">{cfg.title}</h3>
          <p className="text-xs text-[#C8F526] font-semibold">{cfg.meta}</p>
        </div>
        <div className="flex gap-1">
          {['Push', 'Pull', 'Legs'].map((sp) => (
            <button key={sp} onClick={() => selectSplit(sp)} className="px-2 py-1 rounded-lg text-[10px] font-bold surface-card-alt">
              {sp}
            </button>
          ))}
        </div>
      </div>

      {/* Anatomical Body SVG + Floating Pills */}
      <div className="relative flex items-center justify-center py-4 min-h-[220px]">
        <div className="absolute left-1 top-1/2 -translate-y-1/2 surface-card-alt px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-lg">
          <span className="w-2 h-2 rounded-full bg-[#C8F526]"></span>
          <span>55 Min</span>
        </div>

        <svg viewBox="0 0 200 240" className="w-44 h-52">
          {/* Head & Neck */}
          <circle cx="100" cy="26" r="16" fill="#2B332E" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          <rect x="93" y="42" width="14" height="10" rx="4" fill="#2B332E" />
          {/* Shoulders (Delts) */}
          <path className={m('muscle-shoulders-l')} d="M62 54 Q75 46 86 54 L84 78 Q66 76 60 66 Z" fill="#39443D" />
          <path className={m('muscle-shoulders-r')} d="M138 54 Q125 46 114 54 L116 78 Q134 76 140 66 Z" fill="#39443D" />
          {/* Chest (Pecs) */}
          <path className={m('muscle-chest-l')} d="M76 54 L99 54 L99 84 Q82 86 75 74 Z" fill="#39443D" />
          <path className={m('muscle-chest-r')} d="M101 54 L124 54 L125 74 Q118 86 101 84 Z" fill="#39443D" />
          {/* Core / Abs */}
          <rect className={m('muscle-abs')} x="82" y="86" width="36" height="46" rx="8" fill="#333D37" />
          {/* Arms (Biceps / Triceps) */}
          <rect className={m('muscle-arms-l')} x="52" y="76" width="16" height="48" rx="8" fill="#333D37" />
          <rect className={m('muscle-arms-r')} x="132" y="76" width="16" height="48" rx="8" fill="#333D37" />
          {/* Quads / Legs */}
          <path className={m('muscle-legs-l')} d="M78 135 L98 135 L95 205 L76 205 Z" fill="#2E3832" />
          <path className={m('muscle-legs-r')} d="M102 135 L122 135 L124 205 L105 205 Z" fill="#2E3832" />
          {/* Calves */}
          <rect className={m('muscle-calves-l')} x="78" y="208" width="15" height="26" rx="6" fill="#28302B" />
          <rect className={m('muscle-calves-r')} x="107" y="208" width="15" height="26" rx="6" fill="#28302B" />
        </svg>

        <div className="absolute right-1 top-2/3 surface-card-alt px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-lg">
          <span className="w-2 h-2 rounded-full bg-[#C8F526]"></span>
          <span>{`${gymCompletedSets(s.gymSets)} Sets • ${gymPrCount(s.gymSets)} PR`}</span>
        </div>

        <button
          onClick={() => switchTab('workout')}
          className="lime-btn w-11 h-11 rounded-2xl absolute bottom-1 right-1 flex items-center justify-center text-lg shadow-lg"
          title="Mulai Latihan"
        >
          ✦
        </button>
      </div>
    </div>
  );
}
