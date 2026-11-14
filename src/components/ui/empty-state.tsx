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

/** Stitch's empty states: a soft paper panel with an icon tile, a Literata heading and a single action. */
const boxes = {
  default: 'rounded-card bg-surface px-6 py-12 shadow-card',
  compact: 'rounded-card bg-sunk px-5 py-8',
  large: 'px-5 py-16 md:py-[72px]',
};
const tiles = {
  default: 'h-16 w-16 bg-sunk-2',
  compact: 'h-12 w-12 bg-surface',
  large: 'h-20 w-20 bg-sunk-2 shadow-card',
};
const headings = {
  default: 'text-headline-sm',
  compact: 'text-title-lg',
  large: 'text-display-lg-mobile md:text-headline-lg ar:leading-[1.4]',
};

export function EmptyState({ icon, title, description, action, size = 'default', headingLevel: Heading = 'h3' }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2 text-center', boxes[size])}>
      <span className={cn('mb-2 grid place-items-center rounded-card text-glaze', tiles[size])} aria-hidden="true">{icon}</span>
      <Heading className={cn('max-w-[28ch] font-book font-semibold text-ink ar:tracking-normal', headings[size])}>{title}</Heading>
      {description ? <p className={cn('max-w-[44ch] text-ink-2', size === 'compact' ? 'text-body-md' : 'text-body-lg')}>{description}</p> : null}
      {action ? <div className={cn('flex flex-wrap justify-center gap-2.5', size === 'compact' ? 'mt-2' : 'mt-4')}>{action}</div> : null}
    </div>
  );
}
