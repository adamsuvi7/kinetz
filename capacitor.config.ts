import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kinetz.app',
  appName: 'Kinetz',
  webDir: 'out',
  android: {
    // Required by @capacitor-community/background-geolocation: otherwise updates stop after ~5 min in background.
    useLegacyBridge: true,
  },
};

export default config;
