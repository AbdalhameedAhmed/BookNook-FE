import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Handshake, MapPin, MessageCircle, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { Listing, ListingType } from '../types';
import { formatCondition, useLanguage } from '../i18n';
import type { MessageKey } from '../i18n';
import { describeError } from '../errors';
import { coverFor, listingTypeLabel, priceLabel } from '../lib/listing';
import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button, buttonVariants } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { Input } from '../components/ui/input';

const heroImage = 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1100&q=80';

const trustPoints: MessageKey[] = ['trustBrowse', 'trustPublic', 'trustNoFees'];

const steps: Array<{ icon: typeof Search; title: MessageKey; copy: MessageKey }> = [
  { icon: Search, title: 'stepFind', copy: 'stepFindCopy' },
  { icon: MessageCircle, title: 'stepReach', copy: 'stepReachCopy' },
  { icon: Handshake, title: 'stepKeep', copy: 'stepKeepCopy' },
];

export default function Storefront() {
  const { t } = useLanguage();
  const { session } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState<number | null>(null);
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
          if (!active) return;
          setListings(result.items);
          if (!query.trim()) setTotal(result.total);
          setError('');
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
  const isFiltered = Boolean(query) || filter !== 'all';
  const filters: Array<{ label: string; value: 'all' | ListingType }> = [
    { label: t('everything'), value: 'all' },
    { label: t('forSale'), value: 'sale' },
    { label: t('exchange'), value: 'exchange' },
    { label: t('free'), value: 'free' },
  ];
  const scrollToListings = () => document.getElementById('listings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="hero-badge"><MapPin size={14} aria-hidden="true" /> {t('heroEyebrow')}</span>
            <h1 className="hero-title">{t('heroTitleOne')} <span>{t('heroTitleTwo')}</span></h1>
            <p className="hero-lead">{t('heroCopy')}</p>
            <form className="hero-search" role="search" onSubmit={(event) => { event.preventDefault(); scrollToListings(); }}>
              <Search className="hero-search-icon" size={20} aria-hidden="true" />
              <input className="hero-search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchBooks')} aria-label={t('searchBooks')} />
              <Button type="submit" size="lg" className="hero-search-button">{t('heroSearchButton')}</Button>
            </form>
            <ul className="hero-trust">
              {trustPoints.map((key) => <li key={key}><CheckCircle2 size={16} aria-hidden="true" />{t(key)}</li>)}
            </ul>
          </div>
          <div className="hero-visual">
            <img className="hero-image" src={heroImage} alt="" />
            <div className="hero-stat">
              <span className="hero-stat-icon" aria-hidden="true"><BookOpen size={20} /></span>
              <span><strong>{total ?? '—'}</strong><small>{t('booksOnShelf')}</small></span>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="listings">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">{t('shelfEyebrow')}</p>
            <h2 className="section-title">{t('shelfTitleOne')} {t('shelfTitleTwo')}</h2>
            <p className="section-subtitle">{t('shelfCopy')}</p>
          </div>

          <div className="toolbar">
            <label className="search-field">
              <Search size={18} aria-hidden="true" />
              <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchBooks')} aria-label={t('searchBooks')} />
            </label>
            <div className="segmented" role="group" aria-label={t('filterBooks')}>
              {filters.map((item) => (
                <button key={item.value} type="button" className={filter === item.value ? 'segmented-item is-active' : 'segmented-item'} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {!loading && !error ? <p className="results-count" aria-live="polite">{visibleListings.length} {t('resultsCount')}</p> : null}
          {error ? <Alert className="page-alert" title={t('somethingWrong')} onRetry={() => setReloadKey((key) => key + 1)} retryLabel={t('tryAgain')}>{error}</Alert> : null}

          {loading ? (
            <div className="book-grid" aria-busy="true" aria-label={t('loadingBooks')}>
              {Array.from({ length: 8 }).map((_, index) => (
                <div className="book-card book-card-skeleton" key={index}>
                  <div className="skeleton sk-media" />
                  <div className="book-card-body"><div className="skeleton sk-line" /><div className="skeleton sk-line sk-short" /></div>
                </div>
              ))}
            </div>
          ) : error && listings.length === 0 ? null : visibleListings.length === 0 ? (
            <EmptyState
              icon={<Search size={24} />}
              title={isFiltered ? t('noMatches') : t('shelfWaiting')}
              description={isFiltered ? t('tryDifferentSearch') : t('firstBook')}
              action={isFiltered ? <Button variant="outline" onClick={() => { setQuery(''); setFilter('all'); }}>{t('everything')}</Button> : null}
            />
          ) : (
            <div className="book-grid">
              {visibleListings.map((listing, index) => <BookCard key={listing.id} listing={listing} image={coverFor(listing, index)} />)}
            </div>
          )}
        </div>
      </section>

      <section className="section section-muted" id="how-it-works">
        <div className="container">
          <div className="section-head section-head-center">
            <p className="eyebrow">{t('howEyebrow')}</p>
            <h2 className="section-title">{t('howTitleOne')} {t('howTitleTwo')}</h2>
          </div>
          <ol className="steps">
            {steps.map(({ icon: Icon, title, copy }, index) => (
              <li className="step-card" key={title}>
                <div className="step-top">
                  <span className="step-icon" aria-hidden="true"><Icon size={22} /></span>
                  <span className="step-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <h3>{t(title)}</h3>
                <p>{t(copy)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>{t('ctaTitle')}</h2>
              <p>{t('ctaCopy')}</p>
            </div>
            <Link className={buttonVariants({ variant: 'inverse', size: 'lg' })} to={session ? '/account/books?new=1' : '/signin'} state={session ? undefined : { from: '/account/books' }}>
              {t('listBook')} <ArrowRight size={18} className="flip-rtl" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function BookCard({ listing, image }: { listing: Listing; image: string }) {
  const { t } = useLanguage();
  return (
    <article className="book-card">
      <Link to={`/books/${listing.id}`} className="book-card-link">
        <div className="book-card-media">
          <img src={image} alt="" loading="lazy" />
          <Badge variant={listing.listing_type} className="book-card-badge">{listingTypeLabel(listing.listing_type, t)}</Badge>
        </div>
        <div className="book-card-body">
          <h3 className="book-card-title">{listing.title}</h3>
          <p className="book-card-author">{listing.author || t('authorNotListed')}</p>
          <div className="book-card-footer">
            <span className="book-card-price">{priceLabel(listing, t)}</span>
            <span className="book-card-condition">{formatCondition(listing.condition, t)}</span>
          </div>
          <p className="book-card-meta"><MapPin size={14} aria-hidden="true" />{listing.area}</p>
        </div>
      </Link>
    </article>
  );
}
