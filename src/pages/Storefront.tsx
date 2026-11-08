import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
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
import { BookCover, Shelf, TileBody, coverSkeleton } from '../components/book';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';

const pageSize = 12;
const conditions = ['like_new', 'good', 'acceptable', 'heavily_used'];
const steps: Array<{ title: MessageKey; copy: MessageKey }> = [
  { title: 'stepFind', copy: 'stepFindCopy' },
  { title: 'stepReach', copy: 'stepReachCopy' },
  { title: 'stepKeep', copy: 'stepKeepCopy' },
];

export default function Storefront() {
  const { t } = useLanguage();
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

  return (
    <>
      <section className="pt-8 md:pt-14">
        <div className={ui.wrap}>
          <h1 className="max-w-[15ch] font-book text-[clamp(2.125rem,6vw,3.75rem)] font-semibold leading-[1.06] tracking-[-0.025em] ar:max-w-[22ch] ar:leading-[1.35] ar:tracking-normal">{t('heroTitle')}</h1>
          <p className="mt-4 max-w-[54ch] text-17 text-ink-2">{t('heroLead')}</p>
          <form className="relative mt-6 flex max-w-[620px] items-center gap-1.5 rounded-[14px] border-[1.5px] border-line-strong bg-surface p-[5px] focus-within:border-glaze focus-within:shadow-[0_0_0_3px_rgb(var(--glaze-soft))]" role="search" onSubmit={(event) => { event.preventDefault(); booksRef.current?.scrollIntoView({ block: 'start' }); }}>
            <Search className="pointer-events-none absolute start-4 text-ink-3" size={20} aria-hidden="true" />
            <input className="min-h-[46px] min-w-0 flex-1 border-0 bg-transparent pe-2 ps-[42px] text-base placeholder:text-[#757575] focus:outline-none" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchBooks')} aria-label={t('searchBooks')} enterKeyHint="search" />
            <Button type="submit">{t('heroSearchButton')}</Button>
          </form>
        </div>
        <div className={cn(ui.wrap, 'mt-9')}>
          <Shelf
            listings={shelf}
            loading={shelfLoading}
            label={t('shelfLabel')}
            addLink={{ to: session ? '/sell' : '/signin', state: session ? undefined : { from: '/sell' }, label: t('yourBookHere') }}
            emptyAction={<Link className="font-book text-lg text-glaze underline underline-offset-4" to={session ? '/sell' : '/signin'} state={session ? undefined : { from: '/sell' }}>{t('shelfEmptyCta')}</Link>}
          />
        </div>
      </section>

      <section className="pb-8 pt-14" id="books" ref={booksRef} aria-labelledby="books-heading">
        <div className={ui.wrap}>
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="books-heading" className={ui.sectionTitle}>{t('browseHeading')}</h2>
            {!loading && !error ? (
              <p className="text-15 text-ink-3" aria-live="polite">
                {total} {total === 1 ? t('bookCountOne') : t('booksCount')}
              </p>
            ) : null}
          </div>

          <div className="sticky top-[var(--topbar-h)] z-20 -mx-[var(--gutter)] mb-6 mt-3 flex flex-wrap items-center gap-2.5 border-b border-line bg-paper px-[var(--gutter)] py-2.5">
            <div className="flex max-w-full gap-2 overflow-x-auto [scrollbar-width:none]" role="group" aria-label={t('filterBooks')}>
              {types.map((item) => (
                <button
                  key={item.value || 'all'}
                  type="button"
                  className={cn(
                    'inline-flex min-h-10 flex-none items-center gap-[7px] rounded-full border border-line-strong bg-surface px-[15px] text-sm font-medium text-ink-2',
                    'aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper',
                    item.value && `before:h-2 before:w-2 before:rounded-full ${chipDots[item.value]}`,
                  )}
                  aria-pressed={type === item.value}
                  onClick={() => { setType(item.value); setPage(1); }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <label>
              <span className="sr-only">{t('filterCondition')}</span>
              <select className="min-h-10 appearance-none rounded-full border border-line-strong bg-surface bg-chevron bg-[position:right_14px_center] bg-no-repeat pe-9 ps-3.5 text-sm font-medium text-ink-2 rtl:bg-[position:left_14px_center]" value={condition} onChange={(event) => { setCondition(event.target.value); setPage(1); }}>
                <option value="">{t('conditionAny')}</option>
                {conditions.map((value) => <option key={value} value={value}>{formatCondition(value, t)}</option>)}
              </select>
            </label>
            {isFiltered ? <Button variant="ghost" size="sm" onClick={clearFilters}><X size={16} aria-hidden="true" />{t('everything')}</Button> : null}
          </div>

          {error ? <Alert className="mb-5" title={t('somethingWrong')} onRetry={() => setReloadKey((key) => key + 1)} retryLabel={t('tryAgain')}>{error}</Alert> : null}

          {loading ? (
            <ul className={bookGrid} aria-busy="true" aria-label={t('loadingBooks')}>
              {Array.from({ length: 8 }).map((_, index) => (
                <li key={index} className="flex flex-col gap-3">
                  <span className={coverSkeleton()} />
                  <span className={cn(ui.skeleton, 'mt-2 h-3.5 w-4/5')} />
                  <span className={cn(ui.skeleton, 'mt-2 h-3.5 w-[45%]')} />
                </li>
              ))}
            </ul>
          ) : error && listings.length === 0 ? null : listings.length === 0 ? (
            <EmptyState
              icon={<Search size={24} />}
              title={isFiltered ? t('noMatches') : t('shelfWaiting')}
              description={isFiltered ? t('tryDifferentSearch') : t('firstBook')}
              action={isFiltered
                ? <Button variant="secondary" onClick={clearFilters}>{t('everything')}</Button>
                : <Link className={buttonClass()} to={session ? '/sell' : '/signin'} state={session ? undefined : { from: '/sell' }}>{t('listBook')}</Link>}
            />
          ) : (
            <>
              <ul className={bookGrid}>
                {listings.map((listing) => <li key={listing.id}><BookTile listing={listing} /></li>)}
              </ul>
              {listings.length < total ? (
                <div className="mt-10 flex justify-center">
                  <Button variant="secondary" loading={loadingMore} onClick={() => setPage((current) => current + 1)}>{t('showMore')}</Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      <section className="mt-10 bg-sunk pb-[72px] pt-14" aria-labelledby="how-heading">
        <div className={ui.wrap}>
          <h2 id="how-heading" className={ui.sectionTitle}>{t('howTitle')}</h2>
          <ol className="mt-7 grid gap-7 [counter-reset:step] md:grid-cols-[repeat(3,1fr)] md:gap-10">
            {steps.map(({ title, copy }) => (
              <li key={title} className="border-t-2 border-ink pt-4 [counter-increment:step] before:mb-3 before:block before:font-book before:text-4xl before:font-semibold before:leading-none before:text-glaze before:content-[counter(step)]">
                <h3 className="mb-1 text-lg font-semibold">{t(title)}</h3>
                <p className="max-w-[36ch] text-ink-2">{t(copy)}</p>
              </li>
            ))}
          </ol>
          <p className="mb-6 mt-9 max-w-[62ch] border-s-[3px] border-ochre ps-3.5 text-ink-2">{t('noDelivery')}</p>
          <Link className={buttonClass({ size: 'lg' })} to={session ? '/sell' : '/signin'} state={session ? undefined : { from: '/sell' }}>{t('listBook')}</Link>
        </div>
      </section>
    </>
  );
}

const bookGrid = 'grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-10 lgx:grid-cols-4 xl:grid-cols-5';
const chipDots: Record<ListingType, string> = { sale: 'before:bg-cobalt', exchange: 'before:bg-olive', free: 'before:bg-ochre' };

function BookTile({ listing }: { listing: Listing }) {
  const { t } = useLanguage();
  return (
    <Link to={`/books/${listing.id}`} className="group flex flex-col gap-3">
      <BookCover listing={listing} />
      <TileBody
        linked
        title={listing.title}
        author={listing.author || t('authorNotListed')}
        price={priceLabel(listing, t)}
        type={listing.listing_type}
        area={listing.area}
        condition={formatCondition(listing.condition, t)}
      />
    </Link>
  );
}
