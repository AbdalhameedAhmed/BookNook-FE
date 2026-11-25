import { useCallback, useEffect, useState } from 'react';
import { Bell, BellRing, CheckCheck, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useActivity } from '../activity';
import { useAuth } from '../auth';
import { describeError } from '../errors';
import { useLanguage } from '../i18n';
import { enablePush, getPushState } from '../push';
import type { PushState } from '../push';
import type { AppNotification } from '../types';
import { ListSkeleton, NotificationRow, notificationLink } from '../pages/Notifications';
import { fill } from './deals';
import { popoverPanel, usePopover } from './popover';
import { useToast } from './ui/toast';
import { cn } from '../lib/utils';

const TRAY_SIZE = 8;

/**
 * The header bell. Opens a tray with the latest notifications, "Mark all read", a link to the full
 * list, and a one-tap prompt to turn on alerts when this device has them off.
 */
export function NotificationTray({ buttonClassName }: { buttonClassName: string }) {
  const { t } = useLanguage();
  const { unreadNotifications } = useActivity();
  const { open, toggle, triggerRef, panelRef } = usePopover();
  const label = unreadNotifications > 0 ? fill(t('notificationsUnread'), { count: unreadNotifications }) : t('navNotifications');

  return (
    <div className="sm:relative">
      <button
        ref={triggerRef}
        type="button"
        className={cn(buttonClassName, 'relative w-10', open && 'border-glaze bg-glaze-soft/40 text-glaze-deep')}
        aria-label={label}
        title={t('navNotifications')}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="notification-tray"
        data-tour="bell"
        onClick={toggle}
      >
        <Bell size={18} aria-hidden="true" />
        {unreadNotifications > 0 ? (
          <span className="absolute -end-1.5 -top-1.5 inline-grid min-w-5 place-items-center rounded-full bg-pom px-1 text-[11px] font-bold leading-5 text-white ring-2 ring-paper" aria-hidden="true">
            {unreadNotifications > 9 ? '9+' : unreadNotifications}
          </span>
        ) : null}
      </button>
      {open ? (
        <div ref={panelRef} id="notification-tray" role="dialog" aria-labelledby="notification-tray-title" tabIndex={-1} className={cn(popoverPanel, 'sm:w-[400px]')}>
          <TrayContent />
        </div>
      ) : null}
    </div>
  );
}

function TrayContent() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  const { setUnreadNotifications } = useActivity();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const token = session?.access_token;

  const load = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const page = await api.notifications.list(token, undefined, TRAY_SIZE);
      setItems(page.items);
      setUnreadNotifications(page.unread_count);
    } catch (reason) {
      setError(describeError(reason, t, 'notificationsFailed'));
    }
  }, [token, t, setUnreadNotifications]);

  useEffect(() => { void load(); }, [load]);

  const markRead = async (ids?: string[]) => {
    if (!token) return;
    const result = await api.notifications.markRead(token, ids);
    const now = new Date().toISOString();
    setItems((current) => current?.map((item) => (!ids || ids.includes(item.id)) && !item.read_at ? { ...item, read_at: now } : item) ?? null);
    setUnreadNotifications(result.unread_count);
  };

  const open = (item: AppNotification) => {
    if (!item.read_at) void markRead([item.id]).catch(() => undefined);
    navigate(notificationLink(item));
  };

  const markAll = async () => {
    setMarkingAll(true);
    try { await markRead(); }
    catch (reason) { toast.error(t('markReadFailed'), describeError(reason, t, 'markReadFailed')); }
    finally { setMarkingAll(false); }
  };

  const unread = items?.filter((item) => !item.read_at).length ?? 0;

  return (
    <>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <h2 id="notification-tray-title" className="font-book text-title-lg font-semibold text-ink ar:leading-[1.5]">{t('notificationsTitle')}</h2>
        <div className="ms-auto flex items-center gap-1">
          {unread > 0 ? (
            <button type="button" disabled={markingAll} onClick={() => void markAll()} className="inline-flex min-h-10 items-center gap-1.5 rounded-ctl px-2.5 text-label-md font-semibold text-glaze-deep hover:bg-sunk disabled:opacity-60">
              <CheckCheck size={16} aria-hidden="true" />{t('markAllRead')}
            </button>
          ) : null}
          <Link to="/settings/notifications" className="grid h-10 w-10 place-items-center rounded-ctl text-ink-2 hover:bg-sunk hover:text-ink" aria-label={t('alertSettingsLink')} title={t('alertSettingsLink')}>
            <Settings size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <PushNudge />

      <div className="max-h-[min(60vh,440px)] overflow-y-auto overscroll-contain" aria-live="polite">
        {error ? (
          <div className="grid justify-items-start gap-2 px-4 py-5 text-body-sm text-ink-2">
            <p>{error}</p>
            <button type="button" className="text-label-md font-semibold text-glaze-deep underline underline-offset-[3px]" onClick={() => void load()}>{t('tryAgain')}</button>
          </div>
        ) : items === null ? (
          <ListSkeleton label={t('loadingNotifications')} rows={3} className="rounded-none shadow-none" />
        ) : items.length === 0 ? (
          <div className="grid justify-items-center gap-2 px-6 py-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-sunk-2 text-glaze-deep" aria-hidden="true"><Bell size={22} /></span>
            <p className="text-title-md font-bold text-ink">{t('notificationsEmptyTitle')}</p>
            <p className="max-w-[30ch] text-body-sm text-ink-2">{t('trayEmptyCopy')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item) => <NotificationRow key={item.id} item={item} compact onOpen={() => open(item)} />)}
          </ul>
        )}
      </div>

      <Link to="/notifications" className="flex min-h-12 items-center justify-center border-t border-line bg-sunk/60 px-4 text-label-lg font-semibold text-glaze-deep hover:bg-sunk">
        {t('seeAllNotifications')}
      </Link>
    </>
  );
}

/** One-line prompt shown only while this browser could get alerts but has them off. */
function PushNudge() {
  const { session } = useAuth();
  const { t, language } = useLanguage();
  const toast = useToast();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void getPushState().then((next) => { if (active) setState(next); });
    return () => { active = false; };
  }, []);

  if (state !== 'off' || !session) return null;

  const turnOn = async () => {
    setBusy(true);
    try {
      const next = await enablePush(session.access_token, language);
      setState(next);
      if (next === 'on') toast.success(t('pushOnToast'));
    } catch (reason) {
      toast.error(t('pushFailed'), describeError(reason, t, 'pushFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 border-b border-line bg-glaze-soft/30 px-4 py-2.5">
      <BellRing size={18} className="flex-none text-glaze-deep" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-body-sm font-medium text-ink">{t('pushNudge')}</p>
      <button type="button" disabled={busy} onClick={() => void turnOn()} className="inline-flex min-h-9 flex-none items-center rounded-full bg-glaze px-3.5 text-label-md font-semibold text-on-glaze hover:bg-glaze-deep disabled:opacity-60">
        {t('pushNudgeAction')}
      </button>
    </div>
  );
}
