import { GlassCard } from '@/components/ui/glass-card';
import type { LucideIcon } from 'lucide-react';
import { Construction } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Placeholder shown for routes whose feature isn't built yet.
 * Sits inside the dashboard layout so the sidebar / ticker / theme toggle
 * stay live, and an officer can pivot to any other route without using
 * the browser back button.
 *
 * Pass an `icon` to match the sidebar item's icon, and a `layer` to
 * communicate where in the build plan it lands.
 */
interface ComingSoonProps {
  title: string;
  description: string;
  icon: LucideIcon;
  layer?: 'L2' | 'L3' | 'L4';
  bullets?: string[];
}

const LAYER_NOTES: Record<NonNullable<ComingSoonProps['layer']>, string> = {
  L2: 'Coming in the next build pass — map, alerts, and scheme CMS land together.',
  L3: 'Coming in the feature-breadth pass after L2 — built in parallel with other admin tools.',
  L4: 'Polish & ops pass — instrumentation, audit log UI, monitoring.',
};

export function ComingSoon({
  title,
  description,
  icon: Icon,
  layer,
  bullets,
}: ComingSoonProps) {
  return (
    <div className="relative h-full w-full overflow-y-auto px-6 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Title block — uses the same hierarchy as future production pages */}
        <header className="mb-8 flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-teal-400/30 bg-teal-500/10 text-teal-400 shadow-glow">
            <Icon className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-secondary">
              Admin Module
            </div>
            <h1 className="mt-1 text-3xl font-bold leading-tight text-ink-primary">
              {title}
            </h1>
            <p className="mt-3 text-base leading-relaxed text-ink-secondary">
              {description}
            </p>
          </div>
        </header>

        {/* Build status card */}
        <GlassCard className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-glass-strong text-teal-400">
              <Construction className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-secondary">
                Build status
              </div>
              <div className="text-lg font-bold text-ink-primary">In the queue</div>
            </div>
            {layer ? (
              <span
                className={cn(
                  'ml-auto rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]',
                  'border-teal-400/40 bg-teal-500/10 text-teal-300',
                )}
              >
                {layer}
              </span>
            ) : null}
          </div>

          {layer ? (
            <p className="text-base leading-relaxed text-ink-secondary">
              {LAYER_NOTES[layer]}
            </p>
          ) : null}

          {bullets && bullets.length > 0 ? (
            <ul className="mt-5 space-y-2 border-t border-glass-border pt-5">
              {bullets.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-base leading-relaxed text-ink-secondary"
                >
                  <span
                    aria-hidden
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </GlassCard>

        <p className="mt-6 text-sm italic text-ink-muted">
          Use the sidebar to switch modules. Your session, theme, and active
          alerts persist across navigation.
        </p>
      </div>
    </div>
  );
}
