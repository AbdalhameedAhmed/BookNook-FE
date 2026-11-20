import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Ban, Bell, BellOff, BellRing, CheckCheck, CheckCircle2, Handshake, Inbox, MessageCircle, Undo2, Wallet, XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { useActivity } from '../activity';
import { useLanguage } from '../i18n';
import type { MessageKey } from '../i18n';
import { describeError } from '../errors';
import { disablePush, enablePush, getPushState } from '../push';
import { needsIosInstall } from '../install';
import { InstallCard } from '../components/install-card';
import type { PushState } from '../push';
import type { AppNotification, NotificationKind } from '../types';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { useToast } from '../components/ui/toast';
import { fill, useEgp } from '../components/deals';
import { formatDateTime } from './Wallet';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';

const PAGE_SIZE = 30;

/** Where tapping a notification goes (keep in step with LINKS in Rfoof-BE/app/core/push.py). */
const links: Record<NotificationKind, string> = {
  request_new: '/account/requests',
  request_rejected: '/account/requests',
  request_unavailable: '/account/requests',
  request_cancelled: '/account/requests',
  request_accepted: '/account/handovers',
  deal_confirmed_by_other: '/account/handovers',
  deal_completed: '/account/handovers',
  deal_cancelled: '/account/handovers',
  message: '/account/handovers',
  topup_approved: '/account/wallet',
  topup_rejected: '/account/wallet',
};

const looks: Record<NotificationKind, { icon: ReactNode; tone: string; text: MessageKey }> = {
  request_new: { icon: <Inbox size={20} />, tone: 'bg-glaze-soft text-glaze-deep', text: 'notifRequestNew' },
  request_accepted: { icon: <CheckCircle2 size={20} />, tone: 'bg-glaze-soft text-glaze-deep', text: 'notifRequestAccepted' },
  request_rejected: { icon: <XCircle size={20} />, tone: 'bg-sunk-3 text-ink-2', text: 'notifRequestRejected' },
  request_unavailable: { icon: <Ban size={20} />, tone: 'bg-sunk-3 text-ink-2', text: 'notifRequestUnavailable' },
  request_cancelled: { icon: <Undo2 size={20} />, tone: 'bg-sunk-3 text-ink-2', text: 'notifRequestCancelled' },
  deal_confirmed_by_other: { icon: <Handshake size={20} />, tone: 'bg-ochre-soft text-ochre-ink', text: 'notifDealConfirmed' },
  deal_completed: { icon: <CheckCheck size={20} />, tone: 'bg-cobalt-soft text-cobalt-ink', text: 'notifDealCompleted' },
  deal_cancelled: { icon: <Ban size={20} />, tone: 'bg-pom-soft text-pom', text: 'notifDealCancelled' },
  message: { icon: <MessageCircle size={20} />, tone: 'bg-cobalt-soft text-cobalt-ink', text: 'notifMessage' },
  topup_approved: { icon: <Wallet size={20} />, tone: 'bg-glaze-soft text-glaze-deep', text: 'notifTopupApproved' },
  topup_rejected: { icon: <Wallet size={20} />, tone: 'bg-pom-soft text-pom', text: 'notifTopupRejected' },
};

