'use client';

import { useRef } from 'react';
import { formatNumberID, gymCompletedSets, gymPrCount, gymTotalVolume, last, type GymSet } from '@/lib/fitsync';
import { useApp } from '../AppProvider';

type Field = 'sets' | 'weight' | 'reps';

export default function GymPanel() {
  const { s, set, toast, exportToStudio } = useApp();
  const pickerRef = useRef<HTMLSelectElement>(null);
  const splits = Object.keys(s.gymExercisesBySplit);
  const exercises = s.gymExercisesBySplit[s.currentSplit] || [];
  const currentBW = last(s.bodyHistory.weight) || 72;

  const patchSet = (idx: number, patch: (g: GymSet) => GymSet) =>
    set((p) => ({ ...p, gymSets: p.gymSets.map((g, i) => (i === idx ? patch(g) : g)) }));

  const updateGymSetField = (idx: number, field: Field, val: string) => {
    const num = Math.max(1, parseFloat(val) || 1);
    patchSet(idx, (g) => ({ ...g, [field]: num, isPr: g.isPr || (field === 'weight' && num >= 30) }));
  };

  const removeGymSetRow = (idx: number) => {
    if (s.gymSets.length <= 1) return;
    set((p) => ({ ...p, gymSets: p.gymSets.filter((_, i) => i !== idx) }));
  };

  const addGymSetRow = () => {
    const exName = pickerRef.current?.value || 'Incline Dumbbell Press';
    const id = Date.now();
    set((p) => ({ ...p, gymSets: [...p.gymSets, { id, name: exName, weight: 30, reps: 10, sets: 3, done: true, isPr: true }] }));
    toast(`${exName} ditambahkan!`);
  };

  // Uncontrolled like the prototype: typing stays free-form, value is clamped to >=1 on blur.
  const numInput = (item: GymSet, idx: number, field: Field, cls: string) => (
    <input
      type="number"
      defaultValue={item[field]}
      onChange={(e) => updateGymSetField(idx, field, e.target.value)}
      onBlur={(e) => (e.target.value = String(Math.max(1, parseFloat(e.target.value) || 1)))}
      className={`${cls} bg-black/25 px-1.5 py-1 rounded text-center font-bold outline-none`}
    />
  );

  return (
    <>
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-extrabold">Gym Strength Logger</h2>
            <p className="text-[11px] opacity-65">Pilih Split, catat Set/Beban, deteksi PR & 1RM</p>
          </div>
          <button onClick={() => exportToStudio('gym')} className="px-3 py-1.5 rounded-xl text-xs lime-btn">
            Share IG 9:16
          </button>
        </div>

        {/* Split Selector Pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2">
          {splits.map((sp) => (
            <button
              key={sp}
              onClick={() => set((p) => ({ ...p, currentSplit: sp }))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${s.currentSplit === sp ? 'lime-btn' : 'surface-card-alt'}`}
            >
              {sp} Day
            </button>
          ))}
        </div>

        {/* Exercise Selector to Add */}
        <div className="flex gap-2 mt-2">
          <select key={s.currentSplit} ref={pickerRef} className="flex-1 surface-card-alt px-3 py-2 rounded-xl text-xs font-semibold outline-none">
            {exercises.map((ex) => (
              <option key={ex} value={ex}>
                {ex}
              </option>
            ))}
          </select>
          <button onClick={addGymSetRow} className="px-3.5 py-2 rounded-xl text-xs lime-btn">
            + Set
          </button>
        </div>
      </div>

      {/* Workout Summary Pills */}
      <div className="grid grid-cols-3 gap-2">
        <div className="pill-stat p-3 text-center">
          <div className="font-display font-bold text-base text-[#C8F526]">{formatNumberID(gymTotalVolume(s.gymSets))} KG</div>
          <div className="text-[10px] opacity-65">Total Volume</div>
        </div>
        <div className="pill-stat p-3 text-center">
          <div className="font-display font-bold text-base">{gymCompletedSets(s.gymSets)} SETS</div>
          <div className="text-[10px] opacity-65">Completed Sets</div>
        </div>
        <div className="pill-stat p-3 text-center">
          <div className="font-display font-bold text-base text-amber-400">{gymPrCount(s.gymSets)} NEW PR 🔥</div>
          <div className="text-[10px] opacity-65">Personal Records</div>
        </div>
      </div>

      {/* Gym Sets Interactive Table */}
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider opacity-75">Daftar Gerakan & Beban</h3>
          <span className="text-[11px] opacity-65">Klik ✓ untuk selesaikan set</span>
        </div>
        <div className="space-y-2">
          {s.gymSets.map((item, idx) => (
            <div key={item.id} className="surface-card-alt p-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold truncate">{item.name}</span>
                  {item.isPr && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">PR 🔥</span>}
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-xs">
                  <label className="text-[10px] opacity-65">Set:</label>
                  {numInput(item, idx, 'sets', 'w-11')}
                  <label className="text-[10px] opacity-65">Kg:</label>
                  {numInput(item, idx, 'weight', 'w-14 text-[#C8F526]')}
                  <label className="text-[10px] opacity-65">Reps:</label>
                  {numInput(item, idx, 'reps', 'w-12')}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => patchSet(idx, (g) => ({ ...g, done: !g.done }))}
                  className={`w-9 h-9 rounded-xl font-bold text-xs ${item.done ? 'lime-btn' : 'surface-card border border-white/15'}`}
                >
                  ✓
                </button>
                <button onClick={() => removeGymSetRow(idx)} className="w-8 h-9 rounded-xl surface-card text-xs opacity-60 hover:opacity-100">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 1RM Predictor & Relative Strength Ratio (Epley: 1RM = W * (1 + R/30)) */}
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold">⚡ 1-Rep Max (1RM) & Relative Strength</h3>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#C8F526]/15 text-[#C8F526] font-bold">Epley Formula</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          {s.gymSets.slice(0, 4).map((g) => {
            const est1Rm = g.weight * (1 + g.reps / 30);
            return (
              <div key={g.id} className="surface-card-alt p-2.5">
                <div className="text-[10px] opacity-70 truncate">{g.name}</div>
                <div className="font-display font-bold text-sm text-[#C8F526] mt-0.5">1RM: {est1Rm.toFixed(1)} kg</div>
                <div className="text-[10px] opacity-75">
                  Rasio Kekuatan: <strong>{(est1Rm / currentBW).toFixed(2)}x BW</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
