import { AuthProvider } from '@/lib/auth-context';

/**
 * Public auth segment — wraps /login. Provides the auth context so
 * the login form can call `useAuth().login(...)`.
 */
export default function AuthSegmentLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