export function NotificationsPage() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  const { setUnreadNotifications } = useActivity();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const token = session?.access_token;

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const page = await api.notifications.list(token);
      setItems(page.items);
      setHasMore(page.items.length === PAGE_SIZE);
      setUnreadNotifications(page.unread_count);
      setError('');
    } catch (reason) {
      setError(describeError(reason, t, 'notificationsFailed'));
    } finally {
      setLoading(false);
    }
  }, [token, t, setUnreadNotifications]);

  useEffect(() => { void load(); }, [load]);

  const loadMore = async () => {
    const last = items[items.length - 1];
    if (!token || !last) return;
    setLoadingMore(true);
    try {
      const page = await api.notifications.list(token, last.created_at);
      setItems((current) => [...current, ...page.items.filter((item) => !current.some((c) => c.id === item.id))]);
      setHasMore(page.items.length === PAGE_SIZE);
    } catch (reason) {
      toast.error(t('notificationsFailed'), describeError(reason, t, 'notificationsFailed'));
    } finally {
      setLoadingMore(false);
    }
  };

  const markRead = async (ids?: string[]) => {
    if (!token) return;
    const result = await api.notifications.markRead(token, ids);
    const now = new Date().toISOString();
    setItems((current) => current.map((item) => (!ids || ids.includes(item.id)) && !item.read_at ? { ...item, read_at: now } : item));
    setUnreadNotifications(result.unread_count);
  };

  const open = (item: AppNotification) => {
    if (!item.read_at) void markRead([item.id]).catch(() => undefined);
    navigate(links[item.kind] ?? '/account');
  };

  const markAll = async () => {
    setMarkingAll(true);
    try { await markRead(); }
    catch (reason) { toast.error(t('markReadFailed'), describeError(reason, t, 'markReadFailed')); }
    finally { setMarkingAll(false); }
  };

  const unread = items.filter((item) => !item.read_at).length;

  return (
    <section aria-labelledby="notifications-heading" aria-busy={loading} className="grid gap-6">
      <InstallCard dismissible={false} />
      <PushCard />
      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line-strong/30 pb-3">
          <div>
            <h2 id="notifications-heading" className={ui.sectionTitle}>{t('notificationsTitle')}</h2>
            <p className="mt-1 text-body-md text-ink-2">{t('notificationsIntro')}</p>
          </div>
          {unread > 0 ? (
            <Button variant="tonal" size="sm" loading={markingAll} onClick={() => void markAll()}>
              <CheckCheck size={17} aria-hidden="true" />{t('markAllRead')}
            </Button>
          ) : null}
        </div>

        {error ? <Alert onRetry={() => void load()} retryLabel={t('tryAgain')}>{error}</Alert> : null}
        {loading ? <ListSkeleton label={t('loadingNotifications')} /> : !error && items.length === 0 ? (
          <EmptyState icon={<Bell size={28} />} title={t('notificationsEmptyTitle')} description={t('notificationsEmptyCopy')} />
        ) : (
          <ul className={cn(ui.card, 'divide-y divide-line overflow-hidden')}>
            {items.map((item) => <NotificationRow key={item.id} item={item} onOpen={() => open(item)} />)}
          </ul>
        )}
        {hasMore && !loading ? (
          <div className="mt-4 flex justify-center">
            <Button variant="tonal" loading={loadingMore} onClick={() => void loadMore()}>{t('notificationsLoadMore')}</Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function NotificationRow({ item, onOpen }: { item: AppNotification; onOpen: () => void }) {
  const { t, language } = useLanguage();
  const egp = useEgp();
  const look = looks[item.kind];
  if (!look) return null;
  const { data } = item;
  const amount = data.amount_egp ? egp(data.amount_egp) : '';
  const values = {
    actor: data.actor_name || t('notifSomeone'),
    title: data.listing_title || t('notifABook'),
    amount,
    count: item.count,
  };
  const text = fill(t(item.kind === 'message' && item.count > 1 ? 'notifMessages' : look.text), values);
  // A second line: what happened to the money, the chat preview, or the moderator's note.
  const detail = item.kind === 'message' ? data.preview
    : item.kind === 'topup_rejected' ? data.note
      : amount && item.kind === 'deal_completed' ? fill(t('notifPayout'), { amount })
        : amount && !item.kind.startsWith('topup') ? fill(t('notifRefund'), { amount })
          : undefined;
  const isUnread = !item.read_at;

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn('flex w-full items-start gap-3.5 px-4 py-4 text-start transition-colors hover:bg-sunk focus-visible:bg-sunk sm:px-5', isUnread && 'bg-glaze-soft/25')}
      >
        <span className={cn('grid h-10 w-10 flex-none place-items-center rounded-xl', look.tone)} aria-hidden="true">{look.icon}</span>
        <span className="grid min-w-0 flex-1 gap-1">
          <span className={cn('text-body-md text-ink', isUnread && 'font-semibold')}>{text}</span>
          {detail ? <span className="line-clamp-2 text-body-sm text-ink-2" dir="auto">{detail}</span> : null}
          <span className="text-label-sm text-ink-3">{formatDateTime(item.created_at, language)}</span>
        </span>
        {isUnread ? (
          <span className="mt-1.5 flex-none">
            <span className="block h-2.5 w-2.5 rounded-full bg-pom" aria-hidden="true" />
            <span className="sr-only">{t('notificationUnread')}</span>
          </span>
        ) : null}
      </button>
    </li>
  );
}

function PushCard() {
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

  // Push switched off on the server: nothing to offer. On iPhone in Safari, the install card explains alerts.
  if (state === null || state === 'unavailable' || (state === 'unsupported' && needsIosInstall())) return null;

  const turnOn = async () => {
    if (!session) return;
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

  const turnOff = async () => {
    setBusy(true);
    await disablePush(session?.access_token);
    setState('off');
    setBusy(false);
    toast.success(t('pushOffToast'));
  };

  const copy: Record<Exclude<PushState, 'unavailable'>, MessageKey> = {
    unsupported: 'pushUnsupportedCopy', denied: 'pushDeniedCopy', off: 'pushOffCopy', on: 'pushOnCopy',
  };
  const Icon = state === 'on' ? BellRing : state === 'off' ? Bell : BellOff;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-card bg-sunk-3/60 p-4 sm:flex-nowrap sm:p-5">
      <span className={cn('grid h-12 w-12 flex-none place-items-center rounded-xl shadow-sm', state === 'on' ? 'bg-glaze text-on-glaze' : 'bg-surface text-glaze-deep')} aria-hidden="true">
        <Icon size={22} />
      </span>
      <div className="min-w-0 flex-1 basis-[14rem]">
        <h2 className="text-title-md font-bold text-ink">{t('pushTitle')}</h2>
        <p className="mt-0.5 text-body-sm text-ink-2">{t(copy[state])}</p>
      </div>
      {state === 'off' ? <Button className="w-full sm:w-auto" loading={busy} onClick={() => void turnOn()}>{t('pushTurnOn')}</Button> : null}
      {state === 'on' ? <Button className="w-full sm:w-auto" variant="secondary" loading={busy} onClick={() => void turnOff()}>{t('pushTurnOff')}</Button> : null}
    </div>
  );
}

function ListSkeleton({ label }: { label: string }) {
  return (
    <div className={cn(ui.card, 'divide-y divide-line')} aria-busy="true" aria-label={label}>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex animate-pulse-soft gap-3.5 px-5 py-4">
          <span className="h-10 w-10 flex-none rounded-xl bg-line" />
          <span className="grid flex-1 content-start gap-2 pt-1">
            <span className="h-3.5 w-3/4 rounded-full bg-line" />
            <span className="h-3 w-1/3 rounded-full bg-line" />
          </span>
        </div>
      ))}
    </div>
  );
}
