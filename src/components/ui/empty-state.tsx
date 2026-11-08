import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  size?: 'default' | 'compact' | 'large';
  headingLevel?: 'h1' | 'h2' | 'h3';
};

const boxes = {
  default: 'border-[1.5px] border-dashed border-line-strong px-5 py-12',
  compact: 'border-[1.5px] border-dashed border-line-strong px-4 py-7',
  large: 'px-5 py-[72px]',
};

export function EmptyState({ icon, title, description, action, size = 'default', headingLevel: Heading = 'h3' }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2 rounded-2xl text-center', boxes[size])}>
      <span className="mb-1 grid h-[52px] w-[52px] place-items-center rounded-full bg-glaze-soft text-glaze" aria-hidden="true">{icon}</span>
      <Heading className={cn('font-book font-semibold', size === 'large' ? 'text-[clamp(1.75rem,4vw,2.25rem)]' : 'text-xl')}>{title}</Heading>
      {description ? <p className="max-w-[44ch] text-ink-2">{description}</p> : null}
      {action ? <div className="mt-2.5">{action}</div> : null}
    </div>
  );
}
