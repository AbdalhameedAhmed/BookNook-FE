import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  BookOpen, ChevronRight, Coins, ExternalLink, Flag, Handshake, Hourglass, Inbox, LayoutDashboard, ReceiptText, Repeat, ShieldCheck, Users, Wallet,
} from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { describeError } from '../errors';
import { useLanguage } from '../i18n';
import type { AdminOverview, AdminTopup, Transaction } from '../types';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Dialog, useConfirm } from '../components/ui/dialog';
import { EmptyState } from '../components/ui/empty-state';
import { useToast } from '../components/ui/toast';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';
import { formatDateTime, formatEgp } from './Wallet';

/** Moderator-only area. The API enforces the role; this check just avoids showing an empty shell. */
export function AdminLayout() {
  const { session } = useAuth();
  const { t } = useLanguage();

  if (session?.user.role !== 'moderator') {
    return (
      <div className={cn(ui.wrap, ui.page)}>
        <EmptyState size="large" headingLevel="h1" icon={<ShieldCheck size={28} />} title={t('errorForbidden')} action={<Link className={ui.textLink} to="/">{t('backHome')}</Link>} />
      </div>
    );
  }

  const tabs = [
    { to: '/admin', label: t('adminOverviewTab'), icon: LayoutDashboard, end: true },
    { to: '/admin/topups', label: t('adminPendingTab'), icon: ReceiptText },
    { to: '/admin/handovers', label: t('adminHandoversTab'), icon: Handshake },
  ];

  return (
    <div className={cn(ui.wrap, ui.page)}>
      <header className="mb-5">
        <p className={ui.eyebrow}>{t('adminEyebrow')}</p>
        <h1 className={ui.pageTitle}>{t('adminTitle')}</h1>
      </header>
      <nav className="-mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden" aria-label={t('adminSections')}>
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cn(
              'inline-flex min-h-11 flex-none items-center gap-2 whitespace-nowrap rounded-full px-4 text-label-lg font-semibold transition-colors',
              isActive ? 'bg-glaze text-on-glaze' : 'bg-sunk-2 text-ink-2 hover:text-ink',
            )}
          >
            <Icon size={18} aria-hidden="true" />{label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-6 md:mt-8"><Outlet /></div>
    </div>
  );
}

