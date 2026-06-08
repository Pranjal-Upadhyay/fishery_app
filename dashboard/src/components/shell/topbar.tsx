'use client';

import { useState } from 'react';
import { Search, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/cn';

const ROLE_LABELS: Record<string, string> = {
  block_officer:    'Block Officer',
  district_officer: 'District Officer',
  dlc_member:       'DLC Member',
  superadmin:       'Superadmin',
};

export function Topbar() {
  const { admin, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-50 flex h-14 shrink-0 items-center gap-4 border-b border-glass-border bg-canvas-900/40 px-5 backdrop-blur-glass">
      {/* Page heading slot — pages can portal into this later; for now we
          show the breadcrumb-style brand line. */}
      <div className="flex items-baseline gap-3">
        <span className="text-lg font-bold leading-none text-ink-primary">MatsyaMitra</span>
        <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-secondary">
          Admin Oversight
        </span>
      </div>

      {/* Command search — placeholder for L1; opens command palette later */}
      <div className="ml-6 flex h-10 max-w-md flex-1 items-center gap-2 rounded-lg border border-glass-border bg-glass-subtle px-3 text-sm text-ink-secondary">
        <Search className="h-4 w-4" />
        <span className="font-mono text-xs">Search farmers, ponds, schemes…</span>
        <kbd className="ml-auto rounded border border-glass-border bg-glass px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
          ⌘K
        </kbd>
      </div>

      {/* Theme toggle — sits just before the user menu */}
      <ThemeToggle className="ml-auto" />

      {/* User menu — far right */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((s) => !s)}
          className="flex items-center gap-2 rounded-lg border border-glass-border bg-glass px-2.5 py-1.5 text-sm text-ink-primary backdrop-blur-glass transition-colors hover:bg-glass-strong"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-teal-500/20 text-teal-200">
            <UserIcon className="h-4 w-4" />
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span className="text-sm">{admin?.fullName ?? 'Loading…'}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-secondary">
              {admin ? ROLE_LABELS[admin.role] : '—'}
            </span>
          </span>
          <ChevronDown className={cn('h-3.5 w-3.5 text-ink-muted transition-transform', menuOpen && 'rotate-180')} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-glass border border-glass-border bg-canvas-800 p-1 shadow-glass">
            <div className="border-b border-glass-border px-3 py-2.5">
              <div className="truncate text-sm text-ink-primary">{admin?.email}</div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                Scope: {(admin?.assignedStateCodes ?? []).join(', ') || '—'}
              </div>
            </div>
            <button
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink-primary hover:bg-glass"
            >
              <LogOut className="h-4 w-4 text-severity-critical" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
