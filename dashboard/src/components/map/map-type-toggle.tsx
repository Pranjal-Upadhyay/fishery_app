'use client';

import { Satellite, Map as MapIcon, Layers } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Glass-styled three-way segmented toggle for the map type.
 *
 * Sits at the top-left of the map canvas. Mirrors the look of the theme
 * toggle (sliding pill + lozenge) so the dashboard feels consistent.
 */
export type MapType = 'satellite' | 'hybrid' | 'roadmap';

const OPTIONS: { value: MapType; label: string; icon: typeof MapIcon }[] = [
  { value: 'satellite', label: 'Satellite', icon: Satellite },
  { value: 'hybrid',    label: 'Hybrid',    icon: Layers },
  { value: 'roadmap',   label: 'Map',       icon: MapIcon },
];

export function MapTypeToggle({
  value,
  onChange,
}: {
  value: MapType;
  onChange: (next: MapType) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Map type"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-glass-border bg-glass-strong p-1 backdrop-blur-glass shadow-glass',
      )}
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition-colors',
              active
                ? 'bg-teal-500/30 text-teal-700 dark:text-teal-200 ring-1 ring-teal-500/50 dark:ring-teal-400/40'
                : 'text-ink-secondary hover:bg-glass hover:text-ink-primary',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
