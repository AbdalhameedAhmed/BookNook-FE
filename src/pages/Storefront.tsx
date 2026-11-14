import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, Banknote, BookOpen, Handshake, Library, MapPinned, MessageSquareText, Search, SearchCheck, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { Listing, ListingType } from '../types';
import { formatCondition, useLanguage } from '../i18n';
import type { MessageKey } from '../i18n';
import { describeError } from '../errors';
import { priceLabel } from '../lib/listing';
import { Alert } from '../components/ui/alert';
import { Button, buttonClass } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { BookCard, BookCardSkeleton, Shelf } from '../components/book';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';

const pageSize = 12;
const conditions = ['like_new', 'good', 'acceptable', 'heavily_used'];
const steps: Array<{ title: MessageKey; copy: MessageKey; icon: LucideIcon; tone: string }> = [
  { title: 'stepFind', copy: 'stepFindCopy', icon: SearchCheck, tone: 'bg-glaze text-on-glaze' },
  { title: 'stepReach', copy: 'stepReachCopy', icon: MessageSquareText, tone: 'bg-cobalt text-white dark:text-paper' },
  { title: 'stepKeep', copy: 'stepKeepCopy', icon: Handshake, tone: 'bg-ochre text-white dark:text-paper' },
];

export default function Storefront() {
  const { t, language } = useLanguage();
  const { session } = useAuth();
  const [shelf, setShelf] = useState<Listing[]>([]);
  const [shelfLoading, setShelfLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [type, setType] = useState<'' | ListingType>('');
  const [condition, setCondition] = useState('');
  const [page, setPage] = useState(1);
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const booksRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    api.listings({ pageSize: 24 })
      .then((result) => { if (active) setShelf(result.items); })
      .catch(() => { /* The catalogue below reports load errors. */ })
      .finally(() => { if (active) setShelfLoading(false); });
    return () => { active = false; };
  }, []);

  // Debounce typing so every keystroke doesn't hit the API.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, query ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    if (page === 1) setLoading(true); else setLoadingMore(true);
    api.listings({ q: debouncedQuery, listingType: type, condition, page, pageSize })
      .then((result) => {
        if (!active) return;
        setListings((current) => (page === 1 ? result.items : [...current, ...result.items]));
        setTotal(result.total);
        setError('');
      })
      .catch((reason) => { if (active) setError(describeError(reason, t, 'loadShelfError')); })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setLoadingMore(false);
      });
    return () => { active = false; };
  }, [debouncedQuery, type, condition, page, reloadKey, t]);

  const isFiltered = Boolean(debouncedQuery || type || condition);
  // Any filter change starts again from the first page.
  const clearFilters = () => { setQuery(''); setType(''); setCondition(''); setPage(1); };
  const types: Array<{ value: '' | ListingType; label: string }> = [
    { value: '', label: t('everything') },
    { value: 'sale', label: t('forSale') },
    { value: 'exchange', label: t('exchange') },
    { value: 'free', label: t('free') },
  ];

  const sellLink = { to: session ? '/sell' : '/signin', state: session ? undefined : { from: '/sell' } };
  const trust = [
    { icon: Banknote, label: t('trustCash') },
    { icon: BadgeCheck, label: t('trustNoCommission') },
    { icon: MapPinned, label: t('trustPublicMeetup') },
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-sunk pb-14">
        <div className="pointer-events-none absolute -top-24 end-0 h-96 w-96 rounded-full bg-glaze-fixed/30 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -start-20 top-1/2 h-80 w-80 rounded-full bg-cobalt-soft/50 blur-3xl" aria-hidden="true" />
        <div className={cn(ui.wrap, 'relative pt-8 md:pt-10')}>
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-sunk-3 px-3 py-1 text-label-sm text-ink-2 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-glaze" aria-hidden="true" />
                {t('heroKicker')}
              </p>
              <h1 className="font-book text-headline-lg-mobile font-bold text-ink md:text-headline-lg ar:leading-[1.4] ar:tracking-normal">{t('heroTitle')}</h1>
              {/* Stitch pairs the English title with its Arabic line; the Arabic layout has no English echo. */}
              {language === 'en' ? <p className="mt-1 font-book text-headline-sm font-semibold text-glaze-deep md:text-headline-md" lang="ar" dir="rtl">{t('heroSecondLine')}</p> : null}
              <p className="mt-2 max-w-xl text-body-lg text-ink-2">{t('heroLead')}</p>
            </div>
            <ul className="flex flex-wrap items-start gap-1.5 lg:flex-col lg:items-end">
              {trust.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-1.5 rounded-ctl bg-surface px-3 py-2 text-label-md font-semibold text-ink shadow-sm">
                  <Icon className="text-glaze-deep" size={18} aria-hidden="true" />{label}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-10">
            <Shelf
              listings={shelf}
              loading={shelfLoading}
              label={t('shelfLabel')}
              title={t('ledgeTitle')}
              subtitle={language === 'en' ? <span lang="ar">{t('ledgeSubtitle')}</span> : null}
              addLink={{ ...sellLink, label: t('yourBookHere') }}
              emptyAction={<Link className="font-book text-lg text-glaze-deep underline underline-offset-4" to={sellLink.to} state={sellLink.state}>{t('shelfEmptyCta')}</Link>}
            />
          </div>
        </div>
      </section>

      <div className={cn(ui.wrap, 'relative z-10 -mt-6')}>
        <div className="flex flex-col gap-4 rounded-2xl bg-surface p-4 shadow-deck">
          <form className="relative" role="search" onSubmit={(event) => { event.preventDefault(); booksRef.current?.scrollIntoView({ block: 'start' }); }}>
            <Search className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-ink-3" size={20} aria-hidden="true" />
            <input className="h-12 w-full rounded-xl border border-transparent bg-sunk pe-4 ps-11 text-body-md text-ink placeholder:text-ink-3 focus:border-glaze focus:bg-surface focus:shadow-[0_0_0_3px_rgb(var(--glaze-soft))] focus:outline-none" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchBooks')} aria-label={t('searchBooks')} enterKeyHint="search" />
          </form>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex max-w-full gap-1.5 overflow-x-auto [scrollbar-width:none]" role="group" aria-label={t('filterBooks')}>
              {types.map((item) => (
                <button
                  key={item.value || 'all'}
                  type="button"
                  className={cn(
                    'inline-flex min-h-9 flex-none items-center rounded-full px-3.5 text-label-md font-semibold transition-colors',
                    item.value ? chipTones[item.value] : 'bg-sunk-2 text-ink-2 hover:bg-sunk-3',
                    'aria-pressed:bg-ink aria-pressed:text-paper aria-pressed:hover:bg-ink',
                  )}
                  aria-pressed={type === item.value}
                  onClick={() => { setType(item.value); setPage(1); }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <label>
                <span className="sr-only">{t('filterCondition')}</span>
                <select className="h-10 appearance-none rounded-ctl border border-transparent bg-sunk bg-chevron bg-[position:right_12px_center] bg-no-repeat pe-9 ps-3 text-label-md font-medium text-ink focus:border-glaze focus:outline-none rtl:bg-[position:left_12px_center]" value={condition} onChange={(event) => { setCondition(event.target.value); setPage(1); }}>
                  <option value="">{t('conditionAny')}</option>
                  {conditions.map((value) => <option key={value} value={value}>{formatCondition(value, t)}</option>)}
                </select>
              </label>
              {isFiltered ? <Button variant="ghost" size="sm" onClick={clearFilters}><X size={16} aria-hidden="true" />{t('everything')}</Button> : null}
            </div>
          </div>
        </div>
      </div>

      <section className="pb-12 pt-10" id="books" ref={booksRef} aria-labelledby="books-heading">
        <div className={ui.wrap}>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="books-heading" className="font-book text-headline-sm font-bold text-ink ar:leading-[1.5]">{t('browseHeading')}</h2>
              <p className="text-body-sm text-ink-2">{t('browseLead')}</p>
            </div>
            {!loading && !error ? (
              <p className="text-label-sm text-ink-3" aria-live="polite">
                {listings.length < total
                  ? t('showingCount').replace('{shown}', String(listings.length)).replace('{total}', String(total))
                  : `${total} ${total === 1 ? t('bookCountOne') : t('booksCount')}`}
              </p>
            ) : null}
          </div>

          {error ? <Alert className="mb-5" title={t('somethingWrong')} onRetry={() => setReloadKey((key) => key + 1)} retryLabel={t('tryAgain')}>{error}</Alert> : null}

          {loading ? (
            <ul className={bookGrid} aria-busy="true" aria-label={t('loadingBooks')}>
              {Array.from({ length: 8 }).map((_, index) => <li key={index}><BookCardSkeleton /></li>)}
            </ul>
          ) : error && listings.length === 0 ? null : listings.length === 0 ? (
            <EmptyState
              icon={<Search size={24} />}
              title={isFiltered ? t('noMatches') : t('shelfWaiting')}
              description={isFiltered ? t('tryDifferentSearch') : t('firstBook')}
              action={isFiltered
                ? <Button variant="secondary" onClick={clearFilters}>{t('everything')}</Button>
                : <Link className={buttonClass()} to={sellLink.to} state={sellLink.state}>{t('listBook')}</Link>}
            />
          ) : (
            <>
              <ul className={bookGrid}>
                {listings.map((listing) => (
                  <li key={listing.id}>
                    <BookCard
                      listing={listing}
                      to={`/books/${listing.id}`}
                      price={priceLabel(listing, t)}
                      conditionLabel={formatCondition(listing.condition, t)}
                      authorFallback={t('authorNotListed')}
                      sellerLabel={t('listedBy')}
                    />
                  </li>
                ))}
              </ul>
              {listings.length < total ? (
                <div className="mt-10 flex justify-center">
                  <Button variant="tonal" size="lg" loading={loadingMore} onClick={() => setPage((current) => current + 1)}>
                    {loadingMore ? null : <BookOpen size={20} aria-hidden="true" />}{t('showMore')}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      <section className="bg-sunk py-14 md:py-16" aria-labelledby="how-heading">
        <div className={ui.wrap}>
          <div className="mx-auto max-w-2xl text-center">
            <p className={ui.eyebrow}>{t('howKicker')}</p>
            <h2 id="how-heading" className="mt-2 font-book text-headline-lg-mobile font-bold text-ink md:text-headline-lg ar:leading-[1.5]">{t('howTitle')}</h2>
            <p className="mt-2 text-body-lg text-ink-2">{t('howLead')}</p>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
            {steps.map(({ title, copy, icon: Icon, tone }, index) => (
              <li key={title} className="rounded-card bg-surface p-6 shadow-card">
                <span className={cn('grid h-12 w-12 place-items-center rounded-xl', tone)} aria-hidden="true"><Icon size={24} /></span>
                <p className="mt-6 text-label-sm font-semibold uppercase tracking-[0.06em] text-ink-3 ar:normal-case ar:tracking-normal">{t('stepLabel')} {String(index + 1).padStart(2, '0')}</p>
                <h3 className="mt-1 text-headline-sm font-bold text-ink">{t(title)}</h3>
                <p className="mt-2 text-body-lg text-ink-2">{t(copy)}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 rounded-xl border-s-[3px] border-ochre bg-surface/60 px-4 py-3 text-body-md text-ink-2">{t('noDelivery')}</p>
          <div className="mt-6 flex flex-col items-start gap-4 rounded-card bg-sunk-2 p-6 sm:flex-row sm:items-center">
            <span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-glaze-deep text-paper" aria-hidden="true"><Library size={22} /></span>
            <div className="flex-1">
              <p className="text-title-lg font-bold text-ink">{t('ctaOverflowTitle')}</p>
              <p className="text-body-md text-ink-2">{t('ctaOverflowCopy')}</p>
            </div>
            <Link className={cn(buttonClass({ size: 'lg' }), 'bg-glaze-deep')} to={sellLink.to} state={sellLink.state}>{t('ctaOverflowButton')}</Link>
          </div>
        </div>
      </section>
    </>
  );
}

const bookGrid = 'grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4';
/** Idle filter chips are tinted with their listing-type colour; the pressed one turns ink. */
const chipTones: Record<ListingType, string> = {
  sale: 'bg-cobalt-soft text-cobalt-ink hover:brightness-95',
  exchange: 'bg-glaze-fixed/60 text-glaze-deep hover:bg-glaze-fixed',
  free: 'bg-ochre-soft text-ochre-ink hover:brightness-95',
};
