'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { cn } from '@/lib/cn';

/**
 * Lozenge toggle with a sliding pill.
 *
 * The whole lozenge is one button — clicking anywhere flips the theme.
 * The two icons inside are decorative: they tell you which mode the
 * indicator currently sits under. The sliding pill animates between them.
 *
 * (Earlier version had two separate buttons; users expected the natural
 * "click anywhere to toggle" behaviour, so it's now a single hit target.)
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isLight}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      className={cn(
        'relative inline-flex h-8 w-16 items-center rounded-full border border-glass-border bg-glass-subtle p-0.5 backdrop-blur-glass',
        'transition-colors hover:border-glass-borderStrong',
        'focus:outline-none focus:ring-2 focus:ring-teal-400/40',
        className,
      )}
    >
      {/* Sliding indicator pill — sits under whichever icon is active */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-0.5 left-0.5 h-7 w-7 rounded-full bg-teal-500/25 ring-1 ring-teal-400/40 shadow-glow transition-transform duration-200',
          isLight ? 'translate-x-8' : 'translate-x-0',
        )}
      />

      {/* Decorative icons — pointer-events-none so they don't intercept the click */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none relative z-10 grid h-7 w-8 place-items-center transition-colors',
          !isLight ? 'text-teal-200' : 'text-ink-muted',
        )}
      >
        <Moon className="h-3.5 w-3.5" />
      </span>
      <span
        aria-hidden
        className={cn(
          'pointer-events-none relative z-10 grid h-7 w-8 place-items-center transition-colors',
          isLight ? 'text-teal-200' : 'text-ink-muted',
        )}
      >
        <Sun className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}
