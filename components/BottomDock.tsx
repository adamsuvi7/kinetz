'use client';

import type { Tab } from '@/lib/state';
import { useApp } from './AppProvider';

const NAV: { tab: Tab; icon: string; label: string }[] = [
  { tab: 'ride', icon: '🚴', label: 'Ride' },
  { tab: 'home', icon: '🏠', label: 'Home' },
  { tab: 'workout', icon: '🏋️', label: 'Workout' },
  { tab: 'nutrition', icon: '📅', label: 'Diet & Cal' },
  { tab: 'studio', icon: '📸', label: 'IG Story' },
];

export default function BottomDock() {
  const { s, switchTab } = useApp();
  return (
    <nav className="bottom-dock flex items-center justify-between">
      {NAV.map(({ tab, icon, label }) => {
        const active = s.activeTab === tab;
        return (
          <button key={tab} onClick={() => switchTab(tab)} className={`nav-item${active ? ' active' : ''}`}>
            <span>{icon}</span>
            <span className={`nav-label${active ? '' : ' hidden'}`}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
