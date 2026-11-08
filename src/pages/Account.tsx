import { useCallback, useEffect, useState } from 'react';
import { BookOpen, ChevronRight, Handshake, Inbox, LogOut, Plus } from 'lucide-react';
import { Link, Navigate, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { BookRequest, Listing, Transaction } from '../types';
import { supabase } from '../supabase';
import { formatCondition, formatMeetup, formatStatus, useLanguage } from '../i18n';
import type { MessageKey } from '../i18n';
import { describeError } from '../errors';
import { completeLabel, priceLabel } from '../lib/listing';
import { Alert } from '../components/ui/alert';
import { Button, buttonClass } from '../components/ui/button';
import { useConfirm } from '../components/ui/dialog';
import { EmptyState } from '../components/ui/empty-state';
import { useToast } from '../components/ui/toast';
import { BookCover, StatusPill } from '../components/book';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';

const attentionRow = 'flex min-h-16 items-center gap-3.5 rounded-xl border border-line bg-surface px-4 py-3 font-medium hover:border-glaze';

export function AccountLayout() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const displayName = session?.user.user_metadata?.display_name || session?.user.email?.split('@')[0] || '';
  const tabs = [
    { to: '/account', label: t('overview'), end: true },
    { to: '/account/books', label: t('myBooks') },
    { to: '/account/requests', label: t('requests') },
    { to: '/account/handovers', label: t('transactions') },
  ];

  const signOut = async () => {
    const confirmed = await confirm({ title: t('confirmSignOutTitle'), description: t('confirmSignOutCopy'), confirmLabel: t('signOut'), cancelLabel: t('cancel') });
    if (!confirmed) return;
    const result = await supabase?.auth.signOut();
    if (result?.error) {
      toast.error(t('somethingWrong'), describeError(result.error, t, 'somethingWrong'));
      return;
    }
    toast.success(t('signedOutToast'));
    navigate('/', { replace: true });
  };

  return (
    <div className={cn(ui.wrap, ui.page)}>
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className={ui.pageTitle}>{t('hiName')} {displayName}</h1>
          <p className="mt-1 text-15 text-ink-3 [overflow-wrap:anywhere]">{session?.user.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void signOut()}><LogOut size={16} className={ui.flipRtl} aria-hidden="true" />{t('signOut')}</Button>
      </header>
      <nav className="mb-8 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]" aria-label={t('accountSections')}>
        {tabs.map(({ to, label, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cn('-mb-px whitespace-nowrap border-b-2 border-transparent px-3.5 py-3 text-15 font-medium text-ink-2 hover:text-ink', isActive && 'border-glaze font-semibold text-ink')}>{label}</NavLink>
        ))}
      </nav>
      <div><Outlet /></div>
    </div>
  );
}

export function AccountOverview() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const [listings, setListings] = useState<Listing[]>([]);
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    let active = true;
    const token = session?.access_token;
    if (!token) return () => { active = false; };
    setLoading(true);
    setError('');
    Promise.all([api.myListings(token), api.activity(token)])
      .then(([myListings, activity]) => {
        if (!active) return;
        setListings(myListings);
        setRequests(activity.requests);
        setTransactions(activity.transactions);
      })
      .catch((reason) => { if (active) setError(describeError(reason, t, 'listingError')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session?.access_token, t]);

  useEffect(() => load(), [load]);

  if (error) return <Alert title={t('listingError')} onRetry={load} retryLabel={t('tryAgain')}>{error}</Alert>;

  const waiting = requests.filter((request) => request.status === 'pending' && request.seller_id === session?.user.id).length;
  const arranging = transactions.filter((item) => item.status === 'arranging').length;

  return (
    <div className="grid gap-11 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
      <section aria-labelledby="attention-heading">
        <h2 id="attention-heading" className={ui.blockTitle}>{t('needsYou')}</h2>
        {loading ? <RowSkeletons label={t('loadingRequests')} count={2} /> : waiting + arranging === 0 ? (
          <p className="rounded-e-xl border-s-[3px] border-glaze bg-surface px-[18px] py-4 text-ink-2"><strong className="block text-ink">{t('allClear')}</strong> {t('allClearCopy')}</p>
        ) : (
          <ul className="grid gap-2.5">
            {waiting ? (
              <li><Link to="/account/requests" className={attentionRow}>
                <span className="min-w-[1.5ch] font-book text-28 font-semibold leading-none text-glaze">{waiting}</span>
                <span>{waiting === 1 ? t('requestOne') : t('requestsWaiting')} {t('pendingCount')}</span>
                <ChevronRight size={18} className="ms-auto shrink-0 text-ink-3 rtl:-scale-x-100" aria-hidden="true" />
              </Link></li>
            ) : null}
            {arranging ? (
              <li><Link to="/account/handovers" className={attentionRow}>
                <span className="min-w-[1.5ch] font-book text-28 font-semibold leading-none text-glaze">{arranging}</span>
                <span>{t('arrangingCount')}</span>
                <ChevronRight size={18} className="ms-auto shrink-0 text-ink-3 rtl:-scale-x-100" aria-hidden="true" />
              </Link></li>
            ) : null}
          </ul>
        )}
      </section>

      <section aria-labelledby="your-books-heading">
        <div className={ui.blockHead}>
          <h2 id="your-books-heading" className={cn(ui.blockTitle, 'mb-0')}>{t('yourBooks')}</h2>
          {listings.length ? <Link className={ui.textLink} to="/account/books">{t('viewAll')}</Link> : null}
        </div>
        {loading ? <RowSkeletons label={t('loadingShelf')} /> : listings.length === 0 ? (
          <EmptyState size="compact" icon={<BookOpen size={22} />} title={t('yourShelfStarts')} description={t('listReadyBook')} action={<Link className={buttonClass({ size: 'sm' })} to="/sell"><Plus size={16} aria-hidden="true" />{t('listBook')}</Link>} />
        ) : (
          <ul className={ui.rows}>{listings.slice(0, 4).map((listing) => <li key={listing.id}><BookRow listing={listing} /></li>)}</ul>
        )}
      </section>
    </div>
  );
}

