// `npm run build:mobile` produces a static export in out/ for Capacitor (Android).
// npm sets npm_lifecycle_event to the script name, which keeps this cross-platform without extra deps.
const mobile = process.env.npm_lifecycle_event === 'build:mobile';

/** @type {import('next').NextConfig} */
const nextConfig = mobile
  ? {
      output: 'export',
      // API route handlers (route.ts) can't be statically exported; the app calls the deployed web API instead.
      pageExtensions: ['tsx', 'jsx'], // two entries: Next 14 mangles a single-item array
    }
  : {};

export default nextConfig;
