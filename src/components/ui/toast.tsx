import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

type ToastVariant = 'success' | 'error' | 'info';

type Toast = { id: number; variant: ToastVariant; title: string; description?: string };

type ToastApi = {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);
const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
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
      <div className="toast-viewport" aria-live="polite" aria-relevant="additions">
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
      className={cn('toast', `toast-${toast.variant}`)}
      role={toast.variant === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon className="toast-icon" size={20} aria-hidden="true" />
      <div className="toast-body">
        <strong>{toast.title}</strong>
        {toast.description ? <p>{toast.description}</p> : null}
      </div>
      <button type="button" className="toast-close" onClick={() => onDismiss(toast.id)} aria-label={closeLabel}><X size={16} /></button>
      {paused ? null : <span className="toast-timer" style={{ animationDuration: `${durations[toast.variant]}ms` }} aria-hidden="true" />}
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
