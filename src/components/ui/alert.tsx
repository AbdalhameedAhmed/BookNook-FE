import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, RotateCw, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

type AlertVariant = 'error' | 'success' | 'info';

const icons = { error: AlertCircle, success: CheckCircle2, info: Info };
const tones: Record<AlertVariant, { box: string; icon: string }> = {
  error: { box: 'border-pom/30 bg-pom-soft', icon: 'text-pom' },
  success: { box: 'border-glaze/30 bg-glaze-soft', icon: 'text-glaze' },
  info: { box: 'border-cobalt/30 bg-cobalt-soft', icon: 'text-cobalt' },
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
    <div className={cn('relative flex gap-3 rounded-xl border px-4 py-3.5 text-15', tones[variant].box, className)} role={variant === 'error' ? 'alert' : 'status'}>
      <Icon className={cn('mt-px shrink-0', tones[variant].icon)} size={20} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {title ? <strong className="font-semibold">{title}</strong> : null}
        {children ? <div>{children}</div> : null}
        {onRetry ? <Button variant="secondary" size="sm" className="mt-2 self-start" onClick={onRetry}><RotateCw size={14} aria-hidden="true" />{retryLabel}</Button> : null}
      </div>
      {onDismiss ? <Button variant="ghost" size="icon" className="-m-2" onClick={onDismiss} aria-label={dismissLabel}><X size={16} /></Button> : null}
    </div>
  );
}

/** Small error text placed directly under a form field. */
export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return <span id={id} className="inline-flex items-center gap-1.5 text-13 font-medium text-pom" role="alert"><AlertCircle size={14} aria-hidden="true" />{children}</span>;
}
