'use client';

import type { WorkoutSub } from '@/lib/fitsync';
import { useApp } from '../AppProvider';
import GymPanel from './GymPanel';
import RunPanel from './RunPanel';
import MultiSportPanel from './MultiSportPanel';
import KomPanel from './KomPanel';

const SUBS: { sub: WorkoutSub; label: string }[] = [
  { sub: 'gym', label: '🏋️ Gym' },
  { sub: 'run', label: '🏃 Lari' },
  { sub: 'multi', label: '🚴 Multi' },
  { sub: 'kom', label: '👑 KOM' },
];

export default function WorkoutTab() {
  const { s, switchWorkoutSub } = useApp();
  const show = (sub: WorkoutSub) => (s.activeWorkoutSub === sub ? '' : ' hidden');

  return (
    <section className={`space-y-4${s.activeTab === 'workout' ? '' : ' hidden'}`}>
      {/* Mode Selector Sub-Tabs */}
      <div className="grid grid-cols-4 gap-1.5 p-1 surface-card-alt rounded-2xl">
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

      <div className={`space-y-4${show('gym')}`}>
        <GymPanel />
      </div>
      <div className={`space-y-4${show('run')}`}>
        <RunPanel />
      </div>
      <div className={`space-y-4${show('multi')}`}>
        <MultiSportPanel />
      </div>
      <div className={`space-y-4${show('kom')}`}>
        <KomPanel />
      </div>
    </section>
  );
}