export function AdminOverviewPage() {
  const { session } = useAuth();
  const { t, language } = useLanguage();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    let active = true;
    const token = session?.access_token;
    if (!token) return () => { active = false; };
    setError('');
    api.admin.overview(token)
      .then((next) => { if (active) setOverview(next); })
      .catch((reason) => { if (active) setError(describeError(reason, t, 'adminLoadError')); });
    return () => { active = false; };
  }, [session?.access_token, t]);

  useEffect(() => load(), [load]);

  if (error) return <Alert title={t('adminLoadError')} onRetry={load} retryLabel={t('tryAgain')}>{error}</Alert>;

  const o = overview;
  const tiles: Array<{ label: string; value: string; note?: string; icon: ReactNode; tone: string }> = o ? [
    { label: t('statUsers'), value: String(o.users_total), icon: <Users size={20} />, tone: 'bg-sunk-2 text-glaze-deep' },
    { label: t('statActiveListings'), value: String(o.listings_active), note: `${o.listings_total} ${t('statListingsTotal')}`, icon: <BookOpen size={20} />, tone: 'bg-sunk-2 text-glaze-deep' },
    { label: t('statPendingRequests'), value: String(o.requests_pending), icon: <Inbox size={20} />, tone: 'bg-cobalt-soft text-cobalt' },
    { label: t('statArranging'), value: String(o.transactions_arranging), icon: <Handshake size={20} />, tone: 'bg-ochre-soft text-ochre-ink' },
    { label: t('statCompleted'), value: String(o.transactions_completed), icon: <ShieldCheck size={20} />, tone: 'bg-cobalt-soft text-cobalt' },
    { label: t('statOpenReports'), value: String(o.reports_open), icon: <Flag size={20} />, tone: 'bg-pom-soft text-pom' },
    { label: t('statPendingTopups'), value: String(o.topups_pending), note: `${formatEgp(o.topups_pending_egp, language, t)}`, icon: <ReceiptText size={20} />, tone: 'bg-ochre-soft text-ochre-ink' },
    { label: t('statWalletTotal'), value: formatEgp(o.wallet_balance_total_egp, language, t), icon: <Wallet size={20} />, tone: 'bg-glaze-fixed text-glaze-deep' },
    { label: t('statHeld'), value: formatEgp(o.held_total_egp, language, t), icon: <Hourglass size={20} />, tone: 'bg-ochre-soft text-ochre-ink' },
    { label: t('statRevenue'), value: formatEgp(o.platform_revenue_egp, language, t), icon: <Coins size={20} />, tone: 'bg-glaze-fixed text-glaze-deep' },
  ] : [];

  return (
    <div className="grid gap-6">
      <h2 className="font-book text-headline-sm font-semibold text-ink ar:leading-[1.5]">{t('siteBrief')}</h2>
      <ul className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4" aria-busy={!o}>
        {o ? tiles.map((tile) => (
          <li key={tile.label} className={cn(ui.card, 'grid content-start gap-2 p-4 md:p-5')}>
            <span className={cn('grid h-10 w-10 place-items-center rounded-xl', tile.tone)} aria-hidden="true">{tile.icon}</span>
            <span className="text-label-md font-semibold text-ink-2">{tile.label}</span>
            <span className="font-book text-headline-md font-bold text-ink">{tile.value}</span>
            {tile.note ? <span className="text-label-sm text-ink-3">{tile.note}</span> : null}
          </li>
        )) : Array.from({ length: 10 }, (_, index) => <li key={index} className={cn(ui.skeleton, 'h-36 rounded-card')} />)}
      </ul>
      {o && o.topups_pending > 0 ? (
        <Link to="/admin/topups" className={cn(ui.card, 'group flex items-center justify-between gap-3 p-4 md:p-5')}>
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-ochre-soft text-ochre-ink" aria-hidden="true"><ReceiptText size={20} /></span>
            <span className="text-label-lg font-semibold text-ink">{o.topups_pending} {t('statPendingTopups')}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-label-md font-semibold text-glaze-deep group-hover:underline">{t('reviewTopups')}<ChevronRight size={16} className={ui.flipRtl} aria-hidden="true" /></span>
        </Link>
      ) : null}
    </div>
  );
}

