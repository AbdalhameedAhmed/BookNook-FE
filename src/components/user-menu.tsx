import { useCallback } from 'react';
import { Headset, LifeBuoy, LogOut, Settings, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useLanguage } from '../i18n';
import { Avatar } from './avatar';
import { popoverPanel, usePopover } from './popover';
import { useConfirm } from './ui/dialog';
import { useToast } from './ui/toast';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';

/** Asks for confirmation, signs out, and goes home. Shared by the account menu and the Account page. */
export function useSignOutFlow() {
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  return useCallback(async () => {
    const confirmed = await confirm({ title: t('confirmSignOutTitle'), description: t('confirmSignOutCopy'), confirmLabel: t('signOut'), cancelLabel: t('cancel') });
    if (!confirmed) return;
    signOut();
    toast.success(t('signedOutToast'));
    navigate('/', { replace: true });
  }, [confirm, navigate, signOut, t, toast]);
}

const menuItem = 'flex min-h-11 w-full items-center gap-3 rounded-ctl px-3 text-label-lg font-medium text-ink hover:bg-sunk focus-visible:bg-sunk';

/** The avatar in the header: opens a small menu with the account, settings, and sign out. */
export function UserMenu() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const signOut = useSignOutFlow();
  const { open, toggle, close, triggerRef, panelRef } = usePopover();
  if (!session) return null;
  const { user } = session;
  const name = user.display_name || user.email;

  return (
    <div className="sm:relative">
      <button
        ref={triggerRef}
        type="button"
        className="flex items-center gap-2 rounded-full ps-1"
        aria-label={t('accountMenu')}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="account-menu"
        data-tour="account-menu"
        onClick={toggle}
      >
        <span className="hidden max-w-[12ch] truncate text-end text-label-md font-semibold text-ink lg:block" aria-hidden="true">{name}</span>
        <Avatar name={name} url={user.avatar_url} className={cn('h-9 w-9 rounded-full bg-glaze-deep font-sans text-base text-paper shadow-none', open && 'ring-2 ring-glaze ring-offset-2 ring-offset-paper')} />
      </button>
      {open ? (
        <div ref={panelRef} id="account-menu" tabIndex={-1} className={cn(popoverPanel, 'p-2 sm:w-64')}>
          <div className="flex items-center gap-3 px-3 pb-3 pt-2">
            <Avatar name={name} url={user.avatar_url} className="h-11 w-11 text-title-lg" />
            <div className="min-w-0">
              <p className="truncate text-title-md font-bold text-ink">{name}</p>
              <p className={cn(ui.fine, 'truncate')} dir="ltr">{user.email}</p>
            </div>
          </div>
          <nav className="grid gap-0.5 border-t border-line pt-2" aria-label={t('accountMenu')}>
            <Link to="/account" className={menuItem}><UserRound size={18} className="text-ink-2" aria-hidden="true" />{t('menuMyAccount')}</Link>
            <Link to="/settings" className={menuItem}><Settings size={18} className="text-ink-2" aria-hidden="true" />{t('navSettings')}</Link>
            <Link to="/help" className={menuItem}><LifeBuoy size={18} className="text-ink-2" aria-hidden="true" />{t('navHelp')}</Link>
            <Link to="/contact" className={menuItem}><Headset size={18} className="text-ink-2" aria-hidden="true" />{t('navContact')}</Link>
            <button type="button" className={cn(menuItem, 'hover:text-pom')} onClick={() => { close(); void signOut(); }}>
              <LogOut size={18} className="text-ink-2 rtl:-scale-x-100" aria-hidden="true" />{t('signOut')}
            </button>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
