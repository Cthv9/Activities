import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ' +
  'transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-surface-0 hover:bg-brand-strong',
  secondary: 'bg-surface-2 text-text-primary border border-border-strong hover:bg-surface-3',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-2 hover:text-text-primary',
  danger: 'bg-danger/90 text-surface-0 hover:bg-danger',
};

export function Button({ variant = 'primary', loading, className = '', children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading ? 'Attendere…' : children}
    </button>
  );
}
