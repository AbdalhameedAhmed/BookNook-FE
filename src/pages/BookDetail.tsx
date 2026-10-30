import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Flag, MapPin, ShieldCheck, Tag } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { Listing } from '../types';
import { formatCondition, formatMeetup, formatStatus, useLanguage } from '../i18n';
import type { MessageKey } from '../i18n';
import { describeError, isNotFound } from '../errors';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { useToast } from '../components/ui/toast';

const detailFallback = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=1200&q=90';
const messageLimit = 500;

export default function BookDetail() {
  const { listingId = '' } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState<{ notFound: boolean; message: string } | null>(null);
  const [requestError, setRequestError] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    api.listing(listingId)
      .then((result) => { if (active) setListing(result); })
      .catch((reason) => {
        if (!active) return;
        setListing(null);
        setLoadError({ notFound: isNotFound(reason), message: describeError(reason, t, 'loadDetailError') });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [listingId, t]);

  useEffect(() => load(), [load]);

  if (loading) return <DetailSkeleton label={t('loadingBooks')} />;
  if (loadError && !loadError.notFound) {
    return (
      <main className="detail-page">
        <Link className="back-link" to="/"><ArrowLeft size={17} className="flip-rtl" /> {t('backShelf')}</Link>
        <Alert title={t('loadDetailError')} onRetry={load} retryLabel={t('tryAgain')}>{loadError.message}</Alert>
      </main>
    );
  }
  if (!listing) {
    return <main className="detail-missing"><span>{t('bookNotFound')}</span><h1>{t('pageTurned')}</h1><Link to="/">{t('backShelf')} <ArrowLeft size={16} className="flip-rtl" /></Link></main>;
  }

  const image = listing.images?.[0] && !listing.images[0].includes('images.example.com') ? listing.images[0] : detailFallback;
  const isOwner = session?.user.id === listing.seller_id;
  const isAvailable = listing.status === 'active';

  const requireSignIn = (key: MessageKey) => {
    toast.info(t(key));
    navigate('/signin', { state: { from: `/books/${listing.id}` } });
  };

  const requestBook = async () => {
    if (!session) {
      requireSignIn('signInBeforeRequest');
      return;
    }
    setSubmitting(true);
    setRequestError('');
    try {
      await api.createRequest(session.access_token, listing.id, message.trim() || 'I’m interested in this book.');
      toast.success(t('requestSentTitle'), t('requestSent'));
      setRequestSent(true);
      setMessage('');
    } catch (reason) {
      const text = describeError(reason, t, 'requestError');
      setRequestError(text);
      toast.error(t('requestError'), text);
    } finally {
      setSubmitting(false);
    }
  };

  const ctaLabel = submitting ? t('sending')
    : !isAvailable ? t('notAvailable')
      : isOwner ? t('yourListing')
        : session ? t('requestBook') : t('signInToRequest');

  return (
    <main className="detail-page">
      <Link className="back-link" to="/"><ArrowLeft size={17} className="flip-rtl" /> {t('backShelf')}</Link>
      <div className="detail-layout">
        <div className="detail-photo-wrap">
          <img src={image} alt={`${t('coverAlt')}: ${listing.title}`} className="detail-photo" />
          <span className={`book-type type-${listing.listing_type}`}>{listing.listing_type === 'sale' ? t('forSale') : listing.listing_type === 'exchange' ? t('exchange') : t('free')}</span>
          <span className="photo-index">BOOK / {listing.id.slice(0, 6).toUpperCase()}</span>
        </div>
        <section className="detail-content">
          <div className="detail-eyebrow-row">
            <p className="eyebrow eyebrow-ink">{t('bookFromFayoum')}</p>
            <span className={`request-status status-${listing.status}`}>{formatStatus(listing.status, t)}</span>
          </div>
          <h1>{listing.title}</h1>
          <p className="detail-byline">{listing.author || t('unknown')} <span>·</span> {formatCondition(listing.condition, t)}</p>
          <p className="detail-description">{listing.description || t('shelfCopy')}</p>
          <div className="detail-price-line">
            <strong>{listing.price_egp != null ? `${listing.price_egp} ${t('currencyCode')}` : listing.listing_type === 'free' ? t('priceFree') : t('openExchange')}</strong>
            {listing.price_egp != null ? <span>{t('priceSetByOwner')}</span> : null}
          </div>
          <div className="detail-facts">
            <div><MapPin size={18} /><span><small>{t('area')}</small><strong>{listing.area}</strong></span></div>
            <div><ShieldCheck size={18} /><span><small>{t('handover')}</small><strong>{formatMeetup(listing.meetup_preference, t)}</strong></span></div>
            <div><Tag size={18} /><span><small>{t('condition')}</small><strong>{formatCondition(listing.condition, t)}</strong></span></div>
          </div>

          {requestSent ? (
            <Alert variant="success" title={t('requestSentTitle')}>{t('requestSent')}</Alert>
          ) : isAvailable && !isOwner ? (
            <>
              <label className="message-label" htmlFor="request-note">{t('addNote')} <span className="optional-label">{t('optional')}</span></label>
              <textarea id="request-note" value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t('notePlaceholder')} rows={3} maxLength={messageLimit} aria-describedby="request-note-count" />
              <span id="request-note-count" className="char-count">{messageLimit - message.length} {t('charactersLeft')}</span>
            </>
          ) : null}

          {requestError ? <Alert className="detail-alert" onDismiss={() => setRequestError('')} dismissLabel={t('dismiss')}>{requestError}</Alert> : null}

          {requestSent ? null : (
            <Button className="request-cta" loading={submitting} disabled={!isAvailable || isOwner} onClick={requestBook}>
              <span>{ctaLabel}</span>
              {submitting ? null : <ArrowUpRight size={18} className="flip-rtl" />}
            </Button>
          )}
          <p className="detail-footnote">{t('detailSafety')}</p>
          {isOwner ? null : (
            <button type="button" className="report-link" onClick={() => (session ? setReportOpen(true) : requireSignIn('signInBeforeReport'))}>
              <Flag size={14} aria-hidden="true" /> {t('reportListing')}
            </button>
          )}
        </section>
      </div>
      {session ? <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} listingId={listing.id} token={session.access_token} /> : null}
    </main>
  );
}

