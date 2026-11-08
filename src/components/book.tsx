import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
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

const typeTones: Record<ListingType, string> = {
  sale: 'bg-cobalt-soft text-cobalt',
  exchange: 'bg-olive-soft text-olive',
  free: 'bg-ochre-soft text-ochre-ink',
};

export function TypeTag({ type, className }: { type: ListingType; className?: string }) {
  const { t } = useLanguage();
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-[9px] py-0.5 text-xs font-semibold leading-normal', typeTones[type], className)}>{listingTypeLabel(type, t)}</span>;
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
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-13 font-medium capitalize text-ink-2 before:h-2 before:w-2 before:rounded-full', statusDots[status] ?? 'before:bg-ink-3')}>
      {formatStatus(status, t)}
    </span>
  );
}

/** Title, author, price and place under a cover, for the catalogue and the listing preview. */
export function TileBody({ title, author, price, type, area, condition, linked = false }: {
  title: string;
  author: string;
  price: ReactNode;
  type: ListingType;
  area: string;
  condition: string;
  linked?: boolean;
}) {
  return (
    <span className="flex min-w-0 flex-col gap-[3px]">
      <span className={cn('line-clamp-2 font-book text-17 font-semibold leading-[1.25]', linked && 'group-hover:underline group-hover:decoration-1 group-hover:underline-offset-[3px]')}>{title}</span>
      <span className="truncate text-sm text-ink-3">{author}</span>
      <span className="mt-1 flex flex-wrap items-center gap-2">
        <strong className="font-semibold">{price}</strong>
        <TypeTag type={type} />
      </span>
      <span className="flex min-w-0 items-center gap-1 text-13 text-ink-3">
        <MapPin className="shrink-0" size={14} aria-hidden="true" />
        <span className="min-w-0 truncate">{area}</span>
        <span aria-hidden="true" className={cn(ui.sep, 'shrink-0')} />
        {condition}
      </span>
    </span>
  );
}

/* ---------- The shelf ---------- */

const shelfFrame = 'relative after:pointer-events-none after:absolute after:inset-x-[2%] after:-bottom-3 after:h-3 after:bg-[linear-gradient(to_bottom,rgb(23_32_46/.25),transparent)]';
const shelfRow = 'm-0 flex h-[190px] items-end gap-[3px] overflow-x-auto overflow-y-hidden border-b-[12px] border-ledge px-1.5 [mask-image:linear-gradient(to_right,#000_88%,transparent)] [scrollbar-width:none] md:h-[240px] md:gap-1 rtl:[mask-image:linear-gradient(to_left,#000_88%,transparent)] [&::-webkit-scrollbar]:hidden';
const spineSlot = 'flex h-full flex-none items-end motion-safe:animate-shelve [animation-delay:calc(min(var(--i),14)*28ms)]';
const spineBase = 'flex h-[var(--h)] w-[var(--w)] min-w-[34px] flex-none items-center justify-center rounded-t-[3px] bg-[color:var(--book-bg)] py-2.5 text-[color:var(--book-ink,#F4F6F3)] shadow-[inset_3px_0_0_rgb(255_255_255/.16),inset_-4px_0_0_rgb(0_0_0/.16)] transition-transform duration-[180ms] ease-out';
const spineLink = 'hover:-translate-y-3 focus-visible:-translate-y-3 focus-visible:outline-offset-[3px]';
const spineBands = [
  'bg-[linear-gradient(to_bottom,transparent_8%,rgb(255_255_255/.22)_8%,rgb(255_255_255/.22)_9.5%,transparent_9.5%,transparent_90.5%,rgb(255_255_255/.22)_90.5%,rgb(255_255_255/.22)_92%,transparent_92%)]',
  'bg-[linear-gradient(to_bottom,transparent_6%,rgb(0_0_0/.16)_6%,rgb(0_0_0/.16)_16%,transparent_16%)]',
  '',
];
const spineTitle = 'max-h-full rotate-180 overflow-hidden text-ellipsis whitespace-nowrap font-book text-13 font-semibold leading-[1.1] [writing-mode:vertical-rl]';
const spineSize = (width: number | string, height: number) => ({ '--w': typeof width === 'number' ? `${width}px` : width, '--h': `${height}%` });

