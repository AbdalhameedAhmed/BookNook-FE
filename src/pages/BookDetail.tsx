import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BookX, ChevronRight, Flag, Handshake, MapPin, ShieldCheck, Tag } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { Listing } from '../types';
import { formatCondition, formatMeetup, formatStatus, useLanguage } from '../i18n';
import type { MessageKey } from '../i18n';
import { describeError, isNotFound } from '../errors';
import { coverFor, listingTypeLabel } from '../lib/listing';
import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button, buttonVariants } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { EmptyState } from '../components/ui/empty-state';
import { useToast } from '../components/ui/toast';

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
      <div className="container page">
        <Alert title={t('loadDetailError')} onRetry={load} retryLabel={t('tryAgain')}>{loadError.message}</Alert>
      </div>
    );
  }
  if (!listing) {
    return (
      <div className="container page">
        <EmptyState size="large" headingLevel="h1" icon={<BookX size={28} />} title={t('pageTurned')} description={t('bookNotFound')} action={<Link className={buttonVariants()} to="/">{t('backShelf')}</Link>} />
      </div>
    );
  }

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
  const price = listing.price_egp != null ? `${listing.price_egp} ${t('currencyCode')}` : listing.listing_type === 'free' ? t('priceFree') : t('openExchange');

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to={{ pathname: '/', hash: '#listings' }}>{t('explore')}</Link>
        <ChevronRight size={14} className="flip-rtl" aria-hidden="true" />
        <span aria-current="page">{listing.title}</span>
      </nav>

      <div className="detail-grid">
        <div className="detail-media">
          <img src={coverFor(listing)} alt={`${t('coverAlt')}: ${listing.title}`} />
        </div>

        <div className="detail-info">
          <div className="detail-badges">
            <Badge variant={listing.listing_type}>{listingTypeLabel(listing.listing_type, t)}</Badge>
            <span className={`status-pill status-${listing.status}`}>{formatStatus(listing.status, t)}</span>
          </div>
          <h1 className="detail-title">{listing.title}</h1>
          <p className="detail-author">{listing.author || t('unknown')}</p>
          <p className="detail-description">{listing.description || t('shelfCopy')}</p>

          <section className="panel detail-panel" aria-label={t('requestBook')}>
            <div className="detail-price">
              <strong>{price}</strong>
              {listing.price_egp != null ? <span>{t('priceSetByOwner')}</span> : null}
            </div>
            <dl className="detail-facts">
              <Fact icon={<MapPin size={18} />} label={t('area')} value={listing.area} />
              <Fact icon={<Handshake size={18} />} label={t('handover')} value={formatMeetup(listing.meetup_preference, t)} />
              <Fact icon={<Tag size={18} />} label={t('condition')} value={formatCondition(listing.condition, t)} />
            </dl>

            <div className="detail-request">
              {requestSent ? (
                <Alert variant="success" title={t('requestSentTitle')}>{t('requestSent')}</Alert>
              ) : isAvailable && !isOwner ? (
                <div className="field">
                  <label className="field-label" htmlFor="request-note">{t('addNote')} <span className="optional-label">{t('optional')}</span></label>
                  <textarea id="request-note" className="control" value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t('notePlaceholder')} rows={3} maxLength={messageLimit} aria-describedby="request-note-count" />
                  <span id="request-note-count" className="char-count">{messageLimit - message.length} {t('charactersLeft')}</span>
                </div>
              ) : null}

              {requestError ? <Alert onDismiss={() => setRequestError('')} dismissLabel={t('dismiss')}>{requestError}</Alert> : null}

              {requestSent ? null : (
                <Button size="lg" className="w-full" loading={submitting} disabled={!isAvailable || isOwner} onClick={requestBook}>
                  {ctaLabel}
                  {submitting ? null : <ArrowRight size={18} className="flip-rtl" />}
                </Button>
              )}
            </div>

            <div className="safety-note">
              <ShieldCheck size={18} aria-hidden="true" />
              <p>{t('detailSafety')}</p>
            </div>
          </section>

          {isOwner ? null : (
            <Button variant="link" size="sm" className="report-link" onClick={() => (session ? setReportOpen(true) : requireSignIn('signInBeforeReport'))}>
              <Flag size={14} aria-hidden="true" /> {t('reportListing')}
            </Button>
          )}
        </div>
      </div>
      {session ? <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} listingId={listing.id} token={session.access_token} /> : null}
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="fact">
      <span className="fact-icon" aria-hidden="true">{icon}</span>
      <div><dt>{label}</dt><dd>{value}</dd></div>
    </div>
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
      <form className="dialog-form" onSubmit={submit}>
        <fieldset>
          <legend className="field-label">{t('reportReason')}</legend>
          {reportReasons.map((item) => (
            <label key={item.value} className="radio-option">
              <input type="radio" name="report-reason" value={item.value} checked={reason === item.value} onChange={() => setReason(item.value)} />
              <span>{t(item.label)}</span>
            </label>
          ))}
        </fieldset>
        <div className="field">
          <label className="field-label" htmlFor="report-details">{t('reportDetails')} <span className="optional-label">{t('optional')}</span></label>
          <textarea id="report-details" className="control" value={details} onChange={(event) => setDetails(event.target.value)} rows={3} maxLength={1000} placeholder={t('reportDetailsPlaceholder')} />
        </div>
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
    <div className="container page" aria-busy="true" aria-label={label}>
      <div className="skeleton sk-line" style={{ width: 160 }} />
      <div className="detail-grid">
        <div className="skeleton detail-media" />
        <div className="detail-info">
          <div className="skeleton sk-line" style={{ width: 120 }} />
          <div className="skeleton sk-title" />
          <div className="skeleton sk-line" style={{ width: '40%' }} />
          <div className="skeleton sk-block" />
        </div>
      </div>
    </div>
  );
}