const reportReasons: Array<{ value: string; label: MessageKey }> = [
  { value: 'inappropriate', label: 'reasonInappropriate' },
  { value: 'misleading', label: 'reasonMisleading' },
  { value: 'spam_or_scam', label: 'reasonSpam' },
  { value: 'personal_info', label: 'reasonPersonalInfo' },
  { value: 'other', label: 'reasonOther' },
];

function ReportDialog({ open, onClose, listingId, token }: { open: boolean; onClose: () => void; listingId: string; token: string }) {
  const { t } = useLanguage();
  const toast = useToast();
  const [reason, setReason] = useState(reportReasons[0].value);
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const close = () => {
    if (sending) return;
    setError('');
    onClose();
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      await api.reportListing(token, listingId, reason, details.trim() || null);
      toast.success(t('reportSent'));
      setDetails('');
      onClose();
    } catch (reason) {
      setError(describeError(reason, t, 'reportFailed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} title={t('reportListing')} description={t('reportCopy')} icon={<Flag size={20} />} tone="danger" closeLabel={t('dismiss')}>
      <form className="dialog-form" onSubmit={submit} id="report-form">
        <fieldset>
          <legend>{t('reportReason')}</legend>
          {reportReasons.map((item) => (
            <label key={item.value} className="radio-option">
              <input type="radio" name="report-reason" value={item.value} checked={reason === item.value} onChange={() => setReason(item.value)} />
              <span>{t(item.label)}</span>
            </label>
          ))}
        </fieldset>
        <label className="form-field">
          <span>{t('reportDetails')} <span className="optional-label">{t('optional')}</span></span>
          <textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={3} maxLength={1000} placeholder={t('reportDetailsPlaceholder')} />
        </label>
        {error ? <Alert title={t('reportFailed')}>{error}</Alert> : null}
        <div className="ui-dialog-footer">
          <Button variant="outline" onClick={close} disabled={sending}>{t('cancel')}</Button>
          <Button type="submit" variant="destructive" loading={sending}>{t('sendReport')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function DetailSkeleton({ label }: { label: string }) {
  return (
    <main className="detail-page" aria-busy="true" aria-label={label}>
      <div className="skeleton skeleton-line" style={{ width: 130 }} />
      <div className="detail-layout">
        <div className="skeleton detail-photo-wrap" />
        <div className="detail-content">
          <div className="skeleton skeleton-line" style={{ width: '35%' }} />
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-line" style={{ width: '45%' }} />
          <div className="skeleton skeleton-block" />
          <div className="skeleton skeleton-button" />
        </div>
      </div>
    </main>
  );
}
