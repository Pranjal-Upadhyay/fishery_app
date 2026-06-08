import { AuthProvider } from '@/lib/auth-context';
import { LayoutShell } from '@/components/shell/layout-shell';

/**
 * Protected segment — every page under /dashboard inherits:
 *   - AuthProvider (session hydration + logout)
 *   - LayoutShell (sidebar + topbar + alert ticker)
 *
 * Unauthenticated users are bounced to /login by LayoutShell.
 */
export default function DashboardSegmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutShell>{children}</LayoutShell>
    </AuthProvider>
  );
}
