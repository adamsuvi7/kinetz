'use client';

import { computeRiegelTime, formatNumberID, gymTotalVolume, last } from '@/lib/state';
import { useApp } from '../AppProvider';
import FastingGauge from './FastingGauge';
import TodayWorkoutCard from './TodayWorkoutCard';
import ClubSection from './ClubSection';

const CATEGORIES = [
  { cat: 'gym', icon: '🏋️', label: 'Strength' },
  { cat: 'run', icon: '🏃', label: 'Lari GPS' },
  { cat: 'cycle', icon: '🚴', label: 'Cycling' },
  { cat: 'multisport', icon: '🎾', label: 'Padel/Sport' },
] as const;

export default function HomeTab() {
  const { s, set, toast, switchTab, switchWorkoutSub } = useApp();

  const toggleScheduleDayDone = (idx: number) => {
    set((p) => ({ ...p, weeklySchedule: p.weeklySchedule.map((d, i) => (i === idx ? { ...d, done: !d.done } : d)) }));
    toast(`Status latihan hari ${s.weeklySchedule[idx].day} diperbarui!`);
  };

  const refreshAiIntelligence = () => {
    const messages = [
      `Volume ${s.currentSplit} Day mencapai ${formatNumberID(gymTotalVolume(s.gymSets))} KG dengan 2 Rekor PR baru! Protein harian ${Math.round((s.consumedProtein / s.targetProtein) * 100)}% terpenuhi. Pertahankan defisit kalori untuk memangkas lingkar pinggang.`,
      `Analisis Hybrid: Cadence lari kamu stabil di ${s.runData.cadence} spm dengan estimasi waktu 5K ${computeRiegelTime(s.runData, 5)}. Asupan protein (${s.consumedProtein}g) menjaga pemulihan otot tetap hijau (Readiness 91%).`,
      `Body Recomposition Insight: Berat badan turun ke ${last(s.bodyHistory.weight)} kg sementara beban angkatan relatif naik ke 1.41x BW. Jadwal puasa ${s.fastingProtocol} berjalan optimal.`,
    ];
    set((p) => ({ ...p, aiText: messages[Math.floor(Math.random() * messages.length)] }));
    toast('AI Athlete Intelligence diperbarui!');
  };

  const openCategoryQuick = (cat: (typeof CATEGORIES)[number]['cat']) => {
    if (cat === 'cycle') return switchTab('ride');
    switchTab('workout');
    switchWorkoutSub(cat === 'gym' ? 'gym' : cat === 'run' ? 'run' : 'multi');
  };

  return (
    <section className={`space-y-4${s.activeTab === 'home' ? '' : ' hidden'}`}>
      {/* YOUR PROGRESS CARD */}
      <div className="sage-hero-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[11px] uppercase tracking-wider opacity-85 font-semibold">Your Progress</span>
            <h2 className="text-lg font-extrabold leading-none mt-0.5">Weekly Streak & Macro</h2>
          </div>
          <button
            onClick={() => switchTab('nutrition')}
            className="text-xs bg-white/20 hover:bg-white/30 backdrop-blur px-3 py-1 rounded-full font-semibold flex items-center gap-1"
          >
            <span>Weeks</span>
            <span>▾</span>
          </button>
        </div>

        {/* 6 Day Circles (✓, ✓, 16, 17, 18, 19) */}
        <div className="grid grid-cols-6 gap-2 my-2">
          {s.weeklySchedule.slice(0, 6).map((item, idx) => {
            const bgClass = item.done
              ? 'bg-[#DFF58E] text-[#132018] font-extrabold shadow'
              : item.active
                ? 'bg-white text-[#132018] font-extrabold ring-2 ring-[#C8F526]'
                : 'bg-white/85 text-[#132018] font-bold';
            return (
              <button key={item.day} onClick={() => toggleScheduleDayDone(idx)} className="flex flex-col items-center gap-1">
                <div className={`w-11 h-11 rounded-full ${bgClass} flex items-center justify-center text-sm transition-transform active:scale-90`}>
                  {item.done ? '✓' : item.num}
                </div>
                <span className="text-[10px] font-semibold opacity-90">{item.day}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] opacity-90 mt-2 pt-2 border-t border-white/15">
          <span>
            🎯 Target TDEE: <strong>{formatNumberID(s.tdee)}</strong> kcal
          </span>
          <span>
            🥩 Protein: <strong>{`${s.consumedProtein} / ${s.targetProtein}g`}</strong>
          </span>
        </div>
      </div>

      {/* 3 METRIC PILLS */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { icon: '🔥', value: formatNumberID(s.consumedCalories), label: 'Calories' },
          { icon: '🏃', value: formatNumberID(s.steps), label: 'Steps' },
          { icon: '💚', value: `${s.heartRate} bpm`, label: 'Heartbeat' },
        ].map((p) => (
          <div key={p.label} className="pill-stat p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#438257]/25 text-[#C8F526] flex items-center justify-center font-bold text-sm">{p.icon}</div>
            <div>
              <div className="font-display font-bold text-sm leading-tight">{p.value}</div>
              <div className="text-[10px] opacity-65">{p.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* KINETZ ATHLETE INTELLIGENCE */}
      <div className="surface-card p-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#C8F526] text-[#0E110F]">AI ATHLETE INTELLIGENCE</span>
            <span className="text-[11px] opacity-65">
              Readiness: <strong className="text-[#C8F526]">88% Optimal</strong>
            </span>
          </div>
          <button onClick={refreshAiIntelligence} className="text-[11px] opacity-70 hover:opacity-100 font-semibold">
            ↻ Analisis
          </button>
        </div>
        {/* aiText is built only from app-owned strings and numbers, never user input */}
        <p className="text-xs leading-relaxed opacity-90" dangerouslySetInnerHTML={{ __html: s.aiText }} />
      </div>

      <FastingGauge />
      <TodayWorkoutCard />

      {/* CATEGORIES */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-sm font-bold">Categories & Multi-Sport</h3>
          <button onClick={() => switchTab('workout')} className="text-xs opacity-65 font-semibold">
            See All →
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2.5 text-center">
          {CATEGORIES.map((c) => (
            <button key={c.cat} onClick={() => openCategoryQuick(c.cat)} className="surface-card p-3 flex flex-col items-center gap-1.5 hover:border-[#C8F526]">
              <span className="text-2xl">{c.icon}</span>
              <span className="text-[11px] font-bold">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <ClubSection />
    </section>
  );
}
