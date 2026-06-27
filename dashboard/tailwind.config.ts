import type { Config } from 'tailwindcss';

/**
 * MatsyaMitra Dashboard — design tokens
 *
 * Theme strategy: theme-AWARE colors (canvas / glass / ink) point at CSS
 * variables defined in globals.css. Flipping the `.dark` / `.light` class
 * on <html> swaps every surface in one paint pass. Brand teal and severity
 * colors stay constant across themes — they're identity, not surface.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Theme-aware (point at CSS variables) ───────────────────────────
        canvas: {
          950: 'var(--canvas-950)',
          900: 'var(--canvas-900)',
          800: 'var(--canvas-800)',
          700: 'var(--canvas-700)',
        },
        glass: {
          DEFAULT:      'var(--glass)',
          strong:       'var(--glass-strong)',
          subtle:       'var(--glass-subtle)',
          border:       'var(--glass-border)',
          borderStrong: 'var(--glass-border-strong)',
        },
        ink: {
          primary:   'var(--ink-primary)',
          secondary: 'var(--ink-secondary)',
          muted:     'var(--ink-muted)',
          faint:     'var(--ink-faint)',
        },

        // ── Identity colors (theme-aware CSS variables) ────────────────────────
        teal: {
          50:  'var(--teal-50)',
          100: 'var(--teal-100)',
          200: 'var(--teal-200)',
          300: 'var(--teal-300)',
          400: 'var(--teal-400)',
          500: 'var(--teal-500)',
          600: 'var(--teal-600)',
          700: 'var(--teal-700)',
          800: 'var(--teal-800)',
        },
        severity: {
          critical: 'var(--severity-critical)',
          warning:  'var(--severity-warning)',
          healthy:  'var(--severity-healthy)',
          info:     'var(--severity-info)',
        },
      },
      fontFamily: {
        // Libre Baskerville everywhere — serif, used as the default UI face.
        // Only 400 and 700 weights are available; semantic hierarchy uses
        // size + tracking + italic to differentiate, never extra weights.
        sans:  ['var(--font-libre)', 'Libre Baskerville', 'Georgia', 'serif'],
        serif: ['var(--font-libre)', 'Libre Baskerville', 'Georgia', 'serif'],
        mono:  ['var(--font-jetbrains)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      backdropBlur: {
        xs: '4px',
        glass: '14px',
      },
      boxShadow: {
        glass: '0 4px 32px -8px rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
        glow:  '0 0 24px -4px rgba(14, 155, 124, 0.45)',
      },
      borderRadius: {
        glass: '18px',
      },
      keyframes: {
        ticker: {
          '0%':   { transform: 'translate3d(0, 0, 0)' },
          '100%': { transform: 'translate3d(-50%, 0, 0)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.7' },
          '50%':      { opacity: '1' },
        },
      },
      animation: {
        ticker:    'ticker 60s linear infinite',
        glowPulse: 'glowPulse 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
