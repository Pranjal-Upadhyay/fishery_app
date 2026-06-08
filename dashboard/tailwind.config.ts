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

        // ── Identity colors (constant across themes) ────────────────────────
        teal: {
          50:  '#e8fbf6',
          100: '#bcf2e3',
          200: '#7fe6cd',
          300: '#39d4ad',
          400: '#19b893',
          500: '#0e9b7c',
          600: '#0a7b62',
          700: '#085f4b',
          800: '#064739',
        },
        severity: {
          critical: '#ef4d57',
          warning:  '#f5b13b',
          healthy:  '#39d4ad',
          info:     '#5cb8ff',
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
