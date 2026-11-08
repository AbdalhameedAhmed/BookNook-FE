import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

type ToastVariant = 'success' | 'error' | 'info';

type Toast = { id: number; variant: ToastVariant; title: string; description?: string };

type ToastApi = {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);
const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
const iconTones = { success: 'text-toast-success', error: 'text-toast-error', info: 'text-toast-info' };
// Errors stay a little longer so they can be read.
const durations = { success: 4000, info: 4500, error: 7000 };
const maxVisible = 4;

export function ToastProvider({ children, closeLabel }: { children: ReactNode; closeLabel: string }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const push = useCallback((variant: ToastVariant, title: string, description?: string) => {
    nextId.current += 1;
    const toast = { id: nextId.current, variant, title, description };
    setToasts((current) => [...current.slice(-(maxVisible - 1)), toast]);
  }, []);

  const api = useMemo<ToastApi>(() => ({
    success: (title, description) => push('success', title, description),
    error: (title, description) => push('error', title, description),
    info: (title, description) => push('info', title, description),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-[calc(74px+env(safe-area-inset-bottom))] end-4 z-[60] grid w-[min(380px,calc(100%-32px))] gap-2.5 md:bottom-6" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} closeLabel={closeLabel} />)}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss, closeLabel }: { toast: Toast; onDismiss: (id: number) => void; closeLabel: string }) {
  const [paused, setPaused] = useState(false);
  const Icon = icons[toast.variant];

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => onDismiss(toast.id), durations[toast.variant]);
    return () => window.clearTimeout(timer);
  }, [paused, toast.id, toast.variant, onDismiss]);

  return (
    <div
      className="relative flex animate-rise-toast gap-3 overflow-hidden rounded-xl bg-toast-bg py-3.5 pe-12 ps-4 text-toast-ink shadow-[0_16px_32px_-12px_rgb(14_21_30/.45)]"
      role={toast.variant === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon className={cn('mt-px shrink-0', iconTones[toast.variant])} size={20} aria-hidden="true" />
      <div className="grid gap-0.5 text-15">
        <strong className="font-semibold">{toast.title}</strong>
        {toast.description ? <p className="opacity-[.85]">{toast.description}</p> : null}
      </div>
      <Button variant="ghost" size="icon" className="absolute end-1.5 top-1.5 text-current [&:not(:disabled):hover]:bg-[rgb(127_127_127/.2)] [&:not(:disabled):hover]:text-current" onClick={() => onDismiss(toast.id)} aria-label={closeLabel}><X size={16} /></Button>
      {paused ? null : <span className="absolute bottom-0 start-0 h-[3px] w-full origin-left animate-drain bg-current opacity-30 motion-reduce:hidden rtl:origin-right" style={{ animationDuration: `${durations[toast.variant]}ms` }} aria-hidden="true" />}
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
