'use client';

import type { WorkoutSub } from '@/lib/state';
import { useApp } from '../AppProvider';
import GymPanel from './GymPanel';
import RunPanel from './RunPanel';
import MultiSportPanel from './MultiSportPanel';

const SUBS: { sub: WorkoutSub; label: string }[] = [
  { sub: 'gym', label: '🏋️ Gym' },
  { sub: 'run', label: '🏃 Lari' },
  { sub: 'multi', label: '🚴 Multi' },
];

export default function WorkoutTab() {
  const { s, switchWorkoutSub } = useApp();
  const show = (sub: WorkoutSub) => (s.activeWorkoutSub === sub ? '' : ' hidden');

  return (
    <section className={`space-y-4${s.activeTab === 'workout' ? '' : ' hidden'}`}>
      {/* Mode Selector Sub-Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 surface-card-alt rounded-2xl">
        {SUBS.map(({ sub, label }) => (
          <button
            key={sub}
            onClick={() => switchWorkoutSub(sub)}
            className={`py-2 rounded-xl text-xs font-bold ${s.activeWorkoutSub === sub ? 'lime-btn' : 'opacity-75'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={`tab-grid${show('gym')}`}>
        <GymPanel />
      </div>
      <div className={`tab-grid${show('run')}`}>
        <RunPanel />
      </div>
      <div className={`tab-grid${show('multi')}`}>
        <MultiSportPanel />
      </div>
    </section>
  );
}
