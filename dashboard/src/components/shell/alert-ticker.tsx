'use client';

import { AlertTriangle, Activity, Bell, ShieldAlert } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { cn } from '@/lib/cn';

/**
 * Alert ticker — the always-on banner sliding across the top of the dashboard.
 *
 * Phase L0: shows placeholder alerts so the visual treatment lands. Phase L2
 * swaps the `alerts` prop for live data from `/api/v1/admin/alerts/stream`.
 *
 * Design notes:
 *   - The marquee duplicates its content twice so the loop is seamless.
 *   - Hovering pauses the animation (`hover:[animation-play-state:paused]`)
 *     so an officer can read a specific alert.
 *   - Severity tag uses a colored dot + uppercase chip — easy to scan at speed.
 */

export interface TickerAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  label: string;
  message: string;
  scope?: string; // e.g. "Madhubani · Block 4"
}

const PLACEHOLDER_ALERTS: TickerAlert[] = [
  { id: '1', severity: 'critical', label: 'DO Crash',     message: 'Dissolved oxygen below 2 ppm in pond cluster',  scope: 'Madhubani · Pandaul' },
  { id: '2', severity: 'warning',  label: 'Ammonia Drift',message: 'NH₃ rising across 4 ponds — possible source contamination', scope: 'Vaishali · Hajipur' },
  { id: '3', severity: 'info',     label: 'Scheme Live',  message: 'Jalkrishi Saurikaran applications opened for Q3', scope: 'Statewide' },
  { id: '4', severity: 'warning',  label: 'Doctor Gap',   message: '12 farmers in Sherghati block have no assigned doctor', scope: 'Gaya · Sherghati' },
  { id: '5', severity: 'critical', label: 'Disease Flag', message: 'EUS-like lesion reports clustering — investigate',  scope: 'Begusarai · Mansurchak' },
];

const severityClasses: Record<TickerAlert['severity'], { dot: string; chip: string }> = {
  critical: {
    dot:  'bg-severity-critical shadow-[0_0_8px_2px_rgba(239,77,87,0.55)]',
    chip: 'text-severity-critical border-severity-critical/40 bg-severity-critical/10',
  },
  warning: {
    dot:  'bg-severity-warning shadow-[0_0_8px_2px_rgba(245,177,59,0.45)]',
    chip: 'text-severity-warning border-severity-warning/40 bg-severity-warning/10',
  },
  info: {
    dot:  'bg-severity-info shadow-[0_0_8px_2px_rgba(92,184,255,0.45)]',
    chip: 'text-severity-info border-severity-info/40 bg-severity-info/10',
  },
};

const severityIcons: Record<TickerAlert['severity'], typeof AlertTriangle> = {
  critical: ShieldAlert,
  warning:  AlertTriangle,
  info:     Activity,
};

function AlertItem({ alert }: { alert: TickerAlert }) {
  const sev = severityClasses[alert.severity];
  const Icon = severityIcons[alert.severity];
  return (
    <span className="inline-flex shrink-0 items-center gap-3 px-5">
      <span className={cn('h-2 w-2 rounded-full', sev.dot)} aria-hidden />
      <Icon className="h-3.5 w-3.5 text-ink-secondary" aria-hidden />
      <span
        className={cn(
          'rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]',
          sev.chip
        )}
      >
        {alert.label}
      </span>
      <span className="text-sm text-ink-primary">{alert.message}</span>
      {alert.scope ? (
        <span className="font-mono text-[11px] text-ink-muted">· {alert.scope}</span>
      ) : null}
      <span className="mx-3 h-3 w-px bg-glass-border" aria-hidden />
    </span>
  );
}

export function AlertTicker({ alerts = PLACEHOLDER_ALERTS }: { alerts?: TickerAlert[] }) {
  // Duplicate once so the translate3d(-50%, 0, 0) loop has no visible seam.
  const doubled = [...alerts, ...alerts];

  return (
    <GlassCard
      variant="strong"
      className="flex items-stretch overflow-hidden rounded-none border-x-0 border-t-0"
      aria-label="Live alert ticker"
    >
      {/* Leading badge — left-anchored, always visible */}
      <div className="flex shrink-0 items-center gap-2 border-r border-glass-border bg-glass-strong px-4 py-2.5">
        <Bell className="h-4 w-4 text-teal-400 animate-glowPulse" aria-hidden />
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-ink-primary">
          Live Alerts
        </span>
      </div>

      {/* Marquee */}
      <div className="relative flex-1 overflow-hidden py-2">
        <div className="flex w-max animate-ticker hover:[animation-play-state:paused]">
          {doubled.map((a, i) => (
            <AlertItem key={`${a.id}-${i}`} alert={a} />
          ))}
        </div>

        {/* Edge fade — softens the entry/exit so text doesn't pop on hard borders */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-canvas-900/85 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-canvas-900/85 to-transparent" />
      </div>
    </GlassCard>
  );
}
