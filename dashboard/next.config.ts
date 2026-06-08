import type { NextConfig } from 'next';

/**
 * Content Security Policy is built dynamically so dev gets the relaxations
 * Next.js needs (HMR, eval-based source maps, devtools websockets), while
 * production gets the strictest realistic set.
 *
 * Notes on each directive:
 *   - script-src: 'self' + Google Maps. 'unsafe-eval' is required by
 *     Next.js's HMR runtime in dev; we drop it in prod. blob: is required
 *     by deck.gl, which spawns WebGL workers from blob URLs.
 *   - worker-src: blob: is required by deck.gl. Also 'self' for any
 *     Next.js bundled workers.
 *   - style-src: 'unsafe-inline' is needed for next/font and the inline
 *     theme bootstrap script — Next.js does not yet support nonce-based
 *     CSP cleanly. Tighten when it does.
 *   - connect-src: dev allows localhost + ws for HMR; prod restricts to
 *     the Render backend and Google Maps API.
 *   - frame-ancestors 'none' = X-Frame-Options: DENY but standards-track.
 */
const isProd = process.env.NODE_ENV === 'production';

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",                 // next/font + theme bootstrap
  ...(isProd ? [] : ["'unsafe-eval'"]), // HMR only
  'blob:',                            // deck.gl workers
  'https://maps.googleapis.com',
].join(' ');

const workerSrc = "'self' blob:";

const connectSrc = [
  "'self'",
  ...(isProd ? [] : ['ws:', 'wss:', 'http://localhost:3000']),
  'https://fishery-app.onrender.com',
  'https://maps.googleapis.com',
].join(' ');

const styleSrc = "'self' 'unsafe-inline' https://fonts.googleapis.com";
const imgSrc =
  "'self' blob: data: https://*.tile.openstreetmap.org https://maps.gstatic.com https://maps.googleapis.com https://images.unsplash.com";
const fontSrc = "'self' https://fonts.gstatic.com";

const CSP = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  `worker-src ${workerSrc}`,
  `style-src ${styleSrc}`,
  `img-src ${imgSrc}`,
  `connect-src ${connectSrc}`,
  `font-src ${fontSrc}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            // Drop sensors / payment / camera / mic by default for an admin tool.
            value: 'camera=(), microphone=(), geolocation=(self), payment=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
