import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowDownToLine, ArrowRight, ArrowUpFromLine, BookOpen, Check, CheckCircle2, ChevronRight, Handshake, Inbox,
  LayoutDashboard, Leaf, Library, LogOut, Mail, MapPin, Pencil, Plus, Quote, Send, ShieldCheck,
} from 'lucide-react';
import { Link, Navigate, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { BookRequest, Listing, Transaction } from '../types';
import { formatCondition, formatMeetup, formatStatus, useLanguage } from '../i18n';
import type { MessageKey } from '../i18n';
import { describeError } from '../errors';
import { completeLabel, priceLabel } from '../lib/listing';
import { Alert } from '../components/ui/alert';
import { Button, buttonClass } from '../components/ui/button';
import { useConfirm } from '../components/ui/dialog';
import { EmptyState } from '../components/ui/empty-state';
import { useToast } from '../components/ui/toast';
import { BookCover, StatusPill, typeTones } from '../components/book';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';

/** Section heading with an optional count badge and a short line underneath (Stitch's list headers). */
const listHead = 'mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line-strong/30 pb-3';
const listTitle = 'font-book text-headline-sm font-semibold text-ink md:text-headline-md ar:leading-[1.5] ar:tracking-normal';
const countBadge = 'inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-label-sm font-bold';
const iconTile = 'grid h-11 w-11 flex-none place-items-center rounded-xl';
/** Listing status → the coloured edge on My books cards. */
const statusEdge: Record<string, string> = { active: 'bg-glaze', reserved: 'bg-ochre', sold: 'bg-cobalt', exchanged: 'bg-cobalt' };

export function AccountLayout() {
  const { session, signOut: endSession } = useAuth();
  const { t } = useLanguage();
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const displayName = session?.user.display_name || session?.user.email.split('@')[0] || '';
  const tabs = [
    { to: '/account', label: t('overview'), icon: LayoutDashboard, end: true },
    { to: '/account/books', label: t('myBooks'), icon: BookOpen },
    { to: '/account/requests', label: t('requests'), icon: Inbox },
    { to: '/account/handovers', label: t('transactions'), icon: Handshake },
  ];

  const signOut = async () => {
    const confirmed = await confirm({ title: t('confirmSignOutTitle'), description: t('confirmSignOutCopy'), confirmLabel: t('signOut'), cancelLabel: t('cancel') });
    if (!confirmed) return;
    endSession();
    toast.success(t('signedOutToast'));
    navigate('/', { replace: true });
  };

  return (
    <div className={cn(ui.wrap, ui.page)}>
      {/* On phones the greeting is a tinted panel with pill tabs below; from md up both sit in one card with a tab tray. */}
      <div className="relative md:overflow-hidden md:rounded-card md:bg-surface md:shadow-card">
        <span className="absolute inset-x-0 top-0 hidden h-1 bg-gradient-to-r from-glaze-deep via-glaze to-cobalt md:block rtl:bg-gradient-to-l" aria-hidden="true" />
        <header className="flex items-start gap-4 rounded-card bg-sunk p-5 md:items-center md:gap-6 md:rounded-none md:bg-transparent md:p-8 lg:p-10">
          <span className="grid h-14 w-14 flex-none place-items-center rounded-card bg-sunk-3 font-book text-headline-md font-semibold text-glaze shadow-[inset_0_2px_4px_rgb(0_0_0/.06)] md:h-20 md:w-20 md:text-headline-lg" aria-hidden="true">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-book text-headline-md font-bold text-ink md:text-display-lg-mobile lg:text-display-lg ar:leading-[1.4] ar:tracking-normal">{t('hiName')} {displayName}</h1>
            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-body-sm text-ink-2">
              <Mail size={15} className="flex-none text-glaze-deep" aria-hidden="true" />
              <span className="truncate">{session?.user.email}</span>
            </p>
          </div>
          <div className="flex flex-none items-center gap-2.5">
            <Link className={cn(buttonClass({ size: 'sm' }), 'hidden min-h-11 rounded-xl px-4 md:inline-flex')} to="/sell"><Plus size={18} aria-hidden="true" />{t('listBook')}</Link>
            <Button variant="ghost" size="sm" className="min-h-11 rounded-xl px-3 md:bg-sunk [&:not(:disabled):hover]:text-pom" onClick={() => void signOut()}>
              <LogOut size={17} className={ui.flipRtl} aria-hidden="true" />{t('signOut')}
            </Button>
          </div>
        </header>
        <nav className="-mx-[var(--gutter)] mt-4 flex gap-2 overflow-x-auto px-[var(--gutter)] [scrollbar-width:none] md:mx-0 md:mt-0 md:bg-sunk md:px-8 md:pt-5 lg:px-10 [&::-webkit-scrollbar]:hidden" aria-label={t('accountSections')}>
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cn(
                'relative inline-flex min-h-11 flex-none items-center gap-2 whitespace-nowrap rounded-full px-4 text-label-lg font-semibold transition-colors md:rounded-b-none md:rounded-t-xl md:py-3',
                isActive
                  ? 'bg-glaze text-on-glaze md:bg-surface md:font-bold md:text-glaze-deep md:shadow-sm md:after:absolute md:after:inset-x-0 md:after:bottom-0 md:after:h-0.5 md:after:bg-glaze-deep'
                  : 'bg-sunk-2 text-ink-2 hover:text-ink md:bg-transparent md:hover:bg-sunk-2',
              )}
            >
              <Icon size={18} aria-hidden="true" />{label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="mt-6 md:mt-8"><Outlet /></div>
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

  const userId = session?.user.id;
  const waitingRequests = requests.filter((request) => request.status === 'pending' && request.seller_id === userId);
  const arrangingHandovers = transactions.filter((item) => item.status === 'arranging');
  const waiting = waitingRequests.length;
  const arranging = arrangingHandovers.length;
  const onShelf = listings.filter((listing) => listing.status === 'active' || listing.status === 'reserved').length;
  const handedOver = transactions.filter((item) => item.status === 'completed').length;
  const sentPending = requests.filter((request) => request.status === 'pending' && request.seller_id !== userId).length;
  const titles = (items: Array<{ listing_title?: string | null }>) => items.map((item) => item.listing_title).filter(Boolean).join(' · ');

  return (
    <div className="grid gap-8 md:gap-10">
      <ul className="grid grid-cols-3 gap-2.5 md:gap-6" aria-busy={loading}>
        <StatTile label={t('statOnShelf')} note={t('statOnShelfNote')} value={onShelf} loading={loading} icon={<Library size={22} />} tone="bg-sunk-2 text-glaze-deep" valueTone="text-glaze-deep" />
        <StatTile label={t('statHandedOver')} note={t('statHandedOverNote')} value={handedOver} loading={loading} icon={<ShieldCheck size={22} />} tone="bg-cobalt-soft text-cobalt" valueTone="text-cobalt" />
        <StatTile label={t('statSent')} note={t('statSentNote')} value={sentPending} loading={loading} icon={<Send size={22} className={ui.flipRtl} />} tone="bg-ochre-soft text-ochre-ink" valueTone="text-ochre-ink" />
      </ul>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-8" aria-labelledby="attention-heading">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="attention-heading" className="flex items-center gap-2.5 font-book text-headline-sm font-semibold text-ink md:text-headline-md ar:leading-[1.5]">
              <span className={cn('h-2.5 w-2.5 flex-none rounded-full', waiting + arranging ? 'bg-cobalt' : 'bg-glaze')} aria-hidden="true" />
              {t('needsYou')}
            </h2>
            {!loading && waiting + arranging ? <span className={cn(countBadge, 'bg-cobalt-soft text-cobalt-ink')}>{waiting + arranging}</span> : null}
          </div>
          {loading ? <CardSkeletons label={t('loadingRequests')} count={2} /> : waiting + arranging === 0 ? (
            <div className={cn(ui.card, 'flex items-start gap-4 p-5 md:p-6')}>
              <span className={cn(iconTile, 'bg-glaze-fixed text-glaze-deep')} aria-hidden="true"><Leaf size={22} /></span>
              <p className="text-body-md text-ink-2"><strong className="mb-1 block font-book text-headline-sm font-semibold text-ink">{t('allClear')}</strong>{t('allClearCopy')}</p>
            </div>
          ) : (
            <ul className="grid gap-3">
              {waiting ? (
                <li><AttentionRow
                  to="/account/requests"
                  icon={<Inbox size={22} />}
                  iconTone="bg-cobalt-soft text-cobalt"
                  title={`${waiting} ${waiting === 1 ? t('requestOne') : t('requestsWaiting')} ${t('pendingCount')}`}
                  detail={titles(waitingRequests)}
                  cta={t('reviewRequests')}
                  ctaTone="bg-cobalt-soft text-cobalt-ink group-hover:bg-cobalt group-hover:text-paper"
                /></li>
              ) : null}
              {arranging ? (
                <li><AttentionRow
                  to="/account/handovers"
                  icon={<MapPin size={22} />}
                  iconTone="bg-ochre-soft text-ochre-ink"
                  title={`${arranging} ${t('arrangingCount')}`}
                  detail={titles(arrangingHandovers)}
                  cta={t('viewHandovers')}
                  ctaTone="bg-sunk-2 text-ink group-hover:bg-sunk-3"
                /></li>
              ) : null}
            </ul>
          )}
        </section>

        <aside className={cn(ui.card, 'relative overflow-hidden p-5 md:p-6 lg:col-span-4')} aria-labelledby="handover-guide-heading">
          <span className="pointer-events-none absolute -bottom-8 -end-8 h-32 w-32 rounded-full bg-glaze-fixed/40 blur-2xl" aria-hidden="true" />
          <span className={cn(iconTile, 'mb-4 h-12 w-12 bg-glaze-fixed text-glaze-deep')} aria-hidden="true"><Handshake size={24} /></span>
          <h2 id="handover-guide-heading" className="font-book text-headline-sm font-semibold text-ink ar:leading-[1.5]">{t('handoverGuideTitle')}</h2>
          <p className="mt-2 text-body-md text-ink-2">{t('publicPlaceTip')}</p>
          <Link className={cn(buttonClass({ size: 'sm', block: true }), 'relative mt-5 min-h-11')} to="/"><BookOpen size={17} aria-hidden="true" />{t('browseBooks')}</Link>
        </aside>
      </div>

      <section aria-labelledby="your-books-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="your-books-heading" className="font-book text-headline-sm font-semibold text-ink ar:leading-[1.5]">{t('shelfGlance')}</h2>
            <p className="text-body-sm text-ink-2">{t('shelfGlanceCopy')}</p>
          </div>
          {listings.length ? (
            <Link className="inline-flex min-h-11 items-center gap-1 text-label-md font-semibold text-glaze-deep hover:underline hover:underline-offset-[3px]" to="/account/books">
              {t('manageBooks')}<ChevronRight size={16} className={ui.flipRtl} aria-hidden="true" />
            </Link>
          ) : null}
        </div>
        {loading ? <CardSkeletons label={t('loadingShelf')} count={1} /> : listings.length === 0 ? (
          <EmptyState size="compact" icon={<BookOpen size={22} />} title={t('yourShelfStarts')} description={t('listReadyBook')} action={<Link className={buttonClass({ size: 'sm' })} to="/sell"><Plus size={16} aria-hidden="true" />{t('listBook')}</Link>} />
        ) : (
          <div className="rounded-card bg-sunk px-4 pb-4 pt-5 md:px-6">
            <ul className="flex items-end gap-4 overflow-x-auto pb-3 pt-2 [scrollbar-width:none] md:gap-6 [&::-webkit-scrollbar]:hidden">
              {listings.slice(0, 8).map((listing) => (
                <li key={listing.id} className="w-24 flex-none md:w-28">
                  <Link to={`/books/${listing.id}`} className="group grid gap-2 text-center">
                    <span className="relative block transition-transform duration-200 group-hover:-translate-y-1.5 group-focus-visible:-translate-y-1.5">
                      <BookCover listing={listing} className={cn(listing.status !== 'active' && listing.status !== 'reserved' && 'opacity-80 grayscale')} />
                      <span className="absolute end-1.5 top-1.5"><StatusPill status={listing.status} /></span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-label-md font-semibold text-ink">{listing.title}</span>
                      <span className="block truncate text-label-sm text-ink-2">{priceLabel(listing, t)}</span>
                    </span>
                  </Link>
                </li>
              ))}
              <li className="w-24 flex-none self-start md:w-28">
                <Link to="/sell" className="flex aspect-[3/4] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line-strong bg-paper/60 p-2 text-center text-label-md font-semibold text-glaze-deep transition-colors hover:border-glaze hover:bg-surface">
                  <Plus size={22} aria-hidden="true" />{t('addBook')}
                </Link>
              </li>
            </ul>
            <div className="h-2 w-full rounded-full bg-ledge shadow-[0_8px_16px_-4px_rgb(19_28_42/.18)]" aria-hidden="true" />
          </div>
        )}
      </section>
    </div>
  );
}

function StatTile({ label, note, value, loading, icon, tone, valueTone }: { label: string; note: string; value: number; loading: boolean; icon: ReactNode; tone: string; valueTone: string }) {
  return (
    <li className={cn(ui.card, 'flex items-center justify-center gap-4 px-2 py-4 text-center md:justify-between md:p-6 md:text-start')}>
      {/* Phones: number above a short label, like Stitch's three small "shelf story" tiles. */}
      <div className="flex min-w-0 flex-col-reverse gap-1 md:flex-col">
        <span className="text-label-sm font-semibold text-ink-2 md:text-label-md md:uppercase md:tracking-[0.06em] ar:normal-case ar:tracking-normal">{label}</span>
        <span className="flex flex-wrap items-baseline justify-center gap-x-2 md:justify-start">
          {loading
            ? <span className={cn(ui.skeleton, 'h-9 w-9 md:h-12 md:w-12')} />
            : <span className={cn('font-book text-headline-md font-bold md:text-display-lg', valueTone)}>{value}</span>}
          <span className="hidden text-label-sm text-ink-2 md:inline">{note}</span>
        </span>
      </div>
      <span className={cn(iconTile, 'hidden h-12 w-12 md:grid', tone)} aria-hidden="true">{icon}</span>
    </li>
  );
}

function AttentionRow({ to, icon, iconTone, title, detail, cta, ctaTone }: { to: string; icon: ReactNode; iconTone: string; title: string; detail: string; cta: string; ctaTone: string }) {
  return (
    <Link to={to} className={cn(ui.card, 'group flex items-center gap-3.5 p-4 transition-shadow hover:shadow-card-hover md:p-5')}>
      <span className={cn(iconTile, iconTone)} aria-hidden="true">{icon}</span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-title-md font-semibold text-ink">{title}</span>
        {detail ? <span className="truncate text-body-sm text-ink-2">{detail}</span> : null}
      </span>
      <span className={cn('hidden flex-none items-center gap-1 rounded-xl px-3.5 py-1.5 text-label-md font-semibold transition-colors sm:inline-flex', ctaTone)}>
        {cta}<ArrowRight size={16} className={ui.flipRtl} aria-hidden="true" />
      </span>
      <ChevronRight size={20} className={cn('flex-none text-ink-3 sm:hidden', ui.flipRtl)} aria-hidden="true" />
    </Link>
  );
}

type BookFilter = 'all' | 'active' | 'reserved' | 'done' | 'inactive';
const filterOf = (status: string): Exclude<BookFilter, 'all'> =>
  status === 'active' || status === 'reserved' ? status : status === 'sold' || status === 'exchanged' ? 'done' : 'inactive';
const filterLabels: Record<BookFilter, MessageKey> = { all: 'filterAll', active: 'filterActive', reserved: 'filterReserved', done: 'filterDone', inactive: 'filterInactive' };

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
  const [filter, setFilter] = useState<BookFilter>('all');

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

  const counts = listings.reduce<Record<BookFilter, number>>((total, listing) => {
    total[filterOf(listing.status)] += 1;
    return total;
  }, { all: listings.length, active: 0, reserved: 0, done: 0, inactive: 0 });
  const filters = (Object.keys(filterLabels) as BookFilter[]).filter((key) => key === 'all' || counts[key] > 0 || key === filter);
  const shown = filter === 'all' ? listings : listings.filter((listing) => filterOf(listing.status) === filter);

  return (
    <section aria-labelledby="my-books-heading" aria-busy={loading}>
      <div className={cn(ui.card, 'mb-6 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5')}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <h2 id="my-books-heading" className="font-book text-headline-sm font-semibold text-ink ar:leading-[1.5]">{t('booksShared')}</h2>
          {!loading && listings.length ? (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('filterBooks')}>
              {filters.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                  className={cn('min-h-9 rounded-full px-3 text-label-md font-semibold transition-colors', filter === key ? 'bg-glaze text-on-glaze' : 'bg-sunk-2 text-ink hover:bg-sunk-3')}
                >
                  {t(filterLabels[key])} ({counts[key]})
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <Link className={cn(buttonClass({ size: 'sm' }), 'min-h-11 self-start rounded-xl px-4 sm:self-center')} to="/sell"><Plus size={16} aria-hidden="true" />{t('listBook')}</Link>
      </div>
      {loadError ? <Alert className="mb-5" title={t('couldNotLoadBooks')} onRetry={() => void refresh()} retryLabel={t('tryAgain')}>{loadError}</Alert> : null}
      {loading ? <CardSkeletons label={t('loadingShelf')} grid /> : listings.length === 0 && !loadError ? (
        <EmptyState icon={<Library size={28} />} title={t('shelfEmpty')} description={t('addBookFindReader')} action={<Link className={buttonClass()} to="/sell"><Plus size={18} aria-hidden="true" />{t('listBook')}</Link>} />
      ) : shown.length === 0 && listings.length > 0 ? (
        <p className="rounded-card bg-sunk px-5 py-8 text-center text-body-md text-ink-2">{t('noBooksInFilter')}</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 md:gap-6">{shown.map((listing) => {
          const open = listing.status === 'active' || listing.status === 'reserved';
          const busy = busyId === listing.id;
          return (
            <li key={listing.id} className={cn(ui.card, 'relative flex flex-col overflow-hidden transition-shadow hover:shadow-card-hover')}>
              <span className={cn('absolute inset-y-0 start-0 w-1.5', statusEdge[listing.status] ?? 'bg-line-strong')} aria-hidden="true" />
              <div className="flex flex-1 gap-4 p-5 ps-6">
                <Link to={`/books/${listing.id}`} className="w-20 flex-none md:w-24" tabIndex={-1} aria-hidden="true">
                  <BookCover listing={listing} className={cn(!open && 'opacity-80 grayscale')} />
                </Link>
                <div className="grid min-w-0 flex-1 content-start gap-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusPill status={listing.status} />
                    <span className={cn('rounded-full px-2.5 py-0.5 text-label-sm font-bold', typeTones[listing.listing_type])}>{priceLabel(listing, t)}</span>
                  </div>
                  <Link className="mt-1 truncate font-book text-title-lg font-semibold text-ink hover:text-glaze-deep md:text-headline-sm" to={`/books/${listing.id}`}>{listing.title}</Link>
                  {listing.author ? <p className="truncate text-body-sm font-medium text-ink-2">{listing.author}</p> : null}
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-label-md text-ink-2">
                    <span className="inline-flex items-center gap-1"><BookOpen size={14} aria-hidden="true" />{formatCondition(listing.condition, t)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex min-w-0 items-center gap-1"><MapPin size={14} className="flex-none" aria-hidden="true" /><span className="truncate">{listing.area}</span></span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 bg-sunk px-5 py-2.5 ps-6">
                <Link className="inline-flex min-h-10 items-center gap-1.5 text-label-md font-semibold text-ink hover:text-glaze-deep" to={`/account/books/${listing.id}/edit`}>
                  <Pencil size={15} aria-hidden="true" />{t('edit')}
                </Link>
                {open ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="danger-quiet" size="sm" className="border-transparent" onClick={() => void handleDeactivate(listing)} disabled={busy}>{t('deactivate')}</Button>
                    <Button size="sm" onClick={() => void handleComplete(listing)} loading={busy}>{completeLabel(listing, t)}</Button>
                  </div>
                ) : null}
              </div>
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

  if (loading) return <CardSkeletons label={t('loadingRequests')} />;
  if (error) return <Alert title={t('requestFailed')} onRetry={() => { setLoading(true); void reload(); }} retryLabel={t('tryAgain')}>{error}</Alert>;

  const incoming = requests.filter((request) => request.seller_id === session?.user.id);
  const outgoing = requests.filter((request) => request.seller_id !== session?.user.id);
  const waiting = incoming.filter((request) => request.status === 'pending').length;

  const renderRequest = (request: BookRequest, isIncoming: boolean) => {
    const busy = busyId === request.id;
    const closed = request.status !== 'pending' && request.status !== 'accepted';
    return (
      <li key={request.id} className={cn(ui.card, 'grid gap-4 p-4 md:p-6', closed && 'bg-surface/60 opacity-80 shadow-none')}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className={cn(iconTile, isIncoming ? 'bg-cobalt-soft text-cobalt' : 'bg-sunk-2 text-glaze-deep')} aria-hidden="true">
              {isIncoming ? <Inbox size={20} /> : <Send size={20} className={ui.flipRtl} />}
            </span>
            <div className="grid min-w-0 gap-1">
              <span className="text-label-sm font-semibold uppercase tracking-[0.06em] text-ink-2 ar:normal-case ar:tracking-normal">{isIncoming ? t('forYourBook') : t('youSent')}</span>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <Link className="text-title-lg font-semibold text-ink hover:text-glaze-deep" to={`/books/${request.listing_id}`}>{request.listing_title || t('openBook')}</Link>
                <StatusPill status={request.status} />
              </div>
            </div>
          </div>
          {request.status === 'pending' ? (
            <div className="flex flex-wrap items-center gap-2.5 self-end lg:self-center">
              {isIncoming ? <>
                <Button variant="ghost" className="min-h-11 rounded-xl bg-sunk [&:not(:disabled):hover]:text-pom" onClick={() => void update(request, 'rejected')} disabled={busy}>{t('decline')}</Button>
                <Button className="min-h-11 rounded-xl" onClick={() => void update(request, 'accepted')} loading={busy}>{busy ? null : <Check size={18} aria-hidden="true" />}{t('acceptRequest')}</Button>
              </> : <Button variant="ghost" className="min-h-11 rounded-xl underline underline-offset-[3px] [&:not(:disabled):hover]:text-pom" onClick={() => void update(request, 'cancelled')} loading={busy}>{t('cancelRequest')}</Button>}
            </div>
          ) : null}
        </div>
        <blockquote className="flex items-start gap-3 rounded-xl bg-sunk p-4 text-body-md text-ink">
          <Quote size={18} className="mt-0.5 flex-none text-glaze-deep" aria-hidden="true" />
          <p className={cn('[overflow-wrap:anywhere]', !request.message && 'text-ink-3')}>{request.message || t('noMessage')}</p>
        </blockquote>
        {request.status === 'accepted' ? (
          <p className="flex items-start gap-3 rounded-xl bg-glaze-soft p-3.5 text-body-md text-ink">
            <Handshake size={20} className="mt-0.5 flex-none text-glaze-deep" aria-hidden="true" />
            <span>{t('acceptedNext')} <Link className={ui.textLink} to="/account/handovers">{t('transactions')}</Link></span>
          </p>
        ) : null}
      </li>
    );
  };

  return (
    <div className="grid gap-10 md:gap-12">
      <section aria-labelledby="incoming-heading">
        <div className={listHead}>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 id="incoming-heading" className={listTitle}>{t('incomingRequests')}</h2>
              {waiting ? <span className={cn(countBadge, 'bg-glaze text-on-glaze')}>{waiting} {t('waitingBadge')}</span> : null}
            </div>
            <p className="text-body-sm text-ink-2">{t('incomingCopy')}</p>
          </div>
        </div>
        {incoming.length === 0
          ? <EmptyState size="compact" icon={<Inbox size={22} />} title={t('noIncoming')} description={t('noRequestsCopy')} />
          : <ul className="grid gap-4">{incoming.map((request) => renderRequest(request, true))}</ul>}
      </section>
      <section aria-labelledby="outgoing-heading">
        <div className={listHead}>
          <div>
            <h2 id="outgoing-heading" className={listTitle}>{t('outgoingRequests')}</h2>
            <p className="text-body-sm text-ink-2">{t('outgoingCopy')}</p>
          </div>
        </div>
        {outgoing.length === 0
          ? <EmptyState size="compact" icon={<BookOpen size={22} />} title={t('noOutgoing')} action={<Link className={buttonClass({ variant: 'secondary', size: 'sm' })} to="/">{t('browseBooks')}</Link>} />
          : <ul className="grid gap-4">{outgoing.map((request) => renderRequest(request, false))}</ul>}
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

  const current = transactions.filter((item) => item.status === 'arranging' || item.status === 'disputed');
  const past = transactions.filter((item) => item.status !== 'arranging' && item.status !== 'disputed');
  const receiving = (transaction: Transaction) => transaction.buyer_id === session?.user.id;

  return (
    <section aria-labelledby="handovers-heading" aria-busy={loading}>
      <div className="mb-6 flex items-start gap-3.5 rounded-card bg-sunk-3/60 p-4 sm:p-6">
        <span className={cn(iconTile, 'h-12 w-12 bg-glaze text-on-glaze shadow-sm')} aria-hidden="true"><ShieldCheck size={24} /></span>
        <div>
          <h2 id="handovers-heading" className="font-book text-headline-sm font-semibold text-ink ar:leading-[1.5]">{t('transactionsTitle')}</h2>
          <p className={cn('mt-0.5 text-body-md text-ink-2', ui.measure)}>{t('transactionIntro')}</p>
        </div>
      </div>
      {error ? <Alert className="mb-5" title={t('transactionFailed')} onRetry={() => { setLoading(true); void reload(); }} retryLabel={t('tryAgain')}>{error}</Alert> : null}
      {loading ? <CardSkeletons label={t('loadingTransactions')} grid /> : transactions.length === 0 && !error ? (
        <EmptyState icon={<Handshake size={28} />} title={t('nothingMoving')} description={t('acceptedBecomeTransactions')} />
      ) : (
        <div className="grid gap-6">
          {current.length ? (
            <ul className="grid gap-4 lg:grid-cols-2 lg:gap-6" aria-label={t('inProgress')}>{current.map((transaction) => (
              <li key={transaction.id} className={cn(ui.card, 'flex flex-col gap-4 p-5 md:p-6')}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-strong/30 pb-3">
                  <span className={cn('inline-flex items-center gap-1.5 text-label-md font-semibold', receiving(transaction) ? 'text-cobalt' : 'text-glaze-deep')}>
                    {receiving(transaction) ? <ArrowDownToLine size={17} aria-hidden="true" /> : <ArrowUpFromLine size={17} aria-hidden="true" />}
                    {receiving(transaction) ? t('youReceiving') : t('youGiving')}
                  </span>
                  <StatusPill status={transaction.status} />
                </div>
                <Link className="font-book text-title-lg font-semibold text-ink hover:text-glaze-deep md:text-headline-sm" to={`/books/${transaction.listing_id}`}>{transaction.listing_title || t('openBook')}</Link>
                <div className="grid gap-1.5 rounded-xl bg-sunk p-4 text-body-md">
                  <p className="flex items-start gap-2 text-ink">
                    <MapPin size={18} className="mt-0.5 flex-none text-glaze-deep" aria-hidden="true" />
                    <span><span className="block font-semibold">{t('agreedMethod')}</span><span className="text-ink-2">{formatMeetup(transaction.fulfillment_method, t)}</span></span>
                  </p>
                  <p className="ps-[26px] text-body-sm text-ink-2">{t('publicPlaceTip')}</p>
                </div>
                {transaction.status === 'arranging' ? (
                  <div className="mt-auto grid gap-2 pt-1">
                    <Button block className="min-h-12 rounded-xl" onClick={() => void complete(transaction)} loading={busyId === transaction.id}>
                      {busyId === transaction.id ? null : <CheckCircle2 size={18} aria-hidden="true" />}{t('markComplete')}
                    </Button>
                    <p className="text-center text-label-sm text-ink-2">{t('confirmOnlyAfter')}</p>
                  </div>
                ) : null}
              </li>
            ))}</ul>
          ) : null}
          {past.length ? (
            <section className={cn(ui.card, 'p-4 md:p-6')} aria-labelledby="past-handovers-heading">
              <h3 id="past-handovers-heading" className="flex items-center gap-2.5 text-title-md font-semibold text-ink">
                <CheckCircle2 size={20} className="text-cobalt" aria-hidden="true" />{t('pastHandovers')} <span className="font-normal text-ink-2">({past.length})</span>
              </h3>
              <ul className="mt-4 grid gap-1 border-t border-line-strong/30 pt-3">{past.map((transaction) => (
                <li key={transaction.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-body-md">
                  <span className="min-w-0">
                    <Link className="font-semibold text-ink hover:text-glaze-deep" to={`/books/${transaction.listing_id}`}>{transaction.listing_title || t('openBook')}</Link>
                    <span className="block text-body-sm text-ink-2">{receiving(transaction) ? t('youReceiving') : t('youGiving')} · {formatMeetup(transaction.fulfillment_method, t)}</span>
                  </span>
                  <StatusPill status={transaction.status} />
                </li>
              ))}</ul>
            </section>
          ) : null}
        </div>
      )}
    </section>
  );
}

function CardSkeletons({ label, count = 3, grid = false }: { label: string; count?: number; grid?: boolean }) {
  return (
    <div className={cn('grid gap-4', grid && 'md:grid-cols-2 md:gap-6')} aria-busy="true" aria-label={label}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={cn(ui.card, 'flex animate-pulse-soft gap-4 p-5')}>
          <span className="h-24 w-[4.5rem] flex-none rounded-lg bg-line" />
          <span className="grid flex-1 content-start gap-2.5 pt-1">
            <span className="h-3 w-1/4 rounded-full bg-line" />
            <span className="h-4 w-3/4 rounded-full bg-line" />
            <span className="h-3 w-1/2 rounded-full bg-line" />
          </span>
        </div>
      ))}
    </div>
  );
}
