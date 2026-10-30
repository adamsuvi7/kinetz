'use client';

import { AppProvider } from './AppProvider';
import Header from './Header';
import BottomDock from './BottomDock';
import CameraModal from './CameraModal';
import BeaconModal from './BeaconModal';
import HomeTab from './home/HomeTab';
import WorkoutTab from './workout/WorkoutTab';
import NutritionTab from './nutrition/NutritionTab';
import AnalyticsTab from './analytics/AnalyticsTab';
import StudioTab from './studio/StudioTab';

export default function FitSyncApp() {
  return (
    <AppProvider>
      <div className="app-shell px-4 pt-3">
        <Header />
        {/* All tabs stay mounted (hidden via class) like the prototype, so inputs and canvases keep their state. */}
        <HomeTab />
        <WorkoutTab />
        <NutritionTab />
        <AnalyticsTab />
        <StudioTab />
      </div>
      <BottomDock />
      <CameraModal />
      <BeaconModal />
    </AppProvider>
  );
}
