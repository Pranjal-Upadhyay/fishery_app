'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Map as MapIcon,
  BellRing,
  ScrollText,
  TrendingUp,
  Stethoscope,
  Sprout,
  Activity,
  Users,
  Settings2,
  Waves,
  Store,
  ClipboardCheck,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface NavItem {
  href: string;
  label: string;
  icon: typeof MapIcon;
}

const NAV: NavItem[] = [
  { href: '/dashboard',             label: 'Map',           icon: MapIcon },
  { href: '/dashboard/alerts',      label: 'Alerts',        icon: BellRing },
  { href: '/dashboard/applications', label: 'Applications',  icon: ClipboardCheck },
  { href: '/dashboard/schemes',     label: 'Schemes',       icon: ScrollText },
  { href: '/dashboard/subsidies',   label: 'Subsidies',     icon: TrendingUp },
  { href: '/dashboard/water',       label: 'Water Quality', icon: Activity },
  { href: '/dashboard/production',  label: 'Production',    icon: Sprout },
  { href: '/dashboard/doctors',     label: 'Doctors',       icon: Stethoscope },
  { href: '/dashboard/hatcheries',  label: 'Hatcheries',    icon: Waves },
  { href: '/dashboard/farmers',     label: 'Farmers',       icon: Users },
  { href: '/dashboard/marketplace',  label: 'Marketplace',   icon: Store },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative z-40 flex h-full w-[72px] flex-col items-center border-r border-glass-border bg-canvas-900/40 backdrop-blur-glass">
      {/* Brand mark */}
      <Link
        href="/dashboard"
        className="my-4 flex h-11 w-11 items-center justify-center rounded-xl border border-teal-400/30 bg-teal-500/15 text-teal-300 shadow-glow"
        aria-label="MatsyaMitra home"
      >
        <Waves className="h-5 w-5" />
      </Link>

      <div className="mx-auto mb-2 h-px w-8 bg-glass-border" />

      {/* Nav stack */}
      <nav className="flex flex-1 flex-col items-center gap-1 py-2">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                'group relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
                active
                  ? 'bg-teal-500/15 text-teal-200'
                  : 'text-ink-secondary hover:bg-glass hover:text-ink-primary'
              )}
            >
              {/* Active rail */}
              {active && (
                <span className="absolute -left-3 h-6 w-[3px] rounded-r-full bg-teal-300 shadow-[0_0_8px_2px_rgba(57,212,173,0.45)]" />
              )}
              <Icon className="h-[18px] w-[18px]" />
              {/* Tooltip */}
              <span
                role="tooltip"
                className="pointer-events-none absolute left-[58px] z-50 whitespace-nowrap rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-50 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100"
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <Link
        href="/dashboard/settings"
        prefetch={false}
        className="group relative my-4 flex h-11 w-11 items-center justify-center rounded-xl text-ink-secondary transition-colors hover:bg-glass hover:text-ink-primary"
        aria-label="Settings"
      >
        <Settings2 className="h-[18px] w-[18px]" />
        {/* Tooltip */}
        <span
          role="tooltip"
          className="pointer-events-none absolute left-[58px] z-50 whitespace-nowrap rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-50 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100"
        >
          Settings
        </span>
      </Link>
    </aside>
  );
}
