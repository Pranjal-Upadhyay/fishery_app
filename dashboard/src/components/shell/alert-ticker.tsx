'use client';

import Link from 'next/link';
import { AlertTriangle, Activity, Bell, ShieldAlert } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { cn } from '@/lib/cn';
import { MOCK_ALERTS, AlertItem } from '@/lib/alerts-data';

/**
 * Alert ticker — the always-on banner sliding across the top of the dashboard.
 *
 * - Derives its content from the same MOCK_ALERTS array used by /dashboard/alerts,
 *   so the ticker always reflects what is actually in the alert section.
 * - Only shows UNRESOLVED alerts (resolved ones are archived on the alerts page).
 * - Clicking any ticker item navigates to /dashboard/alerts?id=<alertId>, which
 *   auto-expands and scrolls to that specific alert card.
 * - Hovering pauses the animation so an officer can read a specific alert.
 */

interface TickerAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  label: string;
  message: string;
  scope?: string;
}

/** Map an AlertItem to the compact TickerAlert shape shown in the banner. */
function toTickerAlert(a: AlertItem): TickerAlert {
  return {
    id: a.id,
    severity: a.severity, // 'critical' | 'warning' — both valid TickerAlert severities
    label: a.type === 'Disease Outbreak' ? 'Disease Flag' : 'Water Alert',
    message: a.title,
    scope: a.location,
  };
}

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

function AlertTickerItem({ alert }: { alert: TickerAlert }) {
  const sev = severityClasses[alert.severity];
  const Icon = severityIcons[alert.severity];
  return (
    <Link
      href={`/dashboard/alerts?id=${alert.id}`}
      className="inline-flex shrink-0 items-center gap-3 px-5 cursor-pointer group"
      title={`Click to view: ${alert.message}`}
    >
      <span className={cn('h-2 w-2 rounded-full', sev.dot)} aria-hidden />
      <Icon className="h-3.5 w-3.5 text-ink-secondary group-hover:text-ink-primary transition-colors" aria-hidden />
      <span
        className={cn(
          'rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]',
          sev.chip
        )}
      >
        {alert.label}
      </span>
      <span className="text-sm text-ink-primary group-hover:text-teal-300 transition-colors underline-offset-2 group-hover:underline">
        {alert.message}
      </span>
      {alert.scope ? (
        <span className="font-mono text-[11px] text-ink-muted">· {alert.scope}</span>
      ) : null}
      <span className="mx-3 h-3 w-px bg-glass-border" aria-hidden />
    </Link>
  );
}

export function AlertTicker() {
  // Only show active (unresolved) alerts in the banner — same as the alert section.
  const activeAlerts = MOCK_ALERTS.filter((a) => !a.resolved).map(toTickerAlert);

  // Duplicate once so the translate3d(-50%, 0, 0) loop has no visible seam.
  const doubled = [...activeAlerts, ...activeAlerts];

  if (activeAlerts.length === 0) return null;

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
            <AlertTickerItem key={`${a.id}-${i}`} alert={a} />
          ))}
        </div>

        {/* Edge fade */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-canvas-900/85 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-canvas-900/85 to-transparent" />
      </div>
    </GlassCard>
  );
}
