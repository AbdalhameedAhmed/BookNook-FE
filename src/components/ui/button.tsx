import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-0 bg-primary text-primary-foreground hover:bg-[#385742]',
        secondary: 'border-0 bg-secondary text-secondary-foreground hover:bg-[#e6e3d8]',
        outline: 'border border-solid border-input bg-transparent text-foreground hover:border-[#aeb3a4] hover:bg-secondary',
        ghost: 'border-0 bg-transparent text-foreground hover:bg-secondary',
        destructive: 'border-0 bg-[#a4472b] text-white hover:bg-[#8b3a22]',
        'destructive-outline': 'border border-solid border-[#e3c4b6] bg-transparent text-[#a4472b] hover:bg-[#f8ebe4]',
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-9 px-3 text-xs',
        icon: 'size-10 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { loading?: boolean };

export function Button({ className, variant, size, type = 'button', loading = false, disabled, children, ...props }: ButtonProps) {
  return (
    <button className={cn('cursor-pointer', buttonVariants({ variant, size }), className)} type={type} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}