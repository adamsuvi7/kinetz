'use client';

import { dietToday, formatNumberID } from '@/lib/state';
import Dashboard from './Dashboard';
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

  const openCategoryQuick = (cat: (typeof CATEGORIES)[number]['cat']) => {
    if (cat === 'cycle') return switchTab('ride');
    switchTab('workout');
    switchWorkoutSub(cat === 'gym' ? 'gym' : cat === 'run' ? 'run' : 'multi');
  };

  return (
    <section className={`space-y-4${s.activeTab === 'home' ? '' : ' hidden'}`}>
      <div className="tab-grid">
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
            🥩 Protein hari ini: <strong>{`${dietToday(s).protein} / ${s.targetProtein}g`}</strong>
          </span>
        </div>
      </div>

      <TodayWorkoutCard />
      <FastingGauge />
      </div>

      <Dashboard />

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
