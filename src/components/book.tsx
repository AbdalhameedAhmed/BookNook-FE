import { useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MapPin, Plus } from 'lucide-react';
import type { Listing, ListingType } from '../types';
import { formatStatus, useLanguage } from '../i18n';
import { bookLook, listingImage, listingTypeLabel, priceLabel } from '../lib/listing';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';

type CoverListing = Pick<Listing, 'id' | 'title' | 'author' | 'images'>;
type CoverSize = 'sm' | 'md' | 'lg';

/** A book's outline. The hinge sits on the left in English and on the right in Arabic. */
const coverBase = 'relative block aspect-[3/4] w-full overflow-hidden rounded-e-[6px] rounded-s-[2px] bg-sunk shadow-book after:pointer-events-none after:absolute after:inset-y-0 after:start-0 after:w-[9px] after:bg-[linear-gradient(to_right,rgb(0_0_0/.2),rgb(255_255_255/.1)_55%,transparent)] rtl:after:bg-[linear-gradient(to_left,rgb(0_0_0/.2),rgb(255_255_255/.1)_55%,transparent)]';
const coverSizes: Record<CoverSize, string> = {
  sm: 'w-14 flex-none',
  md: '',
  lg: 'mx-auto max-w-[300px] lg:max-w-[460px]',
};
const coverBands = [
  '',
  'bg-[linear-gradient(to_bottom,transparent_70%,rgb(0_0_0/.14)_70%,rgb(0_0_0/.14)_76%,transparent_76%)]',
  'bg-[linear-gradient(to_bottom,transparent_10%,rgb(255_255_255/.16)_10%,rgb(255_255_255/.16)_13%,transparent_13%)]',
];
const coverTitleSizes: Record<CoverSize, string> = {
  sm: 'text-[0.5625rem] line-clamp-3',
  md: 'text-[clamp(0.95rem,2.4vw,1.25rem)]',
  lg: 'text-[clamp(1.5rem,4vw,2.25rem)]',
};

/** Placeholder with a cover's proportions, for loading states. */
export function coverSkeleton(size: CoverSize = 'md') {
  return cn(ui.skeleton, 'aspect-[3/4] w-full', coverSizes[size]);
}

/**
 * The seller's photo when there is one. Older listings without a photo get a
 * typographic cover so they never borrow a stock image of a different book.
 */
export function BookCover({ listing, photo, className, alt = '', size = 'md' }: {
  listing: CoverListing;
  photo?: string | null;
  className?: string;
  alt?: string;
  size?: CoverSize;
}) {
  const image = photo ?? listingImage(listing);
  if (image) {
    return (
      <span className={cn(coverBase, coverSizes[size], className)}>
        <img className={cn('h-full w-full object-cover', size === 'lg' && 'bg-sunk object-contain')} src={image} alt={alt} loading="lazy" />
      </span>
    );
  }
  const look = bookLook(listing);
  return (
    <span
      className={cn(
        coverBase,
        coverSizes[size],
        'flex flex-col justify-between bg-[color:var(--book-bg)] px-[13%] pb-[12%] pt-[16%] text-[color:var(--book-ink)]',
        'before:absolute before:inset-[6%] before:rounded-[2px] before:border before:border-current before:opacity-[.35]',
        coverBands[look.band],
        size === 'sm' && 'px-1.5 py-2',
        className,
      )}
      style={{ '--book-bg': look.bg, '--book-ink': look.ink } as CSSProperties}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      <span className={cn('relative line-clamp-4 font-book font-semibold leading-[1.15]', coverTitleSizes[size])}>{listing.title || '…'}</span>
      {listing.author && size !== 'sm' ? <span className={cn('relative opacity-[.85]', size === 'lg' ? 'text-base' : 'text-xs')}>{listing.author}</span> : null}
    </span>
  );
}

