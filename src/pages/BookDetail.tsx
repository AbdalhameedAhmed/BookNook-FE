import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, MapPin, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { Listing } from '../types';
import { formatCondition, formatMeetup, useLanguage } from '../i18n';

const detailFallback = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=1200&q=90';

export default function BookDetail() {
  const { listingId = '' } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { t } = useLanguage();
  const [listing, setListing] = useState<Listing | null>(null);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    api.listing(listingId)
      .then((result) => { if (active) setListing(result); })
      .catch(() => { if (active) setListing(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [listingId]);

  if (loading) return <main className="detail-loading">{t('loadingBooks')}…</main>;
  if (!listing) {
    return <main className="detail-missing"><span>{t('bookNotFound')}</span><h1>{t('pageTurned')}</h1><Link to="/">{t('backShelf')} <ArrowLeft size={16} /></Link></main>;
  }

  const image = listing.images?.[0] && !listing.images[0].includes('images.example.com') ? listing.images[0] : detailFallback;
  const requestBook = async () => {
    if (!session) {
      navigate('/signin', { state: { from: `/books/${listing.id}` } });
      return;
    }
    setSubmitting(true);
    setNotice('');
    try {
      await api.createRequest(session.access_token, listing.id, message.trim() || 'I’m interested in this book.');
      setNotice(t('requestSent'));
      setMessage('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t('requestError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="detail-page">
      <Link className="back-link" to="/"><ArrowLeft size={17} /> {t('backShelf')}</Link>
      <div className="detail-layout">
        <div className="detail-photo-wrap">
          <img src={image} alt={`${t('coverAlt')}: ${listing.title}`} className="detail-photo" />
          <span className={`book-type type-${listing.listing_type}`}>{listing.listing_type === 'sale' ? t('forSale') : listing.listing_type === 'exchange' ? t('exchange') : t('free')}</span>
          <span className="photo-index">BOOK / {listing.id.slice(0, 6).toUpperCase()}</span>
        </div>
        <section className="detail-content">
          <p className="eyebrow eyebrow-ink">{t('bookFromFayoum')}</p>
          <h1>{listing.title}</h1>
          <p className="detail-byline">{listing.author || t('unknown')} <span>·</span> {formatCondition(listing.condition, t)}</p>
          <p className="detail-description">{listing.description || t('shelfCopy')}</p>
          <div className="detail-price-line">
            <strong>{listing.price_egp != null ? `${listing.price_egp} ${languageCurrency(t)}` : listing.listing_type === 'free' ? t('priceFree') : t('openExchange')}</strong>
            {listing.price_egp != null ? <span>{t('priceSetByOwner')}</span> : null}
          </div>
          <div className="detail-facts">
            <div><MapPin size={18} /><span><small>{t('area')}</small><strong>{listing.area}</strong></span></div>
            <div><ShieldCheck size={18} /><span><small>{t('handover')}</small><strong>{formatMeetup(listing.meetup_preference, t)}</strong></span></div>
          </div>
          <label className="message-label" htmlFor="request-note">{t('addNote')}</label>
          <textarea id="request-note" value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t('notePlaceholder')} rows={3} />
          <button className="request-cta" type="button" disabled={submitting || listing.status !== 'active' || session?.user.id === listing.seller_id} onClick={requestBook}>
            {submitting ? t('sending') : listing.status !== 'active' ? t('notAvailable') : session?.user.id === listing.seller_id ? t('yourListing') : session ? t('requestBook') : t('signInToRequest')}
            <ArrowUpRight size={18} />
          </button>
          {notice ? <p className="form-notice" role="status">{notice}</p> : null}
          <p className="detail-footnote">{t('detailSafety')}</p>
        </section>
      </div>
    </main>
  );
}

function languageCurrency(t: (key: import('../i18n').MessageKey) => string) {
  return t('currencyCode');
}
