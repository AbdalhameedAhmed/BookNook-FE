import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowRight, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Listing, ListingType } from '../types';
import { formatCondition, useLanguage } from '../i18n';

const coverFallbacks = [
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=760&q=85',
  'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=760&q=85',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=760&q=85',
];

function coverFor(listing: Listing, index: number) {
  const image = listing.images?.[0];
  return image && !image.includes('images.example.com') ? image : coverFallbacks[index % coverFallbacks.length];
}

export default function Storefront() {
  const { t } = useLanguage();
  const [listings, setListings] = useState<Listing[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | ListingType>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.listings(query.trim())
      .then((result) => {
        if (active) {
          setListings(result.items);
          setError('');
        }
      })
      .catch(() => {
        if (active) setError(t('loadShelfError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [query, t]);

  const visibleListings = listings.filter((listing) => filter === 'all' || listing.listing_type === filter);
  const featured = visibleListings[0];
  const filters: Array<{ label: string; value: 'all' | ListingType }> = [
    { label: t('everything'), value: 'all' },
    { label: t('forSale'), value: 'sale' },
    { label: t('exchange'), value: 'exchange' },
    { label: t('free'), value: 'free' },
  ];

  return (
    <>
      <section className="market-hero">
        <div className="market-hero-image" aria-hidden="true" />
        <div className="market-hero-content">
          <p className="eyebrow"><span className="eyebrow-dot" /> {t('heroEyebrow')}</p>
          <h1>{t('heroTitleOne')}<br /><em>{t('heroTitleTwo')}</em></h1>
          <p className="hero-description">{t('heroCopy')}</p>
          <a className="hero-link" href="#the-shelf">{t('exploreShelf')} <ArrowDownRight size={17} /></a>
        </div>
        <div className="hero-note"><span>{t('heroIndex')}</span><span>{t('heroMotto')}</span></div>
      </section>

      <section className="shelf-section" id="the-shelf">
        <div className="section-heading">
          <div>
            <p className="eyebrow eyebrow-ink"><Sparkles size={14} /> {t('shelfEyebrow')}</p>
            <h2>{t('shelfTitleOne')}<br className="desktop-break" /> {t('shelfTitleTwo')}</h2>
          </div>
          <p className="section-aside">{t('shelfCopy')}</p>
        </div>

        <div className="shelf-controls">
          <label className="search-field">
            <Search size={19} aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchBooks')} aria-label={t('searchBooks')} />
            <kbd>/</kbd>
          </label>
          <div className="filter-row" aria-label={t('filterBooks')}>
            <SlidersHorizontal size={16} aria-hidden="true" />
            {filters.map((item) => (
              <button key={item.value} type="button" className={filter === item.value ? 'filter-tab is-active' : 'filter-tab'} onClick={() => setFilter(item.value)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {error ? <div className="inline-alert" role="alert">{error}</div> : null}
        {loading ? (
            <div className="book-grid" aria-label={t('loadingBooks')}>
            {Array.from({ length: 3 }).map((_, index) => <div className="book-skeleton" key={index} />)}
          </div>
        ) : visibleListings.length === 0 ? (
          <div className="shelf-empty">
            <span className="empty-symbol">∅</span>
            <h3>{query ? t('noMatches') : t('shelfWaiting')}</h3>
            <p>{query ? t('tryDifferentSearch') : t('firstBook')}</p>
          </div>
        ) : (
          <div className="book-grid">
            {visibleListings.map((listing, index) => (
              <BookTile key={listing.id} listing={listing} image={coverFor(listing, index)} index={index} />
            ))}
          </div>
        )}

        {featured ? (
          <Link to={`/books/${featured.id}`} className="browse-more">
            <span><strong>{t('lookingSpecific')}</strong><small>{t('openListingHint')}</small></span>
            <span className="circle-arrow"><ArrowRight size={19} /></span>
          </Link>
        ) : null}
      </section>
      <section className="local-note">
        <div className="local-note-mark">BN<span>.</span></div>
        <p>{t('madeForReaders')} <strong>{t('localPromise')}</strong></p>
        <span className="local-note-coordinate">29°18′N&nbsp; 30°50′E</span>
      </section>
      <section className="how-section" id="how-it-works">
        <p className="eyebrow eyebrow-ink">{t('howEyebrow')}</p>
        <h2>{t('howTitleOne')}<br /><em>{t('howTitleTwo')}</em></h2>
        <div className="how-steps">
          <article><span>01</span><h3>{t('stepFind')}</h3><p>{t('stepFindCopy')}</p></article>
          <article><span>02</span><h3>{t('stepReach')}</h3><p>{t('stepReachCopy')}</p></article>
          <article><span>03</span><h3>{t('stepKeep')}</h3><p>{t('stepKeepCopy')}</p></article>
        </div>
      </section>
    </>
  );
}

function BookTile({ listing, image, index }: { listing: Listing; image: string; index: number }) {
  const { t } = useLanguage();
  return (
    <Link to={`/books/${listing.id}`} className={`book-tile tile-${index % 3}`}>
      <div className="book-art">
        <img src={image} alt="" loading="lazy" />
        <span className={`book-type type-${listing.listing_type}`}>{listing.listing_type === 'sale' ? t('forSale') : listing.listing_type === 'exchange' ? t('exchange') : t('free')}</span>
        <span className="book-art-arrow"><ArrowRight size={17} /></span>
      </div>
      <div className="book-tile-info">
        <div><h3>{listing.title}</h3><p>{listing.author || t('authorNotListed')}</p></div>
        <strong>{listing.price_egp != null ? `${listing.price_egp} ${t('currencyCode')}` : listing.listing_type === 'free' ? t('free') : t('swap')}</strong>
      </div>
      <div className="book-tile-meta"><span>{listing.area}</span><span>{formatCondition(listing.condition, t)}</span></div>
    </Link>
  );
}