/** Listing-type colours from the Stitch design: sale = cobalt, exchange = turquoise, free = ochre. */
export const typeTones: Record<ListingType, string> = {
  sale: 'bg-cobalt-soft text-cobalt-ink',
  exchange: 'bg-glaze-fixed text-glaze-deep',
  free: 'bg-ochre-soft text-ochre-ink',
};
/** Solid versions, for badges laid over a photo. */
const typeSolid: Record<ListingType, string> = {
  sale: 'bg-cobalt text-white dark:text-paper',
  exchange: 'bg-glaze text-on-glaze',
  free: 'bg-ochre text-white',
};
/** The coloured edge on shelf tiles. */
export const typeEdge: Record<ListingType, string> = {
  sale: 'bg-cobalt',
  exchange: 'bg-glaze',
  free: 'bg-ochre',
};

export function TypeTag({ type, className }: { type: ListingType; className?: string }) {
  const { t } = useLanguage();
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-label-md font-semibold', typeTones[type], className)}>{listingTypeLabel(type, t)}</span>;
}

const statusDots: Record<string, string> = {
  active: 'before:bg-glaze', accepted: 'before:bg-glaze', completed: 'before:bg-glaze',
  pending: 'before:bg-ochre', arranging: 'before:bg-ochre', reserved: 'before:bg-ochre',
  sold: 'before:bg-cobalt', exchanged: 'before:bg-cobalt',
  rejected: 'before:bg-pom', removed: 'before:bg-pom', disputed: 'before:bg-pom',
};

export function StatusPill({ status }: { status: string }) {
  const { t } = useLanguage();
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-sunk-2 px-2.5 py-0.5 text-label-md font-semibold capitalize text-ink-2 before:h-1.5 before:w-1.5 before:rounded-full', statusDots[status] ?? 'before:bg-ink-3')}>
      {formatStatus(status, t)}
    </span>
  );
}

/**
 * The catalogue card from the Stitch design: photo on top with the price/type and condition
 * badges laid over it, then title, author, area and who listed it.
 * Used by the storefront grid and the listing editor's preview.
 */
export function BookCard({ listing, price, conditionLabel, authorFallback, sellerLabel, to, photo }: {
  listing: CoverListing & Pick<Listing, 'listing_type' | 'area'> & { seller_name?: string | null };
  price: string;
  conditionLabel: string;
  authorFallback: string;
  /** e.g. "Listed by Mona"; omitted in the editor preview. */
  sellerLabel?: string;
  /** Makes the whole card a link to the listing. */
  to?: string;
  photo?: string | null;
}) {
  const body = (
    <>
      <span className="relative block aspect-[3/4] w-full overflow-hidden bg-sunk">
        <BookCover listing={listing} photo={photo} className="h-full rounded-none shadow-none after:hidden [&>img]:transition-transform [&>img]:duration-300 group-hover:[&>img]:scale-105" />
        <span className="absolute start-3 top-3 flex flex-col items-start gap-1">
          <span className={cn('rounded-full px-2.5 py-1 text-label-sm font-bold shadow-sm', typeSolid[listing.listing_type])}>{price}</span>
          <span className="rounded-md bg-surface/90 px-2 py-0.5 text-[11px] font-medium text-ink backdrop-blur-sm">{conditionLabel}</span>
        </span>
      </span>
      <span className="flex flex-1 flex-col justify-between p-4">
        <span className="block min-w-0">
          <span dir="auto" className={cn('line-clamp-1 ltr:text-left rtl:text-right text-title-lg font-bold text-ink transition-colors', to && 'group-hover:text-glaze-deep')}>{listing.title}</span>
          <span dir="auto" className="mt-0.5 block truncate ltr:text-left rtl:text-right text-body-sm font-medium text-ink-2">{listing.author || authorFallback}</span>
          <span className="mt-1 flex min-w-0 items-center gap-1 text-ink-2">
            <MapPin className="shrink-0 text-glaze-deep" size={15} aria-hidden="true" />
            <span dir="auto" className="min-w-0 truncate text-label-sm">{listing.area}</span>
          </span>
        </span>
        {sellerLabel && listing.seller_name ? (
          <span className="mt-2 flex items-center gap-2 border-t border-line-strong/40 pt-3">
            <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-cobalt-soft text-label-sm font-bold text-cobalt-ink" aria-hidden="true">{listing.seller_name.slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0 truncate text-label-sm text-ink-2">{sellerLabel} {listing.seller_name}</span>
          </span>
        ) : null}
      </span>
    </>
  );
  const card = 'group flex h-full flex-col overflow-hidden rounded-card bg-surface shadow-card transition-shadow duration-300';
  return to
    ? <Link to={to} className={cn(card, 'hover:shadow-card-hover')}>{body}</Link>
    : <div className={card}>{body}</div>;
}

