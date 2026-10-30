// Over-the-air updates for the Android app, self-hosted on GitHub Releases (no Capgo cloud).
// CI publishes web.zip (the static export) + manifest.json to the rolling "ota" release on every push to main.
// The app downloads newer bundles in the background and switches to them on the next app start/background.
// Native changes (plugins, permissions, icon) still need a new APK: the manifest's `native` must match the APK.
import { CapacitorHttp } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { isNative } from './gps';

const MANIFEST_URL = 'https://github.com/adamsuvi7/kinetz/releases/download/ota/manifest.json';
export const APK_URL = 'https://github.com/adamsuvi7/kinetz/releases/download/ota/kinetz.apk';
/** Build number baked into this JS bundle by CI (GitHub run number); 0 for local builds. */
export const BUILD = Number(process.env.NEXT_PUBLIC_BUILD ?? 0);

type Manifest = { build: number; native: string; url: string };
export type UpdateStatus = { kind: 'none' } | { kind: 'downloaded'; build: number } | { kind: 'native'; build: number };

export async function checkForUpdate(): Promise<UpdateStatus> {
  if (!isNative()) return { kind: 'none' };
  // Must run first on every launch, or the plugin rolls back to the previous bundle as "broken".
  await CapacitorUpdater.notifyAppReady();
  if (!BUILD) return { kind: 'none' };

  // Native HTTP: github.com release downloads send no CORS headers, so WebView fetch() would be blocked.
  const res = await CapacitorHttp.get({ url: `${MANIFEST_URL}?t=${Date.now()}`, responseType: 'json' });
  const m = (typeof res.data === 'string' ? JSON.parse(res.data) : res.data) as Manifest;
  if (res.status !== 200 || !Number.isFinite(m?.build) || m.build <= BUILD) return { kind: 'none' };

  const { native } = await CapacitorUpdater.current();
  if (m.native !== native) return { kind: 'native', build: m.build };

  const bundle = await CapacitorUpdater.download({ url: m.url, version: String(m.build) });
  await CapacitorUpdater.next({ id: bundle.id });
  return { kind: 'downloaded', build: m.build };
}
