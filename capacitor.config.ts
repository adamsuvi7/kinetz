import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kinetz.app',
  appName: 'Kinetz',
  webDir: 'out',
  android: {
    // Required by @capacitor-community/background-geolocation: otherwise updates stop after ~5 min in background.
    useLegacyBridge: true,
  },
  plugins: {
    // Self-hosted OTA (lib/updater.ts): no automatic Capgo-cloud checks and no telemetry.
    CapacitorUpdater: { autoUpdate: false, statsUrl: '', updateUrl: '', channelUrl: '', appReadyTimeout: 15000 },
  },
};

export default config;
