import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, BookOpen, CalendarDays, Compass, Flag, Handshake, MapPin, Search, Share2, UserX } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { describeError, isNotFound } from '../errors';
import { formatCondition, useLanguage } from '../i18n';
import type { MessageKey } from '../i18n';
import type { Listing, ListingType, PublicProfile } from '../types';
import { priceLabel } from '../lib/listing';
import { Avatar } from '../components/avatar';
import { BookCard, BookCardSkeleton } from '../components/book';
import { fill } from '../components/deals';
import { ReportDialog } from '../components/report-dialog';
import { Alert } from '../components/ui/alert';
import { Button, buttonClass } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { useToast } from '../components/ui/toast';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';

const PAGE_SIZE = 12;
type TypeFilter = 'all' | ListingType;
type Sort = 'newest' | 'price_asc';

/** Colour dot per listing type, matching the type badges on book cards (sale cobalt, exchange turquoise, free ochre). */
const typeChips: Array<{ value: TypeFilter; label: MessageKey; dot?: string }> = [
  { value: 'all', label: 'typeAll' },
  { value: 'sale', label: 'forSale', dot: 'bg-cobalt' },
  { value: 'exchange', label: 'exchange', dot: 'bg-glaze' },
  { value: 'free', label: 'free', dot: 'bg-ochre' },
];

const bookGrid = 'grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3';

