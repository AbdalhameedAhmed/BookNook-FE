import { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, MapPin, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Listing, ListingType } from '../types';
import { formatCondition, useLanguage } from '../i18n';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Alert } from '../components/ui/alert';
import { describeError } from '../errors';

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
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    // Debounce typing so every keystroke doesn't hit the API.
    const timer = window.setTimeout(() => {
      api.listings(query.trim())
        .then((result) => {
          if (active) {
            setListings(result.items);
            setError('');
          }
        })
        .catch((reason) => {
          if (active) setError(describeError(reason, t, 'loadShelfError'));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, query ? 300 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, reloadKey, t]);

  const visibleListings = listings.filter((listing) => filter === 'all' || listing.listing_type === filter);
  const featured = visibleListings[0];
  const filters: Array<{ label: string; value: 'all' | ListingType }> = [
    { label: t('everything'), value: 'all' },
    { label: t('forSale'), value: 'sale' },
    { label: t('exchange'), value: 'exchange' },
    { label: t('free'), value: 'free' },
  ];

  return (
    <main className="storefront">
      <section className="storefront-hero">
        <div className="storefront-hero-copy">
          <Badge variant="outline" className="storefront-location"><MapPin size={13} /> {t('heroEyebrow')}</Badge>
          <h1>{t('heroTitleOne')} <em>{t('heroTitleTwo')}</em></h1>
          <p>{t('heroCopy')}</p>
          <Button className="storefront-hero-cta" onClick={() => document.getElementById('the-shelf')?.scrollIntoView({ behavior: 'smooth' })}>
            {t('exploreShelf')} <ArrowDown size={16} />
          </Button>
        </div>
        <div className="storefront-hero-image" role="img" aria-label={t('heroEyebrow')}>
          <span>{t('heroMotto')}</span>
        </div>
      </section>

      <section className="shelf-section shelf-section-v2" id="the-shelf">
        <div className="section-heading">
          <div>
            <p className="eyebrow eyebrow-ink"><Sparkles size={14} /> {t('shelfEyebrow')}</p>
            <h2>{t('shelfTitleOne')} {t('shelfTitleTwo')}</h2>
          </div>
          <p className="section-aside">{t('shelfCopy')}</p>
        </div>

        <div className="shelf-controls shelf-controls-v2">
          <label className="storefront-search">
            <Search size={18} aria-hidden="true" />
            <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchBooks')} aria-label={t('searchBooks')} />
          </label>
          <div className="filter-row filter-row-v2" role="group" aria-label={t('filterBooks')}>
            <SlidersHorizontal size={16} aria-hidden="true" />
            {filters.map((item) => (
              <Button key={item.value} variant={filter === item.value ? 'default' : 'outline'} size="sm" aria-pressed={filter === item.value} className="filter-control" onClick={() => setFilter(item.value)}>
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {error ? <Alert className="page-alert" title={t('somethingWrong')} onRetry={() => setReloadKey((key) => key + 1)} retryLabel={t('tryAgain')}>{error}</Alert> : null}
        {loading ? (
          <div className="book-grid book-grid-v2" aria-busy="true" aria-label={t('loadingBooks')}>
            {Array.from({ length: 8 }).map((_, index) => <div className="store-skeleton" key={index} />)}
          </div>
        ) : error && listings.length === 0 ? null : visibleListings.length === 0 ? (
          <div className="shelf-empty shelf-empty-v2">
            <span className="empty-symbol"><Search size={24} /></span>
            <h3>{query || filter !== 'all' ? t('noMatches') : t('shelfWaiting')}</h3>
            <p>{query || filter !== 'all' ? t('tryDifferentSearch') : t('firstBook')}</p>
            {query || filter !== 'all' ? <Button variant="outline" size="sm" className="empty-action" onClick={() => { setQuery(''); setFilter('all'); }}>{t('everything')}</Button> : null}
          </div>
        ) : (
          <div className="book-grid book-grid-v2">
            {visibleListings.map((listing, index) => (
              <BookTile key={listing.id} listing={listing} image={coverFor(listing, index)} />
            ))}
          </div>
        )}

        {featured ? (
          <Link to={`/books/${featured.id}`} className="browse-more">
            <span><strong>{t('lookingSpecific')}</strong><small>{t('openListingHint')}</small></span>
            <span className="circle-arrow"><ArrowRight className="flip-rtl" size={19} /></span>
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
    </main>
  );
}

function BookTile({ listing, image }: { listing: Listing; image: string }) {
  const { t } = useLanguage();
  return (
    <Card className="book-card">
      <Link to={`/books/${listing.id}`} className="book-card-link">
        <div className="book-card-image">
          <img src={image} alt={listing.title} loading="lazy" />
          <Badge variant={listing.listing_type} className="book-card-badge">{listing.listing_type === 'sale' ? t('forSale') : listing.listing_type === 'exchange' ? t('exchange') : t('free')}</Badge>
          <span className="book-card-arrow" aria-hidden="true"><ArrowRight className="flip-rtl" size={17} /></span>
        </div>
        <CardContent className="book-card-content">
          <div className="book-card-title-row">
            <div className="book-card-title-copy"><h3>{listing.title}</h3><p>{listing.author || t('authorNotListed')}</p></div>
            <strong>{listing.price_egp != null ? `${listing.price_egp} ${t('currencyCode')}` : listing.listing_type === 'free' ? t('free') : t('swap')}</strong>
          </div>
          <div className="book-card-meta"><span><MapPin size={13} />{listing.area}</span><span>{formatCondition(listing.condition, t)}</span></div>
        </CardContent>
      </Link>
    </Card>
  );
}
