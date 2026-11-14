import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Ban, BookX, Camera, ChevronRight, EyeOff, Flag, HandHeart, Handshake, Info, Lock, MapPin, MoreHorizontal, Navigation, Send, ShieldAlert, ShieldCheck, Sun, UserX } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { Listing } from '../types';
import { formatCondition, formatMeetup, useLanguage } from '../i18n';
import type { MessageKey } from '../i18n';
import { describeError, isNotFound } from '../errors';
import { listingImage, timeAgo } from '../lib/listing';
import { Alert } from '../components/ui/alert';
import { Button, buttonClass } from '../components/ui/button';
import { Dialog, dialogFooter } from '../components/ui/dialog';
import { EmptyState } from '../components/ui/empty-state';
import { useToast } from '../components/ui/toast';
import { BookCover, StatusPill, TypeTag, coverSkeleton } from '../components/book';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';

const messageLimit = 500;
const detailGrid = 'grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-10';
const stageCol = 'flex flex-col gap-4 lg:sticky lg:top-[calc(var(--topbar-h)+24px)] lg:col-span-5';
const infoCol = 'flex min-w-0 flex-col gap-6 lg:col-span-7';
const factLabel = 'text-label-sm font-medium uppercase tracking-wider text-ink-3 ar:normal-case ar:tracking-normal';
const coverOnStage = 'relative z-10 max-w-[260px] sm:max-w-[300px] lg:max-w-[320px]';

