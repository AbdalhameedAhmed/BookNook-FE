import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold leading-none ring-1 ring-inset', {
  variants: {
    variant: {
      default: 'bg-primary-soft text-primary ring-[var(--primary-200)]',
      sale: 'bg-[var(--info-50)] text-[var(--info-700)] ring-[var(--info-200)]',
      exchange: 'bg-[var(--violet-50)] text-[var(--violet-700)] ring-[var(--violet-200)]',
      free: 'bg-[var(--warning-50)] text-[var(--warning-700)] ring-[var(--warning-200)]',
      outline: 'bg-card text-foreground ring-[var(--border-strong)]',
    },
  },
  defaultVariants: { variant: 'default' },
});

type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