const minSpines = 28;

/** A row of real listings drawn as spines standing on a shelf. */
export function Shelf({ listings, loading, label, emptyAction, addLink }: {
  listings: Listing[];
  loading: boolean;
  label: string;
  emptyAction?: ReactNode;
  /** Shown as an outlined spine after the real books when the shelf has room. */
  addLink?: { to: string; state?: unknown; label: string };
}) {
  const { t } = useLanguage();
  if (loading) {
    return (
      <div className={shelfFrame} aria-busy="true" aria-label={t('loadingBooks')}>
        <div className={shelfRow}>
          {Array.from({ length: 14 }).map((_, index) => <span key={index} className={cn(spineBase, 'animate-pulse-soft bg-line shadow-none')} style={spineSize(40 + (index * 7) % 18, 78 + (index * 11) % 20) as CSSProperties} />)}
        </div>
      </div>
    );
  }
  if (listings.length === 0) {
    return (
      <div className={shelfFrame}>
        <div className={cn(shelfRow, 'items-center justify-center [mask-image:none]')}>{emptyAction}</div>
      </div>
    );
  }
  return (
    <nav className={shelfFrame} aria-label={label}>
      <ul className={shelfRow}>
        {listings.map((listing, index) => {
          const look = bookLook(listing);
          return (
            <li key={listing.id} className={spineSlot} style={{ '--i': index } as CSSProperties}>
              <Link
                to={`/books/${listing.id}`}
                className={cn(spineBase, spineLink, spineBands[look.band])}
                style={{ '--book-bg': look.bg, '--book-ink': look.ink, ...spineSize(look.spineWidth, look.spineHeight) } as CSSProperties}
                aria-label={`${listing.title}, ${priceLabel(listing, t)}`}
              >
                <span className={spineTitle} aria-hidden="true">{listing.title}</span>
              </Link>
            </li>
          );
        })}
        {addLink && listings.length < minSpines ? (
          <li className={spineSlot} style={{ '--i': listings.length } as CSSProperties}>
            <Link to={addLink.to} state={addLink.state} className={cn(spineBase, spineLink, 'border-2 border-b-0 border-dashed border-glaze bg-transparent text-glaze shadow-none')} style={spineSize('46px', 88) as CSSProperties}>
              <span className={cn(spineTitle, 'font-ui')}>+ {addLink.label}</span>
            </Link>
          </li>
        ) : null}
        {/* Blank, muted spines keep a young shelf from looking abandoned. Decoration only. */}
        {Array.from({ length: Math.max(0, minSpines - listings.length - (addLink ? 1 : 0)) }).map((_, index) => (
          <li key={`blank-${index}`} className={spineSlot} aria-hidden="true" style={{ '--i': listings.length + index } as CSSProperties}>
            <span className={cn(spineBase, 'bg-line opacity-70 shadow-[inset_3px_0_0_rgb(255_255_255/.08),inset_-4px_0_0_rgb(0_0_0/.06)]')} style={spineSize(36 + (index * 13) % 22, 74 + (index * 17) % 24) as CSSProperties} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Decorative spines without content, used where the shelf is brand texture only. */
export function DecorativeShelf() {
  const widths = [44, 30, 52, 38, 46, 34, 58, 40, 36, 50, 42];
  const heights = [88, 74, 96, 82, 90, 70, 94, 86, 78, 92, 84];
  const colors = ['#12797B', '#C9921F', '#2B4A9A', '#D9C79E', '#5A6E2C', '#6B3A5B', '#8CC7C0', '#1E4E6B', '#C9921F', '#12797B', '#2B4A9A'];
  return (
    <div className={shelfFrame} aria-hidden="true">
      <div className={cn(shelfRow, 'h-[150px] overflow-hidden [mask-image:none] md:h-[150px]')}>
        {widths.map((width, index) => <span key={index} className={cn(spineBase, spineBands[index % 3])} style={{ '--book-bg': colors[index], ...spineSize(width, heights[index]) } as CSSProperties} />)}
      </div>
    </div>
  );
}
