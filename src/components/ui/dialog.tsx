import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';

/** Buttons share the row equally (Stitch's two-up dialog actions) and wrap on narrow screens. */
export const dialogFooter = 'mt-3 flex flex-wrap gap-2.5 [&>*]:min-h-12 [&>*]:flex-1 [&>*]:basis-[9rem]';

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
      className="max-h-[calc(100%-32px)] w-[min(440px,calc(100%-32px))] overflow-y-auto border-0 bg-transparent p-0 text-ink backdrop:bg-ink/60 backdrop:backdrop-blur-sm max-xs:mb-0 max-xs:max-h-[calc(100%-48px)] max-xs:w-full max-xs:max-w-full"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      {open ? (
        <div className="relative grid animate-rise gap-2 rounded-card bg-surface p-6 shadow-deck max-xs:rounded-b-none max-xs:rounded-t-[1.5rem] max-xs:pb-[calc(24px+env(safe-area-inset-bottom))]">
          {/* Grab handle: the dialog docks to the bottom like a sheet on small phones. */}
          <span className="mx-auto mb-2 h-1 w-10 rounded-full bg-line-strong xs:hidden" aria-hidden="true" />
          <Button variant="ghost" size="icon" className="absolute end-4 top-4 rounded-full bg-sunk max-xs:top-7" onClick={onClose} aria-label={closeLabel}><X size={18} /></Button>
          {icon ? <span className={cn('mb-2 grid h-12 w-12 place-items-center rounded-full', tone === 'danger' ? 'bg-pom-soft text-pom' : 'bg-sunk-2 text-glaze')} aria-hidden="true">{icon}</span> : null}
          <h2 id={titleId} className="pe-12 font-book text-headline-sm font-semibold text-ink ar:leading-[1.5]">{title}</h2>
          {description ? <div id={descriptionId} className="text-body-md text-ink-2">{description}</div> : null}
          {children ? <div className="mt-2">{children}</div> : null}
          {footer ? <div className={dialogFooter}>{footer}</div> : null}
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
            <Button variant="secondary" className="border-transparent bg-sunk-2 [&:not(:disabled):hover]:bg-sunk-3" onClick={() => settle(false)} autoFocus>{options.cancelLabel}</Button>
            <Button variant={options.tone === 'danger' ? 'danger' : 'primary'} onClick={() => settle(true)}>{options.confirmLabel}</Button>
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
