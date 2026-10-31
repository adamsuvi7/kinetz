'use client';

import { useRef } from 'react';
import {
  bestE1rm, currentWeight, formatNumberID, gymCompletedSets, gymPrCount, gymTotalVolume, todayKey,
  type GymExercise, type GymSetEntry,
} from '@/lib/state';
import { useApp } from '../AppProvider';

export default function GymPanel() {
  const { s, set, toast, exportToStudio } = useApp();
  const pickerRef = useRef<HTMLSelectElement>(null);
  const splits = Object.keys(s.gymExercisesBySplit);
  const exercises = s.gymExercisesBySplit[s.currentSplit] || [];
  const bw = currentWeight(s);

  const patchEx = (id: number, patch: (ex: GymExercise) => GymExercise) =>
    set((p) => ({ ...p, gymSets: p.gymSets.map((ex) => (ex.id === id ? patch(ex) : ex)) }));
  const patchSet = (id: number, i: number, patch: Partial<GymSetEntry>) =>
    patchEx(id, (ex) => ({ ...ex, sets: ex.sets.map((st, j) => (j === i ? { ...st, ...patch } : st)) }));

  const addExercise = () => {
    const name = pickerRef.current?.value || exercises[0];
    if (!name) return;
    const id = Date.now();
    set((p) => ({ ...p, gymSets: [...p.gymSets, { id, name, sets: [{ kg: 20, reps: 10, done: false }] }] }));
    toast(`${name} ditambahkan`);
  };

  // A new set starts from the previous one, the usual way people progress through a workout.
  const addSet = (ex: GymExercise) => {
    const prev = ex.sets[ex.sets.length - 1] ?? { kg: 20, reps: 10 };
    patchEx(ex.id, (e) => ({ ...e, sets: [...e.sets, { kg: prev.kg, reps: prev.reps, done: false }] }));
  };

  const removeSet = (ex: GymExercise, i: number) => {
    if (ex.sets.length <= 1) return set((p) => ({ ...p, gymSets: p.gymSets.filter((e) => e.id !== ex.id) }));
    patchEx(ex.id, (e) => ({ ...e, sets: e.sets.filter((_, j) => j !== i) }));
  };

  const saveSession = () => {
    const done = gymCompletedSets(s.gymSets);
    if (!done) return toast('Centang minimal satu set yang sudah selesai');
    const prs = gymPrCount(s.gymSets, s.gymBests);
    set((p) => {
      const bests = { ...p.gymBests };
      p.gymSets.forEach((ex) => {
        const b = bestE1rm(ex);
        if (b > 0) bests[ex.name] = Math.max(bests[ex.name] ?? 0, b);
      });
      return {
        ...p,
        gymBests: bests,
        gymLog: [...p.gymLog, { date: todayKey(), split: p.currentSplit, volume: gymTotalVolume(p.gymSets), sets: done }],
        // Keep the loads as next session's plan, just clear the ticks.
        gymSets: p.gymSets.map((ex) => ({ ...ex, sets: ex.sets.map((st) => ({ ...st, done: false })) })),
      };
    });
    toast(`Sesi tersimpan · ${done} set${prs ? ` · ${prs} PR baru` : ''}`);
  };

  // Uncontrolled: typing stays free-form; invalid input keeps the last valid value.
  const numInput = (ex: GymExercise, i: number, field: 'kg' | 'reps', label: string) => (
    <input
      type="number"
      inputMode={field === 'kg' ? 'decimal' : 'numeric'}
      step={field === 'kg' ? 0.5 : 1}
      min={field === 'kg' ? 0 : 1}
      aria-label={label}
      defaultValue={ex.sets[i][field]}
      onChange={(e) => {
        const v = field === 'kg' ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
        if (Number.isFinite(v) && v >= (field === 'kg' ? 0 : 1)) patchSet(ex.id, i, { [field]: v });
      }}
      className={`w-full bg-black/25 px-2 py-1.5 rounded-lg text-center font-bold outline-none ${field === 'kg' ? 'text-[#C8F526]' : ''}`}
    />
  );

  const volume = gymTotalVolume(s.gymSets);
  const prs = gymPrCount(s.gymSets, s.gymBests);

  return (
    <>
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-extrabold">Gym Strength Logger</h2>
            <p className="text-[11px] opacity-65">Tiap set punya beban & reps sendiri. Centang set yang selesai.</p>
          </div>
          <button onClick={() => exportToStudio('gym')} className="px-3 py-1.5 rounded-xl text-xs lime-btn">
            Share IG
          </button>
        </div>

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

        <div className="flex gap-2 mt-2">
          <select key={s.currentSplit} ref={pickerRef} className="flex-1 surface-card-alt px-3 py-2 rounded-xl text-xs font-semibold outline-none">
            {exercises.map((ex) => (
              <option key={ex} value={ex}>
                {ex}
              </option>
            ))}
          </select>
          <button onClick={addExercise} className="px-3.5 py-2 rounded-xl text-xs lime-btn">
            + Gerakan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="pill-stat p-3 text-center">
          <div className="font-display font-bold text-base text-[#C8F526]">{formatNumberID(volume)} kg</div>
          <div className="text-[10px] opacity-65">Volume</div>
        </div>
        <div className="pill-stat p-3 text-center">
          <div className="font-display font-bold text-base">{gymCompletedSets(s.gymSets)}</div>
          <div className="text-[10px] opacity-65">Set selesai</div>
        </div>
        <div className="pill-stat p-3 text-center">
          <div className="font-display font-bold text-base text-amber-400">{prs}</div>
          <div className="text-[10px] opacity-65">PR baru</div>
        </div>
      </div>

      <div className="surface-card p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider opacity-75">Daftar Gerakan</h3>
        {s.gymSets.length === 0 && <p className="text-[11px] opacity-65">Belum ada gerakan. Pilih gerakan di atas lalu tekan + Gerakan.</p>}
        {s.gymSets.map((ex) => {
          const best = bestE1rm(ex);
          const prev = s.gymBests[ex.name];
          const isPr = prev !== undefined && best > prev + 0.05;
          return (
            <div key={ex.id} className="surface-card-alt p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs font-extrabold truncate flex-1">{ex.name}</span>
                {isPr && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">PR 🔥</span>}
                {prev !== undefined && <span className="text-[10px] opacity-60">terbaik {prev.toFixed(1)} kg 1RM</span>}
              </div>
              <div className="grid grid-cols-[28px_1fr_1fr_36px_28px] gap-1.5 items-center text-[10px] opacity-60 mb-1 px-0.5">
                <span>Set</span>
                <span className="text-center">Kg</span>
                <span className="text-center">Reps</span>
                <span />
                <span />
              </div>
              <div className="space-y-1.5">
                {ex.sets.map((st, i) => (
                  <div key={`${ex.id}-${i}-${ex.sets.length}`} className="grid grid-cols-[28px_1fr_1fr_36px_28px] gap-1.5 items-center text-xs">
                    <span className="font-display font-bold opacity-70 text-center">{i + 1}</span>
                    {numInput(ex, i, 'kg', `${ex.name} set ${i + 1} beban`)}
                    {numInput(ex, i, 'reps', `${ex.name} set ${i + 1} reps`)}
                    <button
                      onClick={() => patchSet(ex.id, i, { done: !st.done })}
                      aria-label={`Set ${i + 1} selesai`}
                      aria-pressed={st.done}
                      className={`h-8 rounded-lg font-bold ${st.done ? 'lime-btn' : 'surface-card border border-white/15'}`}
                    >
                      ✓
                    </button>
                    <button onClick={() => removeSet(ex, i)} aria-label={`Hapus set ${i + 1}`} className="h-8 rounded-lg text-xs opacity-50 hover:opacity-100">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => addSet(ex)} className="mt-2 w-full py-1.5 rounded-lg text-[11px] font-bold border border-dashed border-white/20 opacity-80">
                + Set
              </button>
            </div>
          );
        })}
        <button onClick={saveSession} className="w-full py-2.5 rounded-xl text-xs lime-btn">
          Simpan Sesi Latihan
        </button>
      </div>

      {/* 1RM (Epley) from each exercise's best completed set */}
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold">⚡ Estimasi 1RM & Rasio Kekuatan</h3>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#C8F526]/15 text-[#C8F526] font-bold">Epley</span>
        </div>
        {s.gymSets.every((ex) => bestE1rm(ex) === 0) ? (
          <p className="text-[11px] opacity-65">Centang set yang selesai untuk melihat estimasi 1RM.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            {s.gymSets
              .filter((ex) => bestE1rm(ex) > 0)
              .map((ex) => {
                const best = bestE1rm(ex);
                return (
                  <div key={ex.id} className="surface-card-alt p-2.5">
                    <div className="text-[10px] opacity-70 truncate">{ex.name}</div>
                    <div className="font-display font-bold text-sm text-[#C8F526] mt-0.5">{best.toFixed(1)} kg</div>
                    <div className="text-[10px] opacity-75">
                      <strong>{(best / bw).toFixed(2)}×</strong> berat badan
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </>
  );
}
