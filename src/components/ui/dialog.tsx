import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';
import { Button } from './button';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'danger';
  closeLabel: string;
  children?: ReactNode;
  footer?: ReactNode;
};

/** Accessible modal built on the native <dialog> element (focus trap, Escape, backdrop). */
export function Dialog({ open, onClose, title, description, icon, tone = 'default', closeLabel, children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={tone === 'danger' ? 'ui-dialog ui-dialog-danger' : 'ui-dialog'}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      {open ? (
        <div className="ui-dialog-panel">
          <Button variant="ghost" size="icon-sm" className="ui-dialog-close" onClick={onClose} aria-label={closeLabel}><X size={18} /></Button>
          {icon ? <span className="ui-dialog-icon" aria-hidden="true">{icon}</span> : null}
          <h2 id={titleId}>{title}</h2>
          {description ? <div id={descriptionId} className="ui-dialog-description">{description}</div> : null}
          {children}
          {footer ? <div className="ui-dialog-footer">{footer}</div> : null}
        </div>
      ) : null}
    </dialog>
  );
}

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: 'default' | 'danger';
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children, closeLabel }: { children: ReactNode; closeLabel: string }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((nextOptions) => {
    resolver.current?.(false);
    setOptions(nextOptions);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);

  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={options !== null}
        onClose={() => settle(false)}
        title={options?.title ?? ''}
        description={options?.description}
        tone={options?.tone}
        icon={options?.tone === 'danger' ? <AlertTriangle size={22} /> : <HelpCircle size={22} />}
        closeLabel={closeLabel}
        footer={options ? (
          <>
            <Button variant="outline" onClick={() => settle(false)} autoFocus>{options.cancelLabel}</Button>
            <Button variant={options.tone === 'danger' ? 'destructive' : 'default'} onClick={() => settle(true)}>{options.confirmLabel}</Button>
          </>
        ) : null}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within ConfirmProvider');
  return context;
}
