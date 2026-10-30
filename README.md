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

Every push to `main` builds a debug APK in GitHub Actions (**Actions → Android APK → Artifacts → kinetz-debug-apk**).
Install it on the phone (allow "install unknown apps").

- Rides keep recording with the screen locked (foreground service, persistent "Kinetz merekam ride" notification).
- The app is a static export, so the AI food scan calls the deployed web app: set the repository variable
  `KINETZ_API_BASE` (for example `https://your-app.vercel.app`) and deploy the web app with `GEMINI_API_KEY`.

Local build instead of CI: `npm run build:mobile`, then open `android/` in Android Studio (JDK 21).
