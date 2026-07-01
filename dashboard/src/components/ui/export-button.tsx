import { ButtonHTMLAttributes } from 'react';
import { Download } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ExportButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export function ExportButton({
  label = 'Export CSV',
  className,
  onClick,
  disabled,
  ...rest
}: ExportButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30 transition-all hover:bg-white hover:text-slate-950 hover:border-white active:scale-95 duration-200 shadow-[0_2px_12px_rgba(20,184,166,0.30)] hover:shadow-[0_4px_20px_rgba(255,255,255,0.45)] disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...rest}
    >
      <Download className="h-3.5 w-3.5 text-current" />
      <span>{label}</span>
    </button>
  );
}
