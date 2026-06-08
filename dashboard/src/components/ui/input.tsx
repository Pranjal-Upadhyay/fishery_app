import { cn } from '@/lib/cn';
import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, hint, error, className, id, ...rest }, ref) {
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
        <input
          ref={ref}
          id={inputId}
          {...rest}
          className={cn(
            'w-full h-12 rounded-lg border bg-glass-subtle px-4 text-base text-ink-primary placeholder:text-ink-muted',
            'border-glass-border focus:border-teal-400 focus:bg-glass focus:outline-none focus:ring-2 focus:ring-teal-400/40',
            'transition-colors',
            error && 'border-severity-critical/70 focus:border-severity-critical focus:ring-severity-critical/25',
            className
          )}
        />
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
