# Kinetz

GPS ride tracker with an editable Instagram Story studio, plus gym, nutrition and body analytics.
Next.js 14 (App Router) web app, wrapped as an Android app with Capacitor.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # ride math self-check (distance, moving time, speed, elevation, GPS filter)
```

AI food scan needs a Gemini key: copy `.env.example` to `.env.local` and set `GEMINI_API_KEY`.

## Android

Every push to `main` builds the APK in GitHub Actions and publishes it to the rolling
[`ota` release](https://github.com/adamsuvi7/kinetz/releases/tag/ota): `kinetz.apk`, `web.zip`, `manifest.json`.

**Updates without reinstalling**
- *Web updates (UI, story, logic)*: the app checks `manifest.json` on launch, downloads `web.zip` in the background
  and switches to it the next time Kinetz is reopened (`lib/updater.ts`, self-hosted @capgo/capacitor-updater).
- *Native updates (plugins, permissions, icon)*: bump `versionName` in `android/app/build.gradle`. The app then shows
  a banner to download the new APK, which installs over the old one (same signing key), keeping all rides.

**Signing (one-time setup)**: add two repository secrets (Settings → Secrets and variables → Actions):
`KINETZ_KEYSTORE_B64` (base64 of the PKCS12 keystore) and `KINETZ_KEYSTORE_PASSWORD`. Without them CI builds a
debug APK that must be uninstalled before each update. Back up the keystore: losing it means users must reinstall.

- Rides keep recording with the screen locked (foreground service, "Kinetz merekam ride" notification).
  Location permission must be *precise* ("Gunakan lokasi akurat"); approximate location is rejected by the plugin.
- AI food scan in the app calls the deployed web app: set repository variable `KINETZ_API_BASE`.

Local build instead of CI: `npm run build:mobile`, then open `android/` in Android Studio (JDK 21).
