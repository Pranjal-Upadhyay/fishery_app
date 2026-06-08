'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { IdleWatcher } from '@/lib/idle-watcher';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { AlertTicker } from './alert-ticker';

/**
 * Wraps every protected dashboard page.
 * - Boots unauthenticated users to /login.
 * - Auto-logs-out after 30 minutes of inactivity (security policy).
 * - Renders the sidebar, topbar, and the always-on alert ticker.
 */
export function LayoutShell({ children }: { children: React.ReactNode }) {
  const { admin, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !admin) {
      router.replace('/login');
    }
  }, [admin, isLoading, router]);

  if (isLoading || !admin) {
    return (
      <div className="grid h-screen place-items-center">
        <div className="flex items-center gap-3 text-ink-muted">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-400 border-r-transparent" />
          <span className="text-sm">Checking session…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <IdleWatcher onIdle={logout} />
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <AlertTicker />
        <main className="relative flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
