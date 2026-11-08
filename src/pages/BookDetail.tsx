import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BookX, Flag, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { Listing } from '../types';
import { formatCondition, formatMeetup, useLanguage } from '../i18n';
import type { MessageKey } from '../i18n';
import { describeError, isNotFound } from '../errors';
import { timeAgo } from '../lib/listing';
import { Alert } from '../components/ui/alert';
import { Button, buttonClass } from '../components/ui/button';
import { Dialog, dialogFooter } from '../components/ui/dialog';
import { EmptyState } from '../components/ui/empty-state';
import { useToast } from '../components/ui/toast';
import { BookCover, StatusPill, TypeTag, coverSkeleton } from '../components/book';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';

const messageLimit = 500;
const detailGrid = 'grid gap-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-16';

function Fact({ label, value, divided = false }: { label: string; value: string; divided?: boolean }) {
  return (
    <div className={cn('min-w-0 py-3.5', divided && 'ms-3.5 border-s border-line ps-3.5')}>
      <dt className="text-13 text-ink-3">{label}</dt>
      <dd className="font-semibold [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

export default function BookDetail() {
  const { listingId = '' } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { t, language } = useLanguage();
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
      <div className={cn(ui.wrap, ui.page)}>
        <Alert title={t('loadDetailError')} onRetry={load} retryLabel={t('tryAgain')}>{loadError.message}</Alert>
      </div>
    );
  }
  if (!listing) {
    return (
      <div className={cn(ui.wrap, ui.page)}>
        <EmptyState size="large" headingLevel="h1" icon={<BookX size={28} />} title={t('pageTurned')} description={t('bookNotFound')} action={<Link className={buttonClass()} to="/">{t('browseBooks')}</Link>} />
      </div>
    );
  }

  const isOwner = session?.user.id === listing.seller_id;
  const isAvailable = listing.status === 'active';
  const canRequest = isAvailable && !isOwner;

  const requireSignIn = (key: MessageKey) => {
    toast.info(t(key));
    navigate('/signin', { state: { from: `/books/${listing.id}` } });
  };

  const requestBook = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      setRequestError(describeError(reason, t, 'requestError'));
    } finally {
      setSubmitting(false);
    }
  };

  const price = listing.listing_type === 'sale' && listing.price_egp != null
    ? <><span className="text-4xl">{listing.price_egp}</span> <span className="font-ui text-base font-medium text-ink-2">{t('egpSuffix')}</span></>
    : listing.listing_type === 'free' ? t('priceFree') : t('openExchange');

  return (
    <div className={cn(ui.wrap, ui.page)}>
      <Link className={ui.backLink} to={{ pathname: '/', hash: '#books' }}><ArrowLeft size={18} className={ui.flipRtl} aria-hidden="true" />{t('browseBooks')}</Link>

      <article className={detailGrid}>
        <div className="lg:sticky lg:top-[calc(var(--topbar-h)+24px)]">
          <BookCover listing={listing} size="lg" alt={`${t('coverAlt')}: ${listing.title}`} />
        </div>

        <div className="max-w-[600px]">
          <div className="mb-3 flex items-center gap-3">
            <TypeTag type={listing.listing_type} />
            {isAvailable ? null : <StatusPill status={listing.status} />}
          </div>
          <h1 className="font-book text-[clamp(1.75rem,4.5vw,2.625rem)] font-semibold leading-[1.12] tracking-[-0.015em] ar:leading-[1.4] ar:tracking-normal">{listing.title}</h1>
          <p className="mt-1.5 text-17 text-ink-2">{listing.author || t('unknown')}</p>

          <p className="mt-5 font-book text-28 font-semibold leading-[1.2]">{price}</p>
          {listing.listing_type === 'sale' ? <p className={ui.fine}>{t('priceNote')}</p> : null}

          <dl className="my-6 grid grid-cols-3 border-y border-line">
            <Fact label={t('condition')} value={formatCondition(listing.condition, t)} />
            <Fact label={t('area')} value={listing.area} divided />
            <Fact label={t('handover')} value={formatMeetup(listing.meetup_preference, t)} divided />
          </dl>

          {listing.description ? <p className="mb-3.5 max-w-[62ch] whitespace-pre-line font-book text-17 leading-[1.7]">{listing.description}</p> : null}
          <p className={ui.fine}>{t('listedBy')} {listing.seller_name}, {timeAgo(listing.created_at, language)}</p>

          <section className="mt-7 grid gap-4 rounded-[14px] border border-line bg-surface p-5" aria-labelledby="request-heading">
            <h2 id="request-heading" className="sr-only">{t('requestBook')}</h2>
            {requestSent ? (
              <div className="grid justify-items-start gap-2.5" role="status">
                <h3 className="font-book text-xl font-semibold text-glaze">{t('requestSentTitle')}</h3>
                <p className="text-ink-2">{t('requestNextCopy')}</p>
                <Link className={buttonClass({ variant: 'secondary' })} to="/account/requests">{t('viewMyRequests')}</Link>
              </div>
            ) : !isAvailable ? (
              <Button block size="lg" disabled>{t('notAvailable')}</Button>
            ) : isOwner ? (
              <Link className={buttonClass({ variant: 'secondary', block: true })} to={`/account/books/${listing.id}/edit`}>{t('editListing')}</Link>
            ) : (
              <form onSubmit={requestBook} className={ui.stack}>
                {session ? (
                  <div className={ui.field}>
                    <label className={ui.label} htmlFor="request-note">{t('addNote')} <span className={ui.optional}>{t('optional')}</span></label>
                    <textarea id="request-note" className={cn(ui.control, ui.textarea)} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t('notePlaceholder')} rows={3} maxLength={messageLimit} aria-describedby="request-note-count" />
                    <span id="request-note-count" className={ui.hint}>{messageLimit - message.length} {t('charactersLeft')}</span>
                  </div>
                ) : null}
                {requestError ? <Alert onDismiss={() => setRequestError('')} dismissLabel={t('dismiss')}>{requestError}</Alert> : null}
                <Button type="submit" block size="lg" loading={submitting} disabled={!canRequest}>
                  {submitting ? t('sending') : session ? t('requestBook') : t('signInToRequest')}
                </Button>
              </form>
            )}
            <p className="flex gap-2.5 text-13 text-ink-2"><ShieldCheck className="mt-px shrink-0 text-glaze" size={18} aria-hidden="true" />{t('detailSafety')}</p>
          </section>

          {isOwner ? null : (
            <Button variant="link" size="sm" className="mt-3" onClick={() => (session ? setReportOpen(true) : requireSignIn('signInBeforeReport'))}>
              <Flag size={14} aria-hidden="true" /> {t('reportListing')}
            </Button>
          )}
        </div>
      </article>
      {session ? <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} listingId={listing.id} token={session.access_token} /> : null}
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
    } catch (failure) {
      setError(describeError(failure, t, 'reportFailed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} title={t('reportListing')} description={t('reportCopy')} icon={<Flag size={20} />} tone="danger" closeLabel={t('dismiss')}>
      <form className={ui.stack} onSubmit={submit}>
        <fieldset className="grid gap-0.5">
          <legend className={ui.label}>{t('reportReason')}</legend>
          {reportReasons.map((item) => (
            <label key={item.value} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 hover:bg-sunk">
              <input className="m-[3px_3px_0_5px] h-[18px] w-[18px] accent-glaze" type="radio" name="report-reason" value={item.value} checked={reason === item.value} onChange={() => setReason(item.value)} />
              <span>{t(item.label)}</span>
            </label>
          ))}
        </fieldset>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="report-details">{t('reportDetails')} <span className={ui.optional}>{t('optional')}</span></label>
          <textarea id="report-details" className={cn(ui.control, ui.textarea)} value={details} onChange={(event) => setDetails(event.target.value)} rows={3} maxLength={1000} placeholder={t('reportDetailsPlaceholder')} />
        </div>
        {error ? <Alert title={t('reportFailed')}>{error}</Alert> : null}
        <div className={dialogFooter}>
          <Button variant="secondary" onClick={close} disabled={sending}>{t('cancel')}</Button>
          <Button type="submit" variant="danger" loading={sending}>{t('sendReport')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function DetailSkeleton({ label }: { label: string }) {
  return (
    <div className={cn(ui.wrap, ui.page)} aria-busy="true" aria-label={label}>
      <span className={cn(ui.skeleton, 'mt-2 h-3.5 w-[45%]')} />
      <div className={detailGrid}>
        <div><span className={coverSkeleton('lg')} /></div>
        <div className="max-w-[600px]">
          <span className={cn(ui.skeleton, 'mt-2 h-3.5 w-[45%]')} />
          <span className={cn(ui.skeleton, 'mt-3 h-10 w-3/4')} />
          <span className={cn(ui.skeleton, 'mt-2 h-3.5 w-4/5')} />
          <span className={cn(ui.skeleton, 'mt-5 h-60')} />
        </div>
      </div>
    </div>
  );
}
