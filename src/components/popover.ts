import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Open/close state for a header popover (notification tray, account menu).
 * Closes on Escape (returning focus to the trigger), on a click outside, and on navigation.
 */
export function usePopover() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const toggle = useCallback(() => setOpen((current) => !current), []);
  const close = useCallback(() => setOpen(false), []);
  return { open, toggle, close, triggerRef, panelRef };
}

/**
 * Panel placement: full width under the header on phones (the trigger's wrapper is only
 * `relative` from `sm`, so the panel anchors to the sticky header), and under the trigger's end edge above that.
 */
export const popoverPanel =
  'absolute inset-x-[var(--gutter)] top-[calc(100%+8px)] z-50 origin-top animate-tray overflow-hidden rounded-card border border-line bg-surface shadow-deck focus:outline-none motion-reduce:animate-none sm:inset-x-auto sm:end-0 sm:origin-top-right sm:rtl:origin-top-left';
