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

export function EmptyState({ icon, title, description, action, size = 'default', headingLevel: Heading = 'h3' }: EmptyStateProps) {
  return (
    <div className={cn('empty-state', size !== 'default' && `empty-state-${size}`)}>
      <span className="empty-icon" aria-hidden="true">{icon}</span>
      <Heading className="empty-title">{title}</Heading>
      {description ? <p className="empty-description">{description}</p> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}