/** Placeholder with a card's shape, for loading states. */
export function BookCardSkeleton() {
  return (
    <span className="flex flex-col overflow-hidden rounded-card bg-surface shadow-card">
      <span className={cn(ui.skeleton, 'aspect-[3/4] w-full rounded-none')} />
      <span className="grid gap-2 p-4">
        <span className={cn(ui.skeleton, 'h-4 w-4/5')} />
        <span className={cn(ui.skeleton, 'h-3.5 w-1/2')} />
        <span className={cn(ui.skeleton, 'h-3 w-2/5')} />
      </span>
    </span>
  );
}

/* ---------- The ledge: newest listings standing on a shelf rail ---------- */

const ledgeRow = 'relative flex items-end gap-4 overflow-x-auto scroll-smooth px-2 pt-6 [scrollbar-width:none] md:gap-5 [&::-webkit-scrollbar]:hidden';
const ledgeRail = (
  <>
    <div className="h-2 w-full rounded-full bg-ledge shadow-[0_8px_16px_-4px_rgb(19_28_42/.18)]" />
    <div className="mt-0.5 h-1 w-full rounded-full bg-glaze-deep/20" />
  </>
);
/** Tile heights vary like real books; derived from the id so they stay stable. */
const tileHeights = ['h-36', 'h-40', 'h-44', 'h-48', 'h-[9.5rem]', 'h-[10.5rem]'];
const tileHeight = (id: string) => tileHeights[[...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % tileHeights.length];

/** A row of real listings drawn as covers standing on a ledge, with scroll buttons. */
export function Shelf({ listings, loading, label, title, subtitle, emptyAction, addLink }: {
  listings: Listing[];
  loading: boolean;
  label: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  emptyAction?: ReactNode;
  /** Shown as an outlined tile after the real books. */
  addLink?: { to: string; state?: unknown; label: string };
}) {
  const { t } = useLanguage();
  const rowRef = useRef<HTMLUListElement>(null);
  const scroll = (direction: 1 | -1) => {
    const row = rowRef.current;
    if (!row) return;
    const rtl = getComputedStyle(row).direction === 'rtl';
    row.scrollBy({ left: direction * (rtl ? -1 : 1) * row.clientWidth * 0.8, behavior: 'smooth' });
  };
  const roundButton = 'grid h-9 w-9 place-items-center rounded-full bg-surface text-ink-2 shadow-sm transition-colors hover:bg-sunk-3 hover:text-ink';

  return (
    <section aria-label={label}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="flex flex-wrap items-baseline gap-x-2">
          {title ? <span className="text-title-md font-semibold text-ink">{title}</span> : null}
          {subtitle ? <span className="text-label-sm text-ink-2">{subtitle}</span> : null}
        </p>
        {!loading && listings.length > 0 ? (
          <span className="flex gap-1.5">
            <button type="button" className={roundButton} onClick={() => scroll(-1)} aria-label={t('scrollBack')}><ChevronLeft className={ui.flipRtl} size={18} aria-hidden="true" /></button>
            <button type="button" className={roundButton} onClick={() => scroll(1)} aria-label={t('scrollForward')}><ChevronRight className={ui.flipRtl} size={18} aria-hidden="true" /></button>
          </span>
        ) : null}
      </div>
      {loading ? (
        <div className={ledgeRow} aria-busy="true" aria-label={t('loadingBooks')}>
          {Array.from({ length: 8 }).map((_, index) => <span key={index} className={cn(ui.skeleton, 'w-28 flex-none rounded-b-none', tileHeights[index % tileHeights.length])} />)}
        </div>
      ) : listings.length === 0 ? (
        <div className="flex h-44 items-center justify-center">{emptyAction}</div>
      ) : (
        <ul ref={rowRef} className={ledgeRow}>
          {listings.map((listing, index) => (
            <li key={listing.id} className="flex-none motion-safe:animate-shelve" style={{ animationDelay: `${Math.min(index, 14) * 28}ms` }}>
              <Link
                to={`/books/${listing.id}`}
                className={cn(
                  'relative flex w-28 flex-col justify-between overflow-hidden rounded-t-sm bg-gradient-to-br from-surface to-sunk-3 p-2.5 ps-3.5 shadow-md transition-transform duration-200 hover:-translate-y-2 focus-visible:-translate-y-2',
                  tileHeight(listing.id),
                )}
                aria-label={`${listing.title}, ${priceLabel(listing, t)}`}
              >
                <span className={cn('absolute inset-y-0 start-0 w-1.5', typeEdge[listing.listing_type])} aria-hidden="true" />
                <span className="flex justify-end" aria-hidden="true">
                  <span className={cn('max-w-full truncate rounded-full px-1.5 py-0.5 text-label-sm font-bold', typeTones[listing.listing_type])}>{priceLabel(listing, t)}</span>
                </span>
                <span className="block min-w-0" aria-hidden="true">
                  <span dir="auto" className="line-clamp-3 ltr:text-left rtl:text-right text-[13px] font-bold leading-tight text-ink">{listing.title}</span>
                  {listing.author ? <span dir="auto" className="mt-0.5 block truncate ltr:text-left rtl:text-right text-[11px] text-ink-2">{listing.author}</span> : null}
                </span>
              </Link>
            </li>
          ))}
          {addLink ? (
            <li className="flex-none">
              <Link to={addLink.to} state={addLink.state} className="flex h-40 w-28 flex-col items-center justify-center gap-2 rounded-t-sm border-2 border-b-0 border-dashed border-glaze/60 p-2.5 text-center text-label-md font-semibold text-glaze-deep transition-transform duration-200 hover:-translate-y-2">
                <Plus size={22} aria-hidden="true" />
                {addLink.label}
              </Link>
            </li>
          ) : null}
        </ul>
      )}
      {ledgeRail}
    </section>
  );
}

/** Decorative covers on a ledge, used where the shelf is brand texture only. */
export function DecorativeShelf() {
  const tiles: Array<{ edge: string; h: string }> = [
    { edge: 'bg-cobalt', h: 'h-28' }, { edge: 'bg-ochre', h: 'h-32' }, { edge: 'bg-glaze', h: 'h-24' },
    { edge: 'bg-cobalt', h: 'h-36' }, { edge: 'bg-glaze', h: 'h-[6.5rem]' }, { edge: 'bg-ochre', h: 'h-[7.5rem]' },
  ];
  return (
    <div aria-hidden="true">
      <div className="flex items-end gap-3 overflow-hidden px-2 pt-4">
        {tiles.map((tile, index) => (
          <span key={index} className={cn('relative w-16 flex-none overflow-hidden rounded-t-sm bg-gradient-to-br from-surface to-sunk-3 shadow-md', tile.h)}>
            <span className={cn('absolute inset-y-0 start-0 w-1.5', tile.edge)} />
            <span className="absolute bottom-3 end-2 start-3.5 grid gap-1">
              <span className="h-1.5 w-4/5 rounded-full bg-ink/20" />
              <span className="h-1 w-1/2 rounded-full bg-ink/10" />
            </span>
          </span>
        ))}
      </div>
      <div className="h-2 w-full rounded-full bg-ledge" />
      <div className="mt-0.5 h-1 w-full rounded-full bg-glaze-deep/20" />
    </div>
  );
}
