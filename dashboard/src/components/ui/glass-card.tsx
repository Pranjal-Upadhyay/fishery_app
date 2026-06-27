import { cn } from '@/lib/cn';
import type { HTMLAttributes } from 'react';

/**
 * Frosted-glass surface used for nav, side panels, modals, and the alert banner.
 * Intentionally NOT used for data tables / charts — those stay solid for legibility.
 *
 * Variants:
 *   default — standard glass panel
 *   subtle  — lighter wash for nested cards
 *   strong  — higher opacity, used for overlays that need more presence
 */
interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'strong' | 'solid';
}

export function GlassCard({
  variant = 'default',
  className,
  children,
  ...rest
}: GlassCardProps) {
  const tint =
    variant === 'subtle'
      ? 'bg-glass-subtle'
      : variant === 'strong'
        ? 'bg-glass-strong'
        : variant === 'solid'
          ? 'bg-canvas-800'
          : 'bg-glass';

  const ring =
    variant === 'strong'
      ? 'border-glass-borderStrong'
      : 'border-glass-border';

  return (
    <div
      {...rest}
      className={cn(
        'relative rounded-glass border backdrop-blur-glass shadow-glass',
        tint,
        ring,
        className
      )}
    >
      {children}
    </div>
  );
}
