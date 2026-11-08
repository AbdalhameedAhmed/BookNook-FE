import type { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { hoverable } from '../../lib/ui';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-quiet' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const base = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-ctl border border-transparent text-center font-semibold leading-[1.2] transition-colors duration-150 ease-[ease] disabled:cursor-not-allowed disabled:opacity-50';

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-[38px] px-3.5 text-sm',
  md: 'min-h-[46px] px-5 text-15',
  lg: 'min-h-[54px] px-[26px] text-base',
  icon: 'h-10 w-10 p-0',
};

const variants: Record<ButtonVariant, string> = {
  primary: `bg-glaze text-on-glaze ${hoverable}:bg-glaze-deep`,
  secondary: `border-line-strong bg-surface text-ink ${hoverable}:border-ink-3`,
  ghost: `bg-transparent text-ink-2 ${hoverable}:bg-sunk ${hoverable}:text-ink`,
  danger: `bg-pom text-white ${hoverable}:brightness-[.92]`,
  'danger-quiet': `border-pom/35 bg-transparent text-pom ${hoverable}:bg-pom-soft`,
  link: 'min-h-10 bg-transparent px-1 font-medium text-ink-3 hover:text-ink hover:underline hover:underline-offset-[3px]',
};

/** Class names for anything that should look like a button, including router links. */
export function buttonClass({ variant = 'primary', size = 'md', block = false }: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean } = {}) {
  // Variant comes after size so the link variant's compact padding wins.
  return cn(base, sizes[size], variants[variant], block && 'flex w-full');
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
};

export function Button({ className, variant, size, block, type = 'button', loading = false, disabled, children, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonClass({ variant, size, block }), className)} type={type} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Loader2 className="animate-spin-fast" size={18} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