/** A reader's public shelf: who they are (no contact details), and the books they offer now. */
export default function SellerProfile() {
  const { userId = '' } = useParams();
  const { session } = useAuth();
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [profileError, setProfileError] = useState<'missing' | string | null>(null);
  const [books, setBooks] = useState<Listing[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [booksError, setBooksError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [type, setType] = useState<TypeFilter>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const isSelf = session?.user.id === userId;
  const backTo = (location.state as { from?: string } | null)?.from;

  const loadProfile = useCallback(() => {
    let active = true;
    setProfileError(null);
    api.publicProfile(userId)
      .then((next) => { if (active) setProfile(next); })
      .catch((reason) => { if (active) setProfileError(isNotFound(reason) ? 'missing' : describeError(reason, t, 'profileFailed')); });
    return () => { active = false; };
  }, [userId, t]);

  useEffect(() => loadProfile(), [loadProfile]);

  // Search waits for a pause in typing so each key press is not a request.
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const fetchBooks = useCallback((pageNumber: number) => api.listings({
    sellerId: userId, listingType: type === 'all' ? undefined : type, q: search || undefined, sort, page: pageNumber, pageSize: PAGE_SIZE,
  }), [userId, type, search, sort]);

  const loadBooks = useCallback(() => {
    let active = true;
    setBooks(null);
    setBooksError('');
    setPage(1);
    fetchBooks(1)
      .then((result) => { if (active) { setBooks(result.items); setTotal(result.total); } })
      .catch((reason) => { if (active) setBooksError(describeError(reason, t, 'profileBooksFailed')); });
    return () => { active = false; };
  }, [fetchBooks, t]);

  useEffect(() => loadBooks(), [loadBooks]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const result = await fetchBooks(page + 1);
      setBooks((current) => [...(current ?? []), ...result.items.filter((item) => !current?.some((c) => c.id === item.id))]);
      setPage(page + 1);
    } catch (reason) {
      toast.error(t('profileBooksFailed'), describeError(reason, t, 'profileBooksFailed'));
    } finally {
      setLoadingMore(false);
    }
  };

  const share = async () => {
    const url = window.location.href.split('#')[0];
    try {
      if (navigator.share) { await navigator.share({ title: profile?.display_name, url }); return; }
      await navigator.clipboard.writeText(url);
      toast.success(t('profileLinkCopied'));
    } catch { /* Share sheet dismissed. */ }
  };

  const memberSince = useMemo(() => {
    if (!profile?.member_since) return null;
    const date = new Date(profile.member_since);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', { month: 'long', year: 'numeric' }).format(date);
  }, [profile, language]);

  if (profileError === 'missing') {
    return (
      <div className={cn(ui.wrap, ui.page)}>
        <EmptyState icon={<UserX size={28} />} title={t('profileNotFoundTitle')} description={t('profileNotFoundCopy')} headingLevel="h1"
          action={<Link className={buttonClass()} to="/"><Compass size={18} aria-hidden="true" />{t('browseBooks')}</Link>} />
      </div>
    );
  }

  const counts = profile?.available;
  const name = profile?.display_name ?? '';
  const filtered = type !== 'all' || Boolean(search);

  return (
    <div className={cn(ui.wrap, ui.page)}>
      {backTo ? (
        <button type="button" onClick={() => navigate(-1)} className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-label-lg font-semibold text-ink-2 hover:text-glaze-deep">
          <ArrowLeft size={17} className={ui.flipRtl} aria-hidden="true" />{t('goBack')}
        </button>
      ) : null}

      {profileError ? <Alert className="mb-6" onRetry={loadProfile} retryLabel={t('tryAgain')}>{profileError}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] lg:gap-10">
        <aside className="grid content-start gap-5 lg:sticky lg:top-[calc(var(--topbar-h)+24px)] lg:self-start">
          {profile ? (
            <section className={cn(ui.card, 'relative overflow-hidden p-5 sm:p-6')} aria-labelledby="profile-name">
              <span className="pointer-events-none absolute -end-12 -top-12 h-40 w-40 rounded-full bg-glaze-soft/50 blur-2xl" aria-hidden="true" />
              <div className="relative flex items-start gap-4">
                <Avatar name={name} url={profile.avatar_url} className="h-20 w-20 rounded-full bg-glaze text-headline-lg text-on-glaze shadow-sm" />
                <div className="min-w-0 flex-1 pt-1">
                  <h1 id="profile-name" dir="auto" className="font-book text-headline-md font-bold text-ink [overflow-wrap:anywhere] ar:leading-[1.5]">{name}</h1>
                  {profile.area ? (
                    <p className="mt-1 flex items-center gap-1.5 text-body-md text-ink-2">
                      <MapPin size={16} className="flex-none text-glaze-deep" aria-hidden="true" />{profile.area}
                    </p>
                  ) : null}
                  {memberSince ? (
                    <p className="mt-0.5 flex items-center gap-1.5 text-body-sm text-ink-3">
                      <CalendarDays size={15} className="flex-none" aria-hidden="true" />{fill(t('memberSince'), { date: memberSince })}
                    </p>
                  ) : null}
                </div>
                <button type="button" onClick={() => void share()} className="relative -me-2 -mt-1 grid h-11 w-11 flex-none place-items-center rounded-full text-ink-2 hover:bg-sunk hover:text-ink" aria-label={t('shareProfile')} title={t('shareProfile')}>
                  <Share2 size={19} aria-hidden="true" />
                </button>
              </div>

              <dl className="relative mt-5 grid grid-cols-2 gap-2.5">
                <Stat label={t('statAvailable')} value={counts?.total ?? 0} strong />
                <Stat label={t('statHandedOver')} value={profile.handed_over} />
              </dl>

              {isSelf ? (
                <div className="relative mt-4 grid gap-3 rounded-xl bg-ochre-soft/70 p-3.5 text-body-sm text-ochre-ink">
                  <p>{t('yourPublicProfile')}</p>
                  <Link to="/account/books" className={cn(buttonClass({ variant: 'secondary', size: 'sm' }), 'min-h-10 justify-self-start')}>
                    <BookOpen size={16} aria-hidden="true" />{t('manageMyBooks')}
                  </Link>
                </div>
              ) : null}
            </section>
          ) : !profileError ? <ProfileSkeleton label={t('profileLoading')} /> : null}

          <section className="hidden gap-2 rounded-card bg-sunk p-5 lg:grid" aria-labelledby="profile-safety">
            <SafetyNote />
          </section>

          {profile && !isSelf ? (
            <ReportButton onClick={() => {
              if (session) { setReportOpen(true); return; }
              toast.info(t('signInBeforeReportUser'));
              navigate('/signin', { state: { from: `/users/${userId}` } });
            }} className="hidden lg:inline-flex" />
          ) : null}
        </aside>

        <section aria-labelledby="profile-books-heading" aria-busy={books === null} className="min-w-0">
          <div className={cn(ui.card, 'flex flex-wrap items-center gap-3 p-3 ps-4 sm:p-4 sm:ps-5')}>
            <h2 id="profile-books-heading" className="flex items-center gap-2.5 font-book text-headline-sm font-bold text-ink ar:leading-[1.5]">
              <span className="h-6 w-1.5 rounded-full bg-glaze" aria-hidden="true" />
              {t('availableBooks')}
              {counts ? <span className="font-ui text-title-md font-semibold text-ink-3">({counts.total})</span> : null}
            </h2>
            <div className="ms-auto flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
              <label className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
                <span className="sr-only">{fill(t('searchSellerBooks'), { name })}</span>
                <Search size={17} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
                <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={fill(t('searchSellerBooks'), { name })}
                  className="h-11 w-full rounded-xl border border-transparent bg-sunk pe-3 ps-10 text-body-md text-ink placeholder:text-ink-3 focus:border-glaze focus:bg-surface focus:outline-none" />
              </label>
              <label className="flex-none">
                <span className="sr-only">{t('sortBooks')}</span>
                <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}
                  className="h-11 appearance-none rounded-xl border border-transparent bg-sunk bg-chevron bg-[position:right_12px_center] bg-no-repeat pe-9 ps-3 text-label-md font-medium text-ink focus:border-glaze focus:outline-none rtl:bg-[position:left_12px_center]">
                  <option value="newest">{t('sortNewest')}</option>
                  <option value="price_asc">{t('sortPriceLow')}</option>
                </select>
              </label>
            </div>
          </div>

          <div className="-mx-[var(--gutter)] mt-4 flex gap-2 overflow-x-auto px-[var(--gutter)] pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden" role="group" aria-label={t('filterByType')}>
            {typeChips.map(({ value, label, dot }) => {
              const count = counts ? (value === 'all' ? counts.total : counts[value]) : null;
              const selected = type === value;
              return (
                <button key={value} type="button" aria-pressed={selected} onClick={() => setType(value)}
                  className={cn('inline-flex min-h-10 flex-none items-center gap-2 rounded-full px-4 text-label-md font-semibold transition-colors',
                    selected ? 'bg-glaze text-on-glaze shadow-sm' : 'bg-surface text-ink-2 shadow-card hover:text-ink')}>
                  {dot ? <span className={cn('h-2 w-2 rounded-full', selected ? 'bg-on-glaze' : dot)} aria-hidden="true" /> : null}
                  {t(label)}
                  {count !== null ? <span className={cn('tabular-nums', selected ? 'opacity-90' : 'text-ink-3')}>{count}</span> : null}
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            {booksError ? <Alert onRetry={loadBooks} retryLabel={t('tryAgain')}>{booksError}</Alert>
              : books === null ? (
                <ul className={bookGrid} aria-label={t('loadingBooks')}>
                  {Array.from({ length: 6 }).map((_, index) => <li key={index}><BookCardSkeleton /></li>)}
                </ul>
              ) : books.length === 0 ? (
                filtered ? (
                  <EmptyState icon={<Search size={28} />} title={t('profileNoMatchTitle')} description={t('profileNoMatchCopy')}
                    action={<Button variant="secondary" onClick={() => { setType('all'); setQuery(''); }}>{t('showAllBooks')}</Button>} />
                ) : (
                  <div className={cn(ui.card, 'px-4 py-2')}>
                    <EmptyState icon={<BookOpen size={28} />} title={t('profileEmptyTitle')}
                      description={isSelf ? t('profileOwnEmptyCopy') : fill(t('profileEmptyCopy'), { name })}
                      action={isSelf
                        ? <Link className={buttonClass()} to="/sell">{t('listBook')}</Link>
                        : <Link className={buttonClass()} to="/"><Compass size={18} aria-hidden="true" />{t('browseBooks')}</Link>} />
                  </div>
                )
              ) : (
                <>
                  <ul className={bookGrid}>
                    {books.map((listing) => (
                      <li key={listing.id}>
                        <BookCard listing={listing} to={`/books/${listing.id}`} price={priceLabel(listing, t)}
                          conditionLabel={formatCondition(listing.condition, t)} authorFallback={t('authorNotListed')} />
                      </li>
                    ))}
                  </ul>
                  {books.length < total ? (
                    <div className="mt-8 flex justify-center">
                      <Button variant="tonal" loading={loadingMore} onClick={() => void loadMore()}>{t('loadMoreBooks')}</Button>
                    </div>
                  ) : null}
                </>
              )}
          </div>

          <div className="mt-8 grid gap-4 lg:hidden">
            <section className="grid gap-2 rounded-card bg-sunk p-5" aria-labelledby="profile-safety-mobile">
              <SafetyNote id="profile-safety-mobile" />
            </section>
            {profile && !isSelf ? (
              <ReportButton className="justify-self-center" onClick={() => {
                if (session) { setReportOpen(true); return; }
                toast.info(t('signInBeforeReportUser'));
                navigate('/signin', { state: { from: `/users/${userId}` } });
              }} />
            ) : null}
          </div>
        </section>
      </div>

      {session && !isSelf ? (
        <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} target={{ userId }} token={session.access_token} />
      ) : null}
    </div>
  );
}

function Stat({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="grid justify-items-center gap-0.5 rounded-xl bg-sunk px-3 py-3 text-center">
      <dd className={cn('order-first font-book text-headline-md font-bold tabular-nums ar:font-ui', strong ? 'text-glaze-deep' : 'text-ink')}>{value}</dd>
      <dt className="text-label-md text-ink-2">{label}</dt>
    </div>
  );
}

function SafetyNote({ id = 'profile-safety' }: { id?: string }) {
  const { t } = useLanguage();
  return (
    <>
      <h2 id={id} className="flex items-center gap-2 text-title-md font-bold text-ink">
        <Handshake size={20} className="flex-none text-glaze-deep" aria-hidden="true" />{t('profileSafetyTitle')}
      </h2>
      <p className="text-body-sm text-ink-2">{t('profileSafetyCopy')}</p>
    </>
  );
}

function ReportButton({ onClick, className }: { onClick: () => void; className?: string }) {
  const { t } = useLanguage();
  return (
    <button type="button" onClick={onClick} className={cn('inline-flex min-h-11 items-center justify-center gap-2 text-label-md font-semibold text-ink-3 hover:text-pom', className)}>
      <Flag size={16} aria-hidden="true" />{t('reportUser')}
    </button>
  );
}

function ProfileSkeleton({ label }: { label: string }): ReactNode {
  return (
    <div className={cn(ui.card, 'grid gap-4 p-6')} aria-busy="true" aria-label={label}>
      <div className="flex items-center gap-4">
        <span className={cn(ui.skeleton, 'h-20 w-20 rounded-full')} />
        <span className="grid flex-1 gap-2">
          <span className={cn(ui.skeleton, 'h-7 w-3/4')} />
          <span className={cn(ui.skeleton, 'h-4 w-1/2')} />
        </span>
      </div>
      <span className={cn(ui.skeleton, 'h-20 rounded-xl')} />
    </div>
  );
}
