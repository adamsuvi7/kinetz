// One GPS stream for both targets:
// - Android (Capacitor): foreground-service watcher, keeps recording with the screen off.
// - Browser: watchPosition + Screen Wake Lock (browsers stop GPS when the screen sleeps).
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
import type { TrackPoint } from './ride';

export type GpsError = 'denied' | 'unavailable' | 'insecure';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

export const isNative = () => Capacitor.isNativePlatform();
export const openLocationSettings = () => BackgroundGeolocation.openSettings();

/** Starts streaming fixes; resolves to a stop function. */
export async function startGps(onFix: (p: TrackPoint) => void, onError: (e: GpsError) => void): Promise<() => void> {
  if (isNative()) {
    const id = await BackgroundGeolocation.addWatcher(
      {
        backgroundTitle: 'Kinetz merekam ride',
        backgroundMessage: 'Ketuk untuk kembali ke Kinetz',
        requestPermissions: true,
        stale: false,
        distanceFilter: 3,
      },
      (loc, err) => {
        if (err) return onError(err.code === 'NOT_AUTHORIZED' ? 'denied' : 'unavailable');
        if (loc) onFix({ lat: loc.latitude, lon: loc.longitude, t: loc.time ?? Date.now(), alt: loc.altitude, acc: loc.accuracy });
      },
    );
    return () => void BackgroundGeolocation.removeWatcher({ id });
  }

  if (!window.isSecureContext || !('geolocation' in navigator)) {
    onError('insecure');
    return () => {};
  }

  let wakeLock: WakeLockSentinel | null = null;
  const lock = () => navigator.wakeLock?.request('screen').then((l) => (wakeLock = l)).catch(() => {});
  // The OS drops the wake lock when the tab is hidden; take it again when the rider comes back.
  const onVisible = () => document.visibilityState === 'visible' && lock();
  lock();
  document.addEventListener('visibilitychange', onVisible);

  const watchId = navigator.geolocation.watchPosition(
    (pos) =>
      onFix({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        t: pos.timestamp,
        alt: pos.coords.altitude,
        acc: pos.coords.accuracy,
      }),
    (err) => {
      if (err.code === err.PERMISSION_DENIED) onError('denied');
      else if (err.code === err.POSITION_UNAVAILABLE) onError('unavailable');
      // TIMEOUT: keep watching, the next fix usually arrives.
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
    document.removeEventListener('visibilitychange', onVisible);
    wakeLock?.release().catch(() => {});
  };
}