export function AdminTopupsPage() {
  const { session } = useAuth();
  const { t, language } = useLanguage();
  const confirm = useConfirm();
  const toast = useToast();
  const [topups, setTopups] = useState<AdminTopup[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AdminTopup | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(() => {
    let active = true;
    const token = session?.access_token;
    if (!token) return () => { active = false; };
    setError('');
    api.admin.topups(token, 'pending')
      .then((items) => { if (active) setTopups(items); })
      .catch((reason) => { if (active) setError(describeError(reason, t, 'adminLoadError')); });
    return () => { active = false; };
  }, [session?.access_token, t]);

  useEffect(() => load(), [load]);

  const review = async (topup: AdminTopup, action: 'approve' | 'reject', rejectNote = '') => {
    if (!session) return;
    setBusyId(topup.id);
    try {
      if (action === 'approve') await api.admin.approveTopup(session.access_token, topup.id);
      else await api.admin.rejectTopup(session.access_token, topup.id, rejectNote.trim());
      toast.success(action === 'approve' ? t('topupApproved') : t('topupRejected'));
      setTopups((current) => current?.filter((item) => item.id !== topup.id) ?? null);
    } catch (reason) {
      toast.error(t('reviewFailed'), describeError(reason, t, 'reviewFailed'));
      load();
    } finally {
      setBusyId(null);
    }
  };

  const approve = async (topup: AdminTopup) => {
    const ok = await confirm({ title: t('confirmApproveTitle'), description: t('confirmApproveCopy'), confirmLabel: t('approve'), cancelLabel: t('cancel') });
    if (ok) await review(topup, 'approve');
  };

  const closeReject = () => { setRejecting(null); setNote(''); };
  const submitReject = async () => {
    if (!rejecting) return;
    const target = rejecting;
    const reason = note;
    closeReject();
    await review(target, 'reject', reason);
  };

  if (error) return <Alert title={t('adminLoadError')} onRetry={load} retryLabel={t('tryAgain')}>{error}</Alert>;
  if (!topups) return <div className="grid gap-3" aria-busy="true">{[0, 1].map((key) => <span key={key} className={cn(ui.skeleton, 'h-40 rounded-card')} />)}</div>;

  return (
    <section aria-labelledby="pending-topups-heading">
      <div className="mb-4">
        <h2 id="pending-topups-heading" className="font-book text-headline-sm font-semibold text-ink ar:leading-[1.5]">{t('adminPendingTab')}</h2>
        <p className="text-body-sm text-ink-2">{t('pendingTopupsCopy')}</p>
      </div>
      {topups.length === 0 ? (
        <EmptyState icon={<ReceiptText size={26} />} title={t('noPendingTopups')} description={t('noPendingTopupsCopy')} />
      ) : (
        <ul className="grid gap-4">
          {topups.map((topup) => (
            <li key={topup.id} className={cn(ui.card, 'grid gap-4 p-4 sm:grid-cols-[160px_1fr] md:p-5')}>
              {topup.receipt_url ? (
                <a href={topup.receipt_url} target="_blank" rel="noreferrer noopener" className="group relative block overflow-hidden rounded-lg bg-sunk">
                  <img src={topup.receipt_url} alt={`${t('receiptAlt')} ${topup.sender_number}`} className="h-48 w-full object-contain sm:h-full sm:max-h-56" />
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-ink/70 py-1.5 text-label-sm font-semibold text-paper opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <ExternalLink size={13} aria-hidden="true" />{t('viewReceipt')}
                  </span>
                </a>
              ) : (
                <span className="grid h-32 place-items-center rounded-lg bg-sunk text-body-sm text-ink-3">{t('receiptUnavailable')}</span>
              )}
              <div className="grid content-start gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-book text-headline-md font-bold text-glaze-deep">{formatEgp(topup.amount_egp, language, t)}</span>
                  <span className="text-body-sm text-ink-3">{t('submittedOn')} {formatDateTime(topup.created_at, language)}</span>
                </div>
                <dl className="grid gap-1.5 text-body-md sm:grid-cols-[auto_1fr] sm:gap-x-4">
                  <dt className="font-semibold text-ink-2">{t('email')}</dt>
                  <dd className="min-w-0 truncate text-ink">{topup.user_email ?? topup.user_id}</dd>
                  <dt className="font-semibold text-ink-2">{t('sentFrom')}</dt>
                  <dd><bdi dir="ltr" className="tabular-nums text-ink">{topup.sender_number}</bdi></dd>
                  <dt className="font-semibold text-ink-2">{t('sentTo')}</dt>
                  <dd><bdi dir="ltr" className="tabular-nums text-ink">{topup.recipient_number}</bdi> <span className="text-ink-3">· {t('optionEwallet')}</span></dd>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" loading={busyId === topup.id} disabled={busyId !== null} onClick={() => void approve(topup)}>{t('approve')}</Button>
                  <Button size="sm" variant="danger-quiet" disabled={busyId !== null} onClick={() => setRejecting(topup)}>{t('reject')}</Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={rejecting !== null}
        onClose={closeReject}
        title={t('rejectTitle')}
        description={rejecting ? `${formatEgp(rejecting.amount_egp, language, t)} · ${rejecting.user_email ?? ''} — ${t('rejectCopy')}` : undefined}
        tone="danger"
        closeLabel={t('dismiss')}
        footer={(
          <>
            <Button variant="secondary" className="border-transparent bg-sunk-2" onClick={closeReject}>{t('cancel')}</Button>
            <Button variant="danger" onClick={() => void submitReject()}>{t('reject')}</Button>
          </>
        )}
      >
        <label className={ui.field} htmlFor="reject-note">
          <span className={ui.label}>{t('rejectNoteLabel')} <span className={ui.optional}>({t('optional')})</span></span>
          <textarea id="reject-note" className={cn(ui.control, ui.textarea)} maxLength={500} rows={3} value={note} placeholder={t('rejectNotePlaceholder')} onChange={(event) => setNote(event.target.value)} />
        </label>
      </Dialog>
    </section>
  );
}

export function AdminHandoversPage() {
  const { session } = useAuth();
  const { t, language } = useLanguage();
  const confirm = useConfirm();
  const toast = useToast();
  const [items, setItems] = useState<Transaction[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    let active = true;
    const token = session?.access_token;
    if (!token) return () => { active = false; };
    setError('');
    api.admin.transactions(token)
      .then((next) => { if (active) setItems(next); })
      .catch((reason) => { if (active) setError(describeError(reason, t, 'adminLoadError')); });
    return () => { active = false; };
  }, [session?.access_token, t]);

  useEffect(() => load(), [load]);

  const cancel = async (transaction: Transaction) => {
    if (!session) return;
    const ok = await confirm({ title: t('confirmCancelDealTitle'), description: t('confirmCancelDealCopy'), confirmLabel: t('cancelRefund'), cancelLabel: t('goBack'), tone: 'danger' });
    if (!ok) return;
    setBusyId(transaction.id);
    try {
      await api.admin.cancelTransaction(session.access_token, transaction.id);
      toast.success(t('dealCancelled'));
      setItems((current) => current?.filter((item) => item.id !== transaction.id) ?? null);
    } catch (reason) {
      toast.error(t('cancelDealFailed'), describeError(reason, t, 'cancelDealFailed'));
      load();
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <Alert title={t('adminLoadError')} onRetry={load} retryLabel={t('tryAgain')}>{error}</Alert>;
  if (!items) return <div className="grid gap-3" aria-busy="true">{[0, 1].map((key) => <span key={key} className={cn(ui.skeleton, 'h-32 rounded-card')} />)}</div>;

  return (
    <section aria-labelledby="admin-handovers-heading">
      <div className="mb-4">
        <h2 id="admin-handovers-heading" className="font-book text-headline-sm font-semibold text-ink ar:leading-[1.5]">{t('adminHandoversTab')}</h2>
        <p className="text-body-sm text-ink-2">{t('adminHandoversCopy')}</p>
      </div>
      {items.length === 0 ? <EmptyState icon={<Handshake size={26} />} title={t('noOpenHandovers')} /> : (
        <ul className="grid gap-3">
          {items.map((item) => {
            const held = item.buyer_held_egp + item.seller_held_egp;
            return (
              <li key={item.id} className={cn(ui.card, 'grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center md:p-5')}>
                <div className="grid min-w-0 gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <Link className="truncate text-title-md font-semibold text-ink hover:text-glaze-deep" to={`/books/${item.listing_id}`}>{item.listing_title}</Link>
                    <span className="rounded-full bg-sunk-2 px-2 py-0.5 text-label-sm font-semibold text-ink-2">{t(item.kind === 'sale' ? 'forSale' : item.kind === 'exchange' ? 'exchange' : 'free')}</span>
                  </span>
                  {item.offered_listing_title ? <span className="flex items-center gap-1.5 text-body-sm text-ink-2"><Repeat size={14} aria-hidden="true" />{t('swapFor')} {item.offered_listing_title}</span> : null}
                  <span className="text-body-sm text-ink-2">{t('buyerLabel')}: {item.buyer_name} · {t('sellerLabel')}: {item.seller_name}</span>
                  <span className="text-body-sm text-ink-3">{formatDateTime(item.created_at ?? '', language)}{held ? ` · ${t('walletHeld')} ${formatEgp(held, language, t)}` : ''}</span>
                </div>
                <Button variant="danger-quiet" size="sm" loading={busyId === item.id} disabled={busyId !== null} onClick={() => void cancel(item)}>{t('cancelRefund')}</Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