export function MyBooksPage() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const confirm = useConfirm();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try { setListings(await api.myListings(session.access_token)); setLoadError(''); }
    catch (reason) { setLoadError(describeError(reason, t, 'couldNotLoadBooks')); }
    finally { setLoading(false); }
  }, [session, t]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Old "?new=1" links now open the dedicated listing page.
  if (searchParams.get('new') === '1') return <Navigate to="/sell" replace />;

  const handleDeactivate = async (listing: Listing) => {
    if (!session) return;
    const confirmed = await confirm({ title: t('confirmDeactivateTitle'), description: t('confirmDeactivateCopy'), confirmLabel: t('yesDeactivate'), cancelLabel: t('keepIt'), tone: 'danger' });
    if (!confirmed) return;
    setBusyId(listing.id);
    try {
      await api.deactivateListing(session.access_token, listing.id);
      setListings((current) => current.map((item) => item.id === listing.id ? { ...item, status: 'inactive' } : item));
      toast.success(t('deactivated'), listing.title);
    } catch (reason) {
      toast.error(t('couldNotDeactivate'), describeError(reason, t, 'couldNotDeactivate'));
    } finally {
      setBusyId(null);
    }
  };

  const handleComplete = async (listing: Listing) => {
    if (!session) return;
    const confirmed = await confirm({ title: t('confirmCompleteTitle'), description: t('confirmCompleteCopy'), confirmLabel: completeLabel(listing, t), cancelLabel: t('goBack') });
    if (!confirmed) return;
    setBusyId(listing.id);
    try {
      const result = await api.markListingComplete(session.access_token, listing.id);
      setListings((current) => current.map((item) => item.id === listing.id ? { ...item, status: result.status } : item));
      toast.success(t('listingMarked'), `${listing.title}: ${formatStatus(result.status, t)}`);
    } catch (reason) {
      toast.error(t('couldNotUpdate'), describeError(reason, t, 'couldNotUpdate'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section aria-labelledby="my-books-heading" aria-busy={loading}>
      <div className={ui.blockHead}>
        <h2 id="my-books-heading" className={cn(ui.blockTitle, 'mb-0')}>{t('booksShared')}</h2>
        <Link className={buttonClass({ size: 'sm' })} to="/sell"><Plus size={16} aria-hidden="true" />{t('listBook')}</Link>
      </div>
      {loadError ? <Alert className="mb-5" title={t('couldNotLoadBooks')} onRetry={() => void refresh()} retryLabel={t('tryAgain')}>{loadError}</Alert> : null}
      {loading ? <RowSkeletons label={t('loadingShelf')} /> : listings.length === 0 && !loadError ? (
        <EmptyState icon={<BookOpen size={24} />} title={t('shelfEmpty')} description={t('addBookFindReader')} action={<Link className={buttonClass()} to="/sell">{t('listBook')}</Link>} />
      ) : (
        <ul className={ui.rows}>{listings.map((listing) => {
          const open = listing.status === 'active' || listing.status === 'reserved';
          const busy = busyId === listing.id;
          return (
            <li key={listing.id}>
              <BookRow listing={listing}>
                <div className={ui.rowActions}>
                  <Link className={buttonClass({ variant: 'secondary', size: 'sm' })} to={`/account/books/${listing.id}/edit`}>{t('edit')}</Link>
                  {open ? <>
                    <Button variant="secondary" size="sm" onClick={() => void handleComplete(listing)} loading={busy}>{completeLabel(listing, t)}</Button>
                    <Button variant="danger-quiet" size="sm" onClick={() => void handleDeactivate(listing)} disabled={busy}>{t('deactivate')}</Button>
                  </> : null}
                </div>
              </BookRow>
            </li>
          );
        })}</ul>
      )}
    </section>
  );
}

export function RequestsPage() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const confirm = useConfirm();
  const toast = useToast();
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!session) return;
    try { setRequests((await api.activity(session.access_token)).requests); setError(''); }
    catch (reason) { setError(describeError(reason, t, 'requestFailed')); }
    finally { setLoading(false); }
  }, [session, t]);

  useEffect(() => { void reload(); }, [reload]);

  const transitions: Record<string, { title: MessageKey; copy: MessageKey; confirm: MessageKey; done: MessageKey; danger?: boolean }> = {
    accepted: { title: 'confirmAcceptTitle', copy: 'confirmAcceptCopy', confirm: 'acceptRequest', done: 'requestAccepted' },
    rejected: { title: 'confirmDeclineTitle', copy: 'confirmDeclineCopy', confirm: 'decline', done: 'requestDeclined', danger: true },
    cancelled: { title: 'confirmCancelTitle', copy: 'confirmCancelCopy', confirm: 'cancelRequest', done: 'requestCancelled', danger: true },
  };

  const update = async (request: BookRequest, status: string) => {
    if (!session) return;
    const copy = transitions[status];
    const confirmed = await confirm({ title: t(copy.title), description: t(copy.copy), confirmLabel: t(copy.confirm), cancelLabel: t('goBack'), tone: copy.danger ? 'danger' : 'default' });
    if (!confirmed) return;
    setBusyId(request.id);
    try {
      await api.updateRequest(session.access_token, request.id, status);
      toast.success(t('requestUpdated'), t(copy.done));
      await reload();
    } catch (reason) {
      toast.error(t('updateRequestFailed'), describeError(reason, t, 'updateRequestFailed'));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <RowSkeletons label={t('loadingRequests')} />;
  if (error) return <Alert title={t('requestFailed')} onRetry={() => { setLoading(true); void reload(); }} retryLabel={t('tryAgain')}>{error}</Alert>;

  const incoming = requests.filter((request) => request.seller_id === session?.user.id);
  const outgoing = requests.filter((request) => request.seller_id !== session?.user.id);

  const renderRequest = (request: BookRequest, isIncoming: boolean) => {
    const busy = busyId === request.id;
    return (
      <li key={request.id} className="grid gap-2.5 py-[18px]">
        <div className="flex items-start justify-between gap-3">
          <Link className={ui.rowTitleLink} to={`/books/${request.listing_id}`}>{request.listing_title || t('openBook')}</Link>
          <StatusPill status={request.status} />
        </div>
        <blockquote className="border-s-[3px] border-line-strong ps-3 font-book text-ink-2">{request.message || t('noMessage')}</blockquote>
        {request.status === 'accepted' ? <p className="rounded-ctl bg-glaze-soft px-3 py-2.5 text-sm">{t('acceptedNext')} <Link className={ui.textLink} to="/account/handovers">{t('transactions')}</Link></p> : null}
        {request.status === 'pending' ? (
          <div className={ui.rowActions}>
            {isIncoming ? <>
              <Button size="sm" onClick={() => void update(request, 'accepted')} loading={busy}>{t('acceptRequest')}</Button>
              <Button size="sm" variant="danger-quiet" onClick={() => void update(request, 'rejected')} disabled={busy}>{t('decline')}</Button>
            </> : <Button size="sm" variant="secondary" onClick={() => void update(request, 'cancelled')} loading={busy}>{t('cancelRequest')}</Button>}
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <div className="grid gap-11 lg:grid-cols-[1fr_1fr] lg:gap-16">
      <section aria-labelledby="incoming-heading">
        <h2 id="incoming-heading" className={ui.blockTitle}>{t('incomingRequests')}</h2>
        {incoming.length === 0
          ? <EmptyState size="compact" icon={<Inbox size={22} />} title={t('noIncoming')} description={t('noRequestsCopy')} />
          : <ul className={ui.rows}>{incoming.map((request) => renderRequest(request, true))}</ul>}
      </section>
      <section aria-labelledby="outgoing-heading">
        <h2 id="outgoing-heading" className={ui.blockTitle}>{t('outgoingRequests')}</h2>
        {outgoing.length === 0
          ? <EmptyState size="compact" icon={<BookOpen size={22} />} title={t('noOutgoing')} action={<Link className={buttonClass({ variant: 'secondary', size: 'sm' })} to="/">{t('browseBooks')}</Link>} />
          : <ul className={ui.rows}>{outgoing.map((request) => renderRequest(request, false))}</ul>}
      </section>
    </div>
  );
}

export function TransactionsPage() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const confirm = useConfirm();
  const toast = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!session) return;
    try { setTransactions((await api.activity(session.access_token)).transactions); setError(''); }
    catch (reason) { setError(describeError(reason, t, 'transactionFailed')); }
    finally { setLoading(false); }
  }, [session, t]);

  useEffect(() => { void reload(); }, [reload]);

  const complete = async (transaction: Transaction) => {
    if (!session) return;
    const confirmed = await confirm({ title: t('confirmTransactionTitle'), description: t('confirmTransactionCopy'), confirmLabel: t('markComplete'), cancelLabel: t('goBack') });
    if (!confirmed) return;
    setBusyId(transaction.id);
    try {
      await api.completeTransaction(session.access_token, transaction.id);
      setTransactions((current) => current.map((item) => item.id === transaction.id ? { ...item, status: 'completed' } : item));
      toast.success(t('statusCompleted'), t('transactionCompleted'));
    } catch (reason) {
      toast.error(t('completeFailed'), describeError(reason, t, 'completeFailed'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section aria-labelledby="handovers-heading">
      <h2 id="handovers-heading" className={ui.blockTitle}>{t('transactionsTitle')}</h2>
      <p className={cn(ui.muted, ui.measure)}>{t('transactionIntro')}</p>
      {error ? <Alert className="mb-5" title={t('transactionFailed')} onRetry={() => { setLoading(true); void reload(); }} retryLabel={t('tryAgain')}>{error}</Alert> : null}
      {loading ? <RowSkeletons label={t('loadingTransactions')} /> : transactions.length === 0 && !error ? (
        <EmptyState icon={<Handshake size={24} />} title={t('nothingMoving')} description={t('acceptedBecomeTransactions')} />
      ) : (
        <ul className={ui.rows}>{transactions.map((transaction) => (
          <li key={transaction.id} className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 py-[18px]">
            <div className={ui.rowMain}>
              <Link className={ui.rowTitleLink} to={`/books/${transaction.listing_id}`}>{transaction.listing_title || t('openBook')}</Link>
              <p className={ui.rowMeta}>
                {transaction.buyer_id === session?.user.id ? t('youReceiving') : t('youGiving')}
                <span aria-hidden="true" className={ui.sep} />
                {formatMeetup(transaction.fulfillment_method, t)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3.5">
              <StatusPill status={transaction.status} />
              {transaction.status === 'arranging'
                ? <Button size="sm" onClick={() => void complete(transaction)} loading={busyId === transaction.id}>{t('markComplete')}</Button>
                : null}
            </div>
          </li>
        ))}</ul>
      )}
    </section>
  );
}

function BookRow({ listing, children }: { listing: Listing; children?: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <div className="flex gap-4 py-4">
      <Link to={`/books/${listing.id}`} className="flex-none" tabIndex={-1} aria-hidden="true">
        <BookCover listing={listing} size="sm" />
      </Link>
      <div className={ui.rowMain}>
        <div className="flex items-start justify-between gap-3">
          <Link className={ui.rowTitleLink} to={`/books/${listing.id}`}>{listing.title}</Link>
          <StatusPill status={listing.status} />
        </div>
        <p className={ui.rowMeta}>
          <strong className="font-semibold text-ink">{priceLabel(listing, t)}</strong>
          <span aria-hidden="true" className={ui.sep} />{formatCondition(listing.condition, t)}
          <span aria-hidden="true" className={ui.sep} />{listing.area}
        </p>
        {children}
      </div>
    </div>
  );
}

function RowSkeletons({ label, count = 3 }: { label: string; count?: number }) {
  return (
    <div className="border-t border-line" aria-busy="true" aria-label={label}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="relative h-[84px] animate-pulse-soft border-b border-line">
          <span className="absolute bottom-3.5 left-[72px] right-[30%] top-3.5 rounded-lg bg-line" />
          <span className="absolute inset-y-2.5 start-0 w-14 rounded bg-line" />
        </div>
      ))}
    </div>
  );
}