/** The seller's real photos (seed placeholders filtered out, as in `listingImage`). */
function listingPhotos(listing: Listing) {
  return (listing.images ?? []).filter((image) => listingImage({ images: [image] }));
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className={factLabel}>{label}</dt>
      <dd className="flex min-w-0 items-center gap-1.5 text-label-lg font-semibold text-ink [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/** The cover standing on a dark shelf ledge, on a sunken tray. */
function CoverStage({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-card bg-sunk px-6 pt-8 shadow-card">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-glaze/5 via-transparent to-sunk-3/60" aria-hidden="true" />
      {children}
      <div className="relative z-20 w-full" aria-hidden="true">
        <div className="h-1.5 w-full rounded-full bg-ledge shadow-[0_8px_16px_-4px_rgb(19_28_42/.18)]" />
        <div className="h-2 w-full bg-gradient-to-b from-black/10 to-transparent" />
      </div>
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
  const [photoIndex, setPhotoIndex] = useState(0);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    setPhotoIndex(0);
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
  const photos = listingPhotos(listing);
  const photo = photos[Math.min(photoIndex, photos.length - 1)] ?? null;
  const listedAgo = timeAgo(listing.created_at, language);

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
    ? (
      <span className="flex items-baseline gap-1">
        <span className="font-book text-headline-lg font-bold tracking-tight text-ink">{listing.price_egp}</span>
        <span className="text-label-lg font-semibold text-ink-2">{t('egpSuffix')}</span>
      </span>
    )
    : <span className="font-book text-headline-sm font-semibold text-ink">{listing.listing_type === 'free' ? t('priceFree') : t('openExchange')}</span>;

  return (
    <div className={cn(ui.wrap, ui.page)}>
      <nav aria-label={t('detailBreadcrumb')} className="mb-4 md:mb-6">
        <ol className="flex min-w-0 items-center gap-1.5 text-label-md font-semibold text-ink-2">
          <li className="shrink-0"><Link className="inline-flex min-h-11 items-center hover:text-glaze-deep" to={{ pathname: '/', hash: '#books' }}>{t('browseBooks')}</Link></li>
          <li className="shrink-0 text-line-strong" aria-hidden="true"><ChevronRight size={14} className={ui.flipRtl} /></li>
          <li className="min-w-0 truncate text-ink" aria-current="page">{listing.title}</li>
        </ol>
      </nav>

      <article className={detailGrid}>
        <div className={stageCol}>
          <CoverStage>
            <BookCover listing={listing} photo={photo} size="lg" className={coverOnStage} alt={`${t('coverAlt')}: ${listing.title}`} />
          </CoverStage>

          {photos.length > 1 ? (
            <ul className="grid grid-cols-4 gap-2" aria-label={t('detailPhotos')}>
              {photos.map((image, index) => (
                <li key={image}>
                  <button
                    type="button"
                    className={cn(
                      'block aspect-square w-full overflow-hidden rounded-xl bg-sunk-3 shadow-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glaze',
                      image === photo ? 'ring-2 ring-glaze' : 'hover:ring-1 hover:ring-line-strong',
                    )}
                    aria-pressed={image === photo}
                    aria-label={`${t('detailPhotoN')} ${index + 1}`}
                    onClick={() => setPhotoIndex(index)}
                  >
                    <img className="h-full w-full object-cover" src={image} alt="" loading="lazy" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {photo ? (
            <div className={cn(ui.card, 'flex items-start gap-3 rounded-xl p-4')}>
              <Camera size={20} className="mt-0.5 shrink-0 text-glaze" aria-hidden="true" />
              <div className="grid gap-0.5">
                <p className="text-label-md font-semibold text-ink">{t('detailPhotoTitle')}</p>
                <p className="text-body-sm text-ink-2">{t('detailPhotoCopy')}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className={infoCol}>
          <div className="flex flex-wrap items-center gap-3">
            <TypeTag type={listing.listing_type} className="px-3 py-1 font-bold" />
            {isAvailable ? null : <StatusPill status={listing.status} />}
            {price}
          </div>

          <div className="grid gap-1.5">
            <h1 className="font-book text-display-lg-mobile font-bold text-ink [overflow-wrap:anywhere] md:text-display-lg ar:leading-[1.4] ar:tracking-normal">{listing.title}</h1>
            <p className="font-book text-headline-sm text-ink-2">
              {listing.author ? <>{t('detailBy')} <span className="font-semibold text-ink">{listing.author}</span></> : t('unknown')}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-4 rounded-xl bg-sunk p-4 sm:grid-cols-3">
            <Fact label={t('condition')}>
              <span className="h-2 w-2 shrink-0 rounded-full bg-glaze" aria-hidden="true" />
              {formatCondition(listing.condition, t)}
            </Fact>
            <Fact label={t('area')}>
              <MapPin size={16} className="shrink-0 text-glaze" aria-hidden="true" />
              {listing.area}
            </Fact>
            <Fact label={t('detailListed')}>{listedAgo}</Fact>
          </dl>

          <section className="grid gap-4 rounded-card bg-glaze-soft/70 p-5 shadow-card sm:p-6" aria-labelledby="handover-heading">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Handshake size={22} className="shrink-0 text-glaze" aria-hidden="true" />
                <h2 id="handover-heading" className="text-title-lg font-semibold text-ink">{t('detailHandoverTitle')}</h2>
              </div>
              <span className="rounded-full bg-surface px-2.5 py-1 text-label-sm font-semibold text-glaze-deep shadow-sm">{formatMeetup(listing.meetup_preference, t)}</span>
            </div>
            <ul className="grid gap-2 text-body-md text-ink">
              <li className="flex items-start gap-3">
                <Navigation size={18} className="mt-0.5 shrink-0 text-glaze-deep" aria-hidden="true" />
                <p><strong className="font-semibold">{t('detailHandoverMethod')}</strong> {formatMeetup(listing.meetup_preference, t)}</p>
              </li>
              <li className="flex items-start gap-3">
                <Ban size={18} className="mt-0.5 shrink-0 text-glaze-deep" aria-hidden="true" />
                <p className="text-ink-2">{t('detailNoDeliveryShort')}</p>
              </li>
            </ul>
            <p className="flex items-center gap-3 rounded-lg bg-surface/80 p-3 text-label-md font-medium text-ink-2">
              <Sun size={18} className="shrink-0 text-ochre" aria-hidden="true" />
              {t('detailDaylight')}
            </p>
          </section>

          {listing.description ? (
            <section className="grid gap-2" aria-labelledby="notes-heading">
              <h2 id="notes-heading" className="text-title-lg font-semibold text-ink">{t('detailOwnerNotes')}</h2>
              <p className={cn(ui.card, 'whitespace-pre-line p-5 text-body-lg leading-relaxed [overflow-wrap:anywhere] sm:p-6')}>{listing.description}</p>
            </section>
          ) : null}

          <section className="grid gap-4 rounded-card bg-sunk p-5 shadow-card sm:p-6" aria-label={`${t('listedBy')} ${listing.seller_name}`}>
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-glaze font-book text-headline-sm font-semibold text-on-glaze" aria-hidden="true">
                {listing.seller_name.trim().charAt(0).toUpperCase() || '?'}
              </span>
              <div className="grid min-w-0">
                <span className="text-label-sm font-medium text-ink-3">{t('listedBy')}</span>
                <span className="text-title-lg font-bold text-ink [overflow-wrap:anywhere]">{listing.seller_name}</span>
              </div>
            </div>
            <p className="flex items-start gap-2 rounded-lg bg-sunk-3/60 px-4 py-2 text-label-sm font-medium text-ink-2">
              <Lock size={14} className="mt-px shrink-0 text-ink-3" aria-hidden="true" />
              {t('detailPrivacy')}
            </p>
          </section>

          <section className="grid gap-4 rounded-card bg-surface p-5 shadow-deck sm:p-6" aria-labelledby="request-heading">
            <div className="flex items-center gap-2">
              <HandHeart size={24} className="shrink-0 text-glaze-deep" aria-hidden="true" />
              <h2 id="request-heading" className="text-title-lg font-bold text-ink [overflow-wrap:anywhere]">
                {isOwner ? t('yourListing') : `${t('detailRequestFrom')} ${listing.seller_name}`}
              </h2>
            </div>
            {requestSent ? (
              <div className="grid justify-items-start gap-2.5" role="status">
                <h3 className="font-book text-headline-sm font-semibold text-glaze-deep">{t('requestSentTitle')}</h3>
                <p className="text-ink-2">{t('requestNextCopy')}</p>
                <Link className={buttonClass({ variant: 'secondary' })} to="/account/requests">{t('viewMyRequests')}</Link>
              </div>
            ) : !isAvailable ? (
              <Button block size="lg" className="rounded-xl" disabled>{t('notAvailable')}</Button>
            ) : isOwner ? (
              <Link className={cn(buttonClass({ variant: 'secondary', block: true }), 'rounded-xl')} to={`/account/books/${listing.id}/edit`}>{t('editListing')}</Link>
            ) : (
              <form onSubmit={requestBook} className={ui.stack}>
                {session ? (
                  <div className={ui.field}>
                    <label className="text-label-md font-medium text-ink-2" htmlFor="request-note">{t('addNote')} <span className={ui.optional}>{t('optional')}</span></label>
                    <textarea id="request-note" className={cn(ui.control, ui.textarea, 'resize-none')} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t('notePlaceholder')} rows={3} maxLength={messageLimit} aria-describedby="request-note-count" />
                    <span id="request-note-count" className={ui.hint}>{messageLimit - message.length} {t('charactersLeft')}</span>
                  </div>
                ) : null}
                {requestError ? <Alert onDismiss={() => setRequestError('')} dismissLabel={t('dismiss')}>{requestError}</Alert> : null}
                <Button type="submit" block size="lg" className="rounded-xl shadow-card" loading={submitting} disabled={!canRequest}>
                  {submitting ? null : <Send size={18} className={ui.flipRtl} aria-hidden="true" />}
                  {submitting ? t('sending') : session ? t('requestBook') : t('signInToRequest')}
                </Button>
              </form>
            )}
            <p className="flex gap-2.5 text-label-sm font-medium text-ink-2"><ShieldCheck className="mt-px shrink-0 text-glaze" size={18} aria-hidden="true" />{t('detailSafety')}</p>
          </section>

          {listing.listing_type === 'sale' ? <p className="px-1 text-label-sm text-ink-3">{t('priceNote')}</p> : null}

          {isOwner ? null : (
            <div className="flex items-center border-t border-line-strong/30 pt-2">
              <Button variant="link" size="sm" className="gap-1.5 text-ink-2 hover:text-pom" onClick={() => (session ? setReportOpen(true) : requireSignIn('signInBeforeReport'))}>
                <Flag size={16} aria-hidden="true" /> {t('reportListing')}
              </Button>
            </div>
          )}
        </div>
      </article>
      {session ? <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} listingId={listing.id} token={session.access_token} /> : null}
    </div>
  );
}

const reportReasons: Array<{ value: string; label: MessageKey; icon: typeof Info }> = [
  { value: 'inappropriate', label: 'reasonInappropriate', icon: EyeOff },
  { value: 'misleading', label: 'reasonMisleading', icon: Info },
  { value: 'spam_or_scam', label: 'reasonSpam', icon: ShieldAlert },
  { value: 'personal_info', label: 'reasonPersonalInfo', icon: UserX },
  { value: 'other', label: 'reasonOther', icon: MoreHorizontal },
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
        <fieldset className="grid gap-2">
          <legend className={cn(ui.label, 'mb-2')}>{t('reportReason')}</legend>
          {reportReasons.map(({ value, label, icon: Icon }) => (
            <label
              key={value}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl bg-sunk px-4 py-2.5 text-body-lg font-medium text-ink transition-colors hover:bg-sunk-2 has-[:checked]:bg-glaze-soft/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-glaze"
            >
              <Icon size={20} className="shrink-0 text-ink-2" aria-hidden="true" />
              <span className="flex-1">{t(label)}</span>
              <input className="h-5 w-5 shrink-0 accent-glaze" type="radio" name="report-reason" value={value} checked={reason === value} onChange={() => setReason(value)} />
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
      <span className={cn(ui.skeleton, 'mb-6 mt-3 h-3.5 w-[45%]')} />
      <div className={detailGrid}>
        <div className={stageCol}>
          <CoverStage><span className={cn(coverSkeleton('lg'), coverOnStage)} /></CoverStage>
        </div>
        <div className={infoCol}>
          <span className={cn(ui.skeleton, 'h-8 w-40')} />
          <span className={cn(ui.skeleton, 'h-12 w-3/4')} />
          <span className={cn(ui.skeleton, 'h-6 w-1/2')} />
          <span className={cn(ui.skeleton, 'h-20 rounded-xl')} />
          <span className={cn(ui.skeleton, 'h-40 rounded-card')} />
        </div>
      </div>
    </div>
  );
}
