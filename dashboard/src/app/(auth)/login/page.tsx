'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { LoginHero } from './login-hero';
import { TypewriterBrand } from './typewriter-brand';

export default function LoginPage() {
  const router = useRouter();
  const { admin, login, isLoading: bootLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If a session already exists, skip the login screen.
  useEffect(() => {
    if (!bootLoading && admin) {
      router.replace('/dashboard');
    }
  }, [admin, bootLoading, router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setError('Too many attempts. Please wait 15 minutes and try again.');
        } else if (err.status === 423) {
          setError('Account temporarily locked due to repeated failures. Try again later.');
        } else if (err.status === 408 || err.status === 0) {
          setError('Server connection timed out or is starting up. Please click Continue again in a moment.');
        } else if (err.status >= 500) {
          setError('Server error during authentication. Please try again in a few seconds.');
        } else {
          setError('Invalid email or password.');
        }
      } else {
        setError('An unexpected connection error occurred. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen">
      {/* Theme toggle — top-right corner */}
      <div className="fixed right-6 top-6 z-50">
        <ThemeToggle />
      </div>

      <LoginHero>
        {/* Brand mark with typewriter animation and enlarged fonts */}
        <TypewriterBrand />

        <GlassCard className="p-8 shadow-popup">
          <header className="mb-7">
            <h1 className="text-3xl font-bold leading-tight text-ink-primary">
              Sign in
            </h1>
            <p className="mt-3 text-base leading-relaxed text-ink-secondary">
              Authorised access only. All activity is logged and auditable.
            </p>
          </header>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
            // Prevent browsers from caching credentials in form auto-restore
            autoComplete="on"
            noValidate
          >
            <Input
              label="Email"
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@matsyamitra.in"
            />

            <PasswordInput
              label="Password"
              name="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              error={error ?? undefined}
              hideOnBlur={true}
              minLength={12}
            />

            <Button
              type="submit"
              loading={submitting}
              className="w-full h-12 text-base"
            >
              <span>Continue</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-7 flex items-start gap-3 rounded-lg border border-glass-border bg-glass-subtle p-4 text-sm leading-relaxed text-ink-secondary">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
            <span>
              This dashboard is for designated state officers and DLC members.
              Farmer accounts cannot sign in here. Sessions expire after 8 hours
              or 30 minutes of inactivity.
            </span>
          </div>
        </GlassCard>

        <p className="mt-8 text-center text-xs text-ink-muted">
          © Government of Bihar · Department of Animal &amp; Fisheries Resources
        </p>
      </LoginHero>
    </div>
  );
}
