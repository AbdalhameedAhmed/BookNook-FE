import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

// Visual styles live in styles.css (".btn" section) so every clickable control shares one system.
export const buttonVariants = cva('btn', {
  variants: {
    variant: {
      default: 'btn-primary',
      secondary: 'btn-secondary',
      outline: 'btn-outline',
      ghost: 'btn-ghost',
      destructive: 'btn-danger',
      'destructive-outline': 'btn-danger-outline',
      inverse: 'btn-inverse',
      link: 'btn-link',
    },
    size: {
      default: 'btn-md',
      sm: 'btn-sm',
      lg: 'btn-lg',
      icon: 'btn-icon',
      'icon-sm': 'btn-icon-sm',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { loading?: boolean };

export function Button({ className, variant, size, type = 'button', loading = false, disabled, children, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} type={type} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Loader2 className="btn-spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
