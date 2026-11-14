import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, RotateCw, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

type AlertVariant = 'error' | 'success' | 'info';

const icons = { error: AlertCircle, success: CheckCircle2, info: Info };
const tones: Record<AlertVariant, { box: string; icon: string }> = {
  error: { box: 'border-pom/20 bg-pom-soft', icon: 'bg-surface text-pom' },
  success: { box: 'border-glaze/20 bg-glaze-soft', icon: 'bg-surface text-glaze-deep' },
  info: { box: 'border-cobalt/20 bg-cobalt-soft', icon: 'bg-surface text-cobalt' },
};

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
    <div className={cn('relative flex items-start gap-3 rounded-xl border p-3.5 text-body-md text-ink', tones[variant].box, className)} role={variant === 'error' ? 'alert' : 'status'}>
      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full', tones[variant].icon)} aria-hidden="true"><Icon size={18} /></span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 self-center">
        {title ? <strong className="text-label-lg font-semibold">{title}</strong> : null}
        {children ? <div className="text-ink-2">{children}</div> : null}
        {onRetry ? <Button variant="secondary" size="sm" className="mt-2 self-start border-transparent" onClick={onRetry}><RotateCw size={14} aria-hidden="true" />{retryLabel}</Button> : null}
      </div>
      {onDismiss ? <Button variant="ghost" size="icon" className="-me-1.5 -mt-0.5 rounded-full" onClick={onDismiss} aria-label={dismissLabel}><X size={16} /></Button> : null}
    </div>
  );
}

/** Small error text placed directly under a form field. */
export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return <span id={id} className="inline-flex items-center gap-1.5 text-13 font-medium text-pom" role="alert"><AlertCircle size={14} aria-hidden="true" />{children}</span>;
}
