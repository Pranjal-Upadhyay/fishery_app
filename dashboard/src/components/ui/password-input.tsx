'use client';

import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  /**
   * If true, the field will auto-revert to obscured after blur. Default true —
   * matches government desktop UX where leaving the field visible while
   * unattended is a disclosure risk.
   */
  hideOnBlur?: boolean;
}

/**
 * Password input with a "reveal" eye toggle.
 *
 * Security notes:
 *   - The toggle is purely client-side; the value is never transmitted or
 *     logged differently based on visibility state.
 *   - `autoComplete="current-password"` is set so password managers work
 *     correctly. We do NOT set `autoCorrect` / `autoCapitalize` (off by
 *     default for type=password and explicit here for clarity).
 *   - When the field loses focus (`hideOnBlur=true`), it re-obscures so an
 *     officer who walks away from the screen isn't exposing their password.
 *   - The reveal button is a separate <button type="button"> so pressing
 *     Enter to submit the form never accidentally triggers reveal.
 *   - The button announces its state via aria-pressed and aria-label so
 *     screen-reader users get the same affordance.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    { label, hint, error, hideOnBlur = true, className, id, onBlur, ...rest },
    ref
  ) {
    const [visible, setVisible] = useState(false);
    const inputId = id ?? rest.name;

    return (
      <div className="w-full">
        {label ? (
          <label
            htmlFor={inputId}
            className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-secondary"
          >
            {label}
          </label>
        ) : null}

        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? 'text' : 'password'}
            autoComplete="current-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            {...rest}
            onBlur={(e) => {
              if (hideOnBlur) setVisible(false);
              onBlur?.(e);
            }}
            className={cn(
              'w-full h-12 rounded-lg border bg-glass-subtle px-4 pr-12 text-base text-ink-primary placeholder:text-ink-muted',
              'border-glass-border focus:border-teal-400 focus:bg-glass focus:outline-none focus:ring-2 focus:ring-teal-400/40',
              'transition-colors',
              error && 'border-severity-critical/70 focus:border-severity-critical focus:ring-severity-critical/25',
              className
            )}
          />
          <button
            type="button"
            aria-pressed={visible}
            aria-label={visible ? 'Hide password' : 'Show password'}
            onClick={() => setVisible((v) => !v)}
            // Tab last — accessibility flow is field → submit, not field → eye
            tabIndex={-1}
            className={cn(
              'absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md',
              'text-ink-muted transition-colors hover:text-ink-primary hover:bg-glass',
              'focus:outline-none focus:ring-2 focus:ring-teal-400/40'
            )}
          >
            {/* Icon mirrors current state, not the action:
                visible=true  → password is shown  → open Eye
                visible=false → password is hidden → struck-through EyeOff */}
            {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-2 text-sm text-severity-critical">
            {error}
          </p>
        ) : hint ? (
          <p className="mt-2 text-sm text-ink-muted">{hint}</p>
        ) : null}
      </div>
    );
  }
);
