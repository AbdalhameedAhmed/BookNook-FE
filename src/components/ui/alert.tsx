import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, RotateCw, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

type AlertVariant = 'error' | 'success' | 'info';

const icons = { error: AlertCircle, success: CheckCircle2, info: Info };

type AlertProps = {
  variant?: AlertVariant;
  title?: string;
  children?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
};

export function Alert({ variant = 'error', title, children, onRetry, retryLabel, onDismiss, dismissLabel, className }: AlertProps) {
  const Icon = icons[variant];
  return (
    <div className={cn('ui-alert', `ui-alert-${variant}`, className)} role={variant === 'error' ? 'alert' : 'status'}>
      <Icon className="ui-alert-icon" size={20} aria-hidden="true" />
      <div className="ui-alert-body">
        {title ? <strong>{title}</strong> : null}
        {children ? <p>{children}</p> : null}
        {onRetry ? <Button variant="outline" size="sm" className="ui-alert-retry" onClick={onRetry}><RotateCw size={14} aria-hidden="true" />{retryLabel}</Button> : null}
      </div>
      {onDismiss ? <Button variant="ghost" size="icon-sm" className="ui-alert-dismiss" onClick={onDismiss} aria-label={dismissLabel}><X size={16} /></Button> : null}
    </div>
  );
}

/** Small error text placed directly under a form field. */
export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return <span id={id} className="field-error" role="alert"><AlertCircle size={14} aria-hidden="true" />{children}</span>;
}
