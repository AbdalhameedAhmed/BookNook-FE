import { useCallback, useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, Clock3, Handshake, Inbox, LayoutDashboard, LogOut, Plus, X } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { BookRequest, Listing, ListingPayload, Transaction } from '../types';
import { supabase } from '../supabase';
import { formatCondition, formatMeetup, formatStatus, useLanguage } from '../i18n';
import type { MessageKey } from '../i18n';
import { describeError } from '../errors';
import { listingImage, priceLabel } from '../lib/listing';
import { Alert, FieldError } from '../components/ui/alert';
import { Button, buttonVariants } from '../components/ui/button';
import { useConfirm } from '../components/ui/dialog';
import { EmptyState } from '../components/ui/empty-state';
import { useToast } from '../components/ui/toast';

const maxImageBytes = 2 * 1024 * 1024;
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

export function AccountLayout() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const displayName = session?.user.user_metadata?.display_name || session?.user.email?.split('@')[0] || 'Reader';
  const navItems = [
    { to: '/account', label: t('overview'), icon: LayoutDashboard, end: true },
    { to: '/account/books', label: t('myBooks'), icon: BookOpen },
    { to: '/account/requests', label: t('requests'), icon: Inbox },
    { to: '/account/transactions', label: t('transactions'), icon: Handshake },
  ];

  const signOut = async () => {
    const confirmed = await confirm({ title: t('confirmSignOutTitle'), description: t('confirmSignOutCopy'), confirmLabel: t('signOut'), cancelLabel: t('cancel') });
    if (!confirmed) return;
    const result = await supabase?.auth.signOut();
    if (result?.error) {
      toast.error(t('somethingWrong'), describeError(result.error, t, 'somethingWrong'));
      return;
    }
    toast.success(t('signedOutToast'));
    navigate('/', { replace: true });
  };

  return (
    <div className="container page">
      <header className="account-header">
        <div className="account-identity">
          <span className="avatar avatar-lg" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span>
          <div>
            <h1 className="page-title">{t('welcomeName')} {displayName}</h1>
            <p className="page-subtitle">{t('accountSubtitle')}</p>
          </div>
        </div>
        <div className="account-header-actions">
          <Link className={buttonVariants()} to="/account/books?new=1"><Plus size={16} />{t('listBook')}</Link>
          <Button variant="outline" onClick={() => void signOut()}><LogOut size={16} className="flip-rtl" />{t('signOut')}</Button>
        </div>
      </header>
      <nav className="tabs" aria-label={t('accountSections')}>
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? 'tab is-active' : 'tab'}>
            <Icon size={16} aria-hidden="true" /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="account-body"><Outlet /></div>
    </div>
  );
}

export function AccountOverview() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const [listings, setListings] = useState<Listing[]>([]);
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    let active = true;
    const token = session?.access_token;
    if (!token) return () => { active = false; };
    setLoading(true);
    setError('');
    Promise.all([api.myListings(token), api.activity(token)])
      .then(([myListings, activity]) => {
        if (!active) return;
        setListings(myListings);
        setRequests(activity.requests);
        setTransactions(activity.transactions);
      })
      .catch((reason) => { if (active) setError(describeError(reason, t, 'listingError')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session?.access_token, t]);

  useEffect(() => load(), [load]);

  const count = (value: number) => (loading ? '—' : String(value));

  return (
    <>
      {error ? <Alert className="page-alert" title={t('listingError')} onRetry={load} retryLabel={t('tryAgain')}>{error}</Alert> : null}
      <section className="stats" aria-label={t('overview')}>
        <StatCard tone="primary" icon={<BookOpen size={20} />} label={t('activeBooks')} value={count(listings.filter((listing) => listing.status === 'active').length)} note={t('activeBooksNote')} />
        <StatCard tone="warning" icon={<Clock3 size={20} />} label={t('waitingForYou')} value={count(requests.filter((request) => request.status === 'pending').length)} note={t('pendingRequests')} />
        <StatCard tone="info" icon={<Handshake size={20} />} label={t('inProgress')} value={count(transactions.filter((item) => item.status === 'arranging').length)} note={t('meetupsArranged')} />
      </section>
      <div className="overview-grid">
        <section className="panel">
          <PanelHead title={t('yourBooks')} subtitle={t('recentlyListed')} action={<Link className="text-link" to="/account/books">{t('viewAll')} <ArrowRight size={14} className="flip-rtl" /></Link>} />
          {loading ? <RowSkeletons label={t('loadingShelf')} /> : listings.length === 0 ? (
            <EmptyState size="compact" icon={<BookOpen size={22} />} title={t('yourShelfStarts')} description={t('listReadyBook')} action={<Link className={buttonVariants({ size: 'sm' })} to="/account/books?new=1"><Plus size={16} />{t('addBook')}</Link>} />
          ) : (
            <ul className="row-list">{listings.slice(0, 4).map((listing) => (
              <li className="row" key={listing.id}>
                <BookThumb listing={listing} />
                <div className="row-main"><p className="row-title">{listing.title}</p><p className="row-meta">{listing.area} · {formatCondition(listing.condition, t)}</p></div>
                <div className="row-end"><span className="row-price">{priceLabel(listing, t)}</span><StatusPill status={listing.status} /></div>
              </li>
            ))}</ul>
          )}
        </section>
        <section className="panel">
          <PanelHead title={t('requests')} subtitle={t('littleActivity')} action={<Link className="text-link" to="/account/requests">{t('viewAll')} <ArrowRight size={14} className="flip-rtl" /></Link>} />
          {loading ? <RowSkeletons label={t('loadingRequests')} /> : requests.length === 0 ? (
            <EmptyState size="compact" icon={<Inbox size={22} />} title={t('quietNow')} description={t('newRequestsAppear')} />
          ) : (
            <ul className="row-list">{requests.slice(0, 4).map((request) => (
              <li className="row" key={request.id}>
                <span className="row-icon" aria-hidden="true">{request.seller_id === session?.user.id ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</span>
                <div className="row-main"><p className="row-title">{request.listing_title || t('requestsTitle')}</p><p className="row-meta">{request.message || t('noMessage')}</p></div>
                <StatusPill status={request.status} />
              </li>
            ))}</ul>
          )}
        </section>
      </div>
    </>
  );
}

export function MyBooksPage() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const confirm = useConfirm();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState<Listing | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try { setListings(await api.myListings(session.access_token)); setLoadError(''); }
    catch (reason) { setLoadError(describeError(reason, t, 'couldNotLoadBooks')); }
    finally { setLoading(false); }
  }, [session, t]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (searchParams.get('new') !== '1') return;
    setEditing(null);
    scrollToEditor();
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleDeactivate = async (listing: Listing) => {
    if (!session) return;
    const confirmed = await confirm({ title: t('confirmDeactivateTitle'), description: t('confirmDeactivateCopy'), confirmLabel: t('yesDeactivate'), cancelLabel: t('keepIt'), tone: 'danger' });
    if (!confirmed) return;
    setBusyId(listing.id);
    try {
      await api.deactivateListing(session.access_token, listing.id);
      setListings((current) => current.map((item) => item.id === listing.id ? { ...item, status: 'inactive' } : item));
      toast.success(t('deactivated'), listing.title);
    } catch (reason) {
      toast.error(t('couldNotDeactivate'), describeError(reason, t, 'couldNotDeactivate'));
    } finally {
      setBusyId(null);
    }
  };

  const handleComplete = async (listing: Listing) => {
    if (!session) return;
    const confirmed = await confirm({ title: t('confirmCompleteTitle'), description: t('confirmCompleteCopy'), confirmLabel: completeLabel(listing, t), cancelLabel: t('goBack') });
    if (!confirmed) return;
    setBusyId(listing.id);
    try {
      const result = await api.markListingComplete(session.access_token, listing.id);
      setListings((current) => current.map((item) => item.id === listing.id ? { ...item, status: result.status } : item));
      toast.success(t('listingMarked'), `${listing.title} · ${formatStatus(result.status, t)}`);
    } catch (reason) {
      toast.error(t('couldNotUpdate'), describeError(reason, t, 'couldNotUpdate'));
    } finally {
      setBusyId(null);
    }
  };

  // Throws on failure so the form can show the error next to the submit button.
  const handleSave = async (payload: ListingPayload) => {
    if (!session) return;
    setSaving(true);
    try {
      const photo = payload.images?.[0];
      const listingPayload = { ...payload, images: photo ? [photo] : editing?.images ?? [] };
      if (editing) await api.updateListing(session.access_token, editing.id, listingPayload);
      else await api.createListing(session.access_token, listingPayload);
      toast.success(editing ? t('listingSavedTitle') : t('bookOnShelf'), editing ? t('listingChangesSaved') : payload.title);
      setEditing(null);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (listing: Listing) => {
    setEditing(listing);
    scrollToEditor();
  };

  return (
    <div className="manage-grid">
      <section className="panel" aria-busy={loading}>
        <PanelHead title={t('listMyBooks')} subtitle={t('booksShared')} action={loading ? null : <span className="count-chip">{listings.length}</span>} />
        {loadError ? <Alert className="page-alert" title={t('couldNotLoadBooks')} onRetry={() => void refresh()} retryLabel={t('tryAgain')}>{loadError}</Alert> : null}
        {loading ? <RowSkeletons label={t('loadingShelf')} tall /> : listings.length === 0 && !loadError ? (
          <EmptyState size="compact" icon={<BookOpen size={22} />} title={t('shelfEmpty')} description={t('addBookFindReader')} />
        ) : (
          <ul className="row-list">{listings.map((listing) => (
            <li className={editing?.id === listing.id ? 'manage-row is-editing' : 'manage-row'} key={listing.id}>
              <BookThumb listing={listing} large />
              <div className="row-main">
                <div className="row-title-line"><p className="row-title">{listing.title}</p><StatusPill status={listing.status} /></div>
                <p className="row-meta">{listing.author || t('authorNotListed')} · {listing.area} · {formatCondition(listing.condition, t)}</p>
                <p className="row-price">{priceLabel(listing, t)}</p>
                <div className="row-actions">
                  <Button variant="outline" size="sm" onClick={() => startEditing(listing)} disabled={busyId === listing.id}>{t('edit')}</Button>
                  {listing.status === 'active' || listing.status === 'reserved' ? <>
                    <Button variant="outline" size="sm" onClick={() => void handleComplete(listing)} loading={busyId === listing.id}>{completeLabel(listing, t)}</Button>
                    <Button variant="destructive-outline" size="sm" onClick={() => void handleDeactivate(listing)} disabled={busyId === listing.id}>{t('deactivate')}</Button>
                  </> : null}
                </div>
              </div>
            </li>
          ))}</ul>
        )}
      </section>
      <section className="panel editor-panel" id="listing-editor">
        <PanelHead
          title={editing ? t('editListing') : t('listBook')}
          subtitle={editing ? editing.title : t('passBookAlong')}
          action={editing ? <Button variant="ghost" size="icon" onClick={() => setEditing(null)} aria-label={t('cancel')} title={t('cancel')}><X size={18} /></Button> : null}
        />
        <ListingForm
          key={editing?.id ?? 'new'}
          initial={editing}
          onSave={handleSave}
          onUpload={(file) => api.uploadListingImage(session!.access_token, file)}
          saving={saving}
        />
      </section>
    </div>
  );
}

export function RequestsPage() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const confirm = useConfirm();
  const toast = useToast();
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!session) return;
    try { setRequests((await api.activity(session.access_token)).requests); setError(''); }
    catch (reason) { setError(describeError(reason, t, 'requestFailed')); }
    finally { setLoading(false); }
  }, [session, t]);

  useEffect(() => { void reload(); }, [reload]);

  const transitions: Record<string, { title: MessageKey; copy: MessageKey; confirm: MessageKey; done: MessageKey; danger?: boolean }> = {
    accepted: { title: 'confirmAcceptTitle', copy: 'confirmAcceptCopy', confirm: 'acceptRequest', done: 'requestAccepted' },
    rejected: { title: 'confirmDeclineTitle', copy: 'confirmDeclineCopy', confirm: 'decline', done: 'requestDeclined', danger: true },
    cancelled: { title: 'confirmCancelTitle', copy: 'confirmCancelCopy', confirm: 'cancelRequest', done: 'requestCancelled', danger: true },
  };

  const update = async (request: BookRequest, status: string) => {
    if (!session) return;
    const copy = transitions[status];
    const confirmed = await confirm({ title: t(copy.title), description: t(copy.copy), confirmLabel: t(copy.confirm), cancelLabel: t('goBack'), tone: copy.danger ? 'danger' : 'default' });
    if (!confirmed) return;
    setBusyId(request.id);
    try {
      await api.updateRequest(session.access_token, request.id, status);
      toast.success(t('requestUpdated'), t(copy.done));
      await reload();
    } catch (reason) {
      toast.error(t('updateRequestFailed'), describeError(reason, t, 'updateRequestFailed'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <SectionIntro title={t('requestsTitle')} copy={t('requestIntro')} />
      {error ? <Alert className="page-alert" title={t('requestFailed')} onRetry={() => { setLoading(true); void reload(); }} retryLabel={t('tryAgain')}>{error}</Alert> : null}
      {loading ? <CardSkeletons label={t('loadingRequests')} /> : requests.length === 0 && !error ? (
        <EmptyState icon={<Inbox size={24} />} title={t('noRequests')} description={t('noRequestsCopy')} />
      ) : (
        <div className="card-grid">{requests.map((request) => {
          const incoming = request.seller_id === session?.user.id;
          const busy = busyId === request.id;
          return (
            <article className="panel request-card" key={request.id}>
              <div className="request-card-head">
                <span className={incoming ? 'direction-tag is-incoming' : 'direction-tag'}>
                  {incoming ? <ArrowDownLeft size={14} aria-hidden="true" /> : <ArrowUpRight size={14} aria-hidden="true" />}
                  {incoming ? t('forYourBook') : t('youSent')}
                </span>
                <StatusPill status={request.status} />
              </div>
              <h3 className="request-card-title"><Link to={`/books/${request.listing_id}`}>{request.listing_title || t('requestsTitle')}</Link></h3>
              <blockquote className="request-message">{request.message || t('noMessage')}</blockquote>
              <div className="request-card-foot">
                <span className="mono-id">#{request.id.slice(0, 8)}</span>
                {request.status === 'pending' ? (
                  <div className="row-actions">
                    {incoming ? <>
                      <Button size="sm" variant="destructive-outline" onClick={() => void update(request, 'rejected')} disabled={busy}>{t('decline')}</Button>
                      <Button size="sm" onClick={() => void update(request, 'accepted')} loading={busy}>{t('acceptRequest')}</Button>
                    </> : <Button size="sm" variant="outline" onClick={() => void update(request, 'cancelled')} loading={busy}>{t('cancelRequest')}</Button>}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}</div>
      )}
    </>
  );
}

export function TransactionsPage() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const confirm = useConfirm();
  const toast = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!session) return;
    try { setTransactions((await api.activity(session.access_token)).transactions); setError(''); }
    catch (reason) { setError(describeError(reason, t, 'transactionFailed')); }
    finally { setLoading(false); }
  }, [session, t]);

  useEffect(() => { void reload(); }, [reload]);

  const complete = async (transaction: Transaction) => {
    if (!session) return;
    const confirmed = await confirm({ title: t('confirmTransactionTitle'), description: t('confirmTransactionCopy'), confirmLabel: t('markComplete'), cancelLabel: t('goBack') });
    if (!confirmed) return;
    setBusyId(transaction.id);
    try {
      await api.completeTransaction(session.access_token, transaction.id);
      setTransactions((current) => current.map((item) => item.id === transaction.id ? { ...item, status: 'completed' } : item));
      toast.success(t('statusCompleted'), t('transactionCompleted'));
    } catch (reason) {
      toast.error(t('completeFailed'), describeError(reason, t, 'completeFailed'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <SectionIntro title={t('transactionsTitle')} copy={t('transactionIntro')} />
      {error ? <Alert className="page-alert" title={t('transactionFailed')} onRetry={() => { setLoading(true); void reload(); }} retryLabel={t('tryAgain')}>{error}</Alert> : null}
      {loading ? <div className="panel"><RowSkeletons label={t('loadingTransactions')} tall /></div> : transactions.length === 0 && !error ? (
        <EmptyState icon={<Handshake size={24} />} title={t('nothingMoving')} description={t('acceptedBecomeTransactions')} />
      ) : (
        <div className="panel">
          <ul className="row-list">{transactions.map((transaction) => (
            <li className="row transaction-row" key={transaction.id}>
              <span className="row-icon" aria-hidden="true"><Handshake size={18} /></span>
              <div className="row-main">
                <p className="row-title">{transaction.listing_title || t('transactionsTitle')}</p>
                <p className="row-meta">{formatMeetup(transaction.fulfillment_method, t)} · <span className="mono-id">#{transaction.id.slice(0, 8)}</span></p>
              </div>
              <div className="row-end">
                <StatusPill status={transaction.status} />
                {transaction.status === 'arranging'
                  ? <Button size="sm" onClick={() => void complete(transaction)} loading={busyId === transaction.id}>{t('markComplete')}</Button>
                  : <span className="completed-label"><CheckCircle2 size={16} aria-hidden="true" /> {t('complete')}</span>}
              </div>
            </li>
          ))}</ul>
        </div>
      )}
    </>
  );
}

type ListingField = 'title' | 'price' | 'area' | 'photo';

function ListingForm({ initial, onSave, onUpload, saving }: {
  initial: Listing | null;
  onSave: (payload: ListingPayload) => Promise<void>;
  onUpload: (file: File) => Promise<{ url: string }>;
  saving: boolean;
}) {
  const { t } = useLanguage();
  const toast = useToast();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [author, setAuthor] = useState(initial?.author ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [condition, setCondition] = useState(initial?.condition ?? 'good');
  const [listingType, setListingType] = useState<Listing['listing_type']>(initial?.listing_type ?? 'sale');
  const [price, setPrice] = useState(initial?.price_egp == null ? '' : String(initial.price_egp));
  const [area, setArea] = useState(initial?.area ?? 'Fayoum Center');
  const [meetup, setMeetup] = useState(initial?.meetup_preference ?? 'direct_meetup');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [errors, setErrors] = useState<Partial<Record<ListingField, MessageKey>>>({});
  const [formError, setFormError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(initial ? listingImage(initial) ?? '' : '');
      return;
    }
    const previewUrl = URL.createObjectURL(photo);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [initial, photo]);

  const setFieldError = (field: ListingField, key?: MessageKey) => setErrors((current) => ({ ...current, [field]: key }));

  const validate = () => {
    const next: Partial<Record<ListingField, MessageKey>> = {};
    if (!title.trim()) next.title = 'fieldRequired';
    else if (title.trim().length < 2) next.title = 'fieldTitleShort';
    if (listingType === 'sale') {
      const value = Number(price);
      if (price.trim() === '' || !Number.isInteger(value) || value < 0) next.price = 'fieldPrice';
    }
    if (!area.trim()) next.area = 'fieldRequired';
    else if (area.trim().length < 2) next.area = 'fieldAreaShort';
    if (photo && photo.size > maxImageBytes) next.photo = 'imageTooLarge';
    else if (photo && !allowedImageTypes.includes(photo.type)) next.photo = 'invalidImageType';
    return next;
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    const next = validate();
    setErrors(next);
    const firstInvalid = (['title', 'price', 'photo', 'area'] as ListingField[]).find((field) => next[field]);
    if (firstInvalid) {
      document.getElementById(`listing-${firstInvalid}`)?.focus();
      setFormError(t('fixFormErrors'));
      return;
    }

    const payload: ListingPayload = {
      title: title.trim(), author: author.trim() || null, description: description.trim() || null,
      condition, listing_type: listingType, price_egp: listingType === 'sale' ? Number(price) : null,
      area: area.trim(), meetup_preference: meetup,
    };

    let uploadedImage: string | undefined;
    if (photo) {
      setUploading(true);
      try {
        uploadedImage = (await onUpload(photo)).url;
      } catch (reason) {
        const text = describeError(reason, t, 'imageUploadFailed');
        setFormError(text);
        toast.error(t('imageUploadFailed'), text);
        return;
      } finally {
        setUploading(false);
      }
    }

    try {
      await onSave({ ...payload, images: uploadedImage ? [uploadedImage] : undefined });
    } catch (reason) {
      const text = describeError(reason, t, 'couldNotSave');
      setFormError(text);
      toast.error(t('couldNotSave'), text);
    }
  };

  const control = (field: ListingField) => ({
    id: `listing-${field}`,
    className: 'control',
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `listing-${field}-error` : undefined,
  });

  const busy = saving || uploading;

  return (
    <form className="form-stack" onSubmit={submit} noValidate>
      <div className="field">
        <label className="field-label" htmlFor="listing-title">{t('bookTitle')}</label>
        <input {...control('title')} value={title} onChange={(event) => { setTitle(event.target.value); setFieldError('title'); }} maxLength={180} />
        <FieldError id="listing-title-error">{errors.title ? t(errors.title) : null}</FieldError>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="listing-author">{t('author')} <span className="optional-label">{t('optional')}</span></label>
        <input id="listing-author" className="control" value={author} onChange={(event) => setAuthor(event.target.value)} maxLength={120} />
      </div>
      <div className="field-row">
        <div className="field">
          <label className="field-label" htmlFor="listing-condition">{t('condition')}</label>
          <select id="listing-condition" className="control" value={condition} onChange={(event) => setCondition(event.target.value)}>
            <option value="like_new">{t('likeNew')}</option><option value="good">{t('good')}</option><option value="acceptable">{t('acceptable')}</option><option value="heavily_used">{t('heavilyUsed')}</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="listing-type">{t('offer')}</label>
          <select id="listing-type" className="control" value={listingType} onChange={(event) => { setListingType(event.target.value as Listing['listing_type']); setFieldError('price'); }}>
            <option value="sale">{t('forSale')}</option><option value="exchange">{t('exchange')}</option><option value="free">{t('free')}</option>
          </select>
        </div>
      </div>
      {listingType === 'sale' ? (
        <div className="field">
          <label className="field-label" htmlFor="listing-price">{t('priceEgp')}</label>
          <input {...control('price')} type="number" inputMode="numeric" value={price} onChange={(event) => { setPrice(event.target.value); setFieldError('price'); }} min="0" step="1" />
          <FieldError id="listing-price-error">{errors.price ? t(errors.price) : null}</FieldError>
        </div>
      ) : null}
      <div className="field">
        <label className="field-label" htmlFor="listing-photo">{t('bookPhoto')} <span className="optional-label">{t('optional')}</span></label>
        <input {...control('photo')} type="file" accept={allowedImageTypes.join(',')} onChange={(event) => {
          const nextPhoto = event.target.files?.[0] ?? null;
          setFieldError('photo');
          if (nextPhoto && (nextPhoto.size > maxImageBytes || !allowedImageTypes.includes(nextPhoto.type))) {
            setPhoto(null);
            setFieldError('photo', nextPhoto.size > maxImageBytes ? 'imageTooLarge' : 'invalidImageType');
            event.target.value = '';
            return;
          }
          setPhoto(nextPhoto);
        }} />
        <span className="field-hint">{t('imageUploadLimit')}</span>
        <FieldError id="listing-photo-error">{errors.photo ? t(errors.photo) : null}</FieldError>
        {photoPreview ? <img className="photo-preview" src={photoPreview} alt={t('coverAlt')} /> : null}
      </div>
      <div className="field">
        <label className="field-label" htmlFor="listing-area">{t('approximateArea')}</label>
        <input {...control('area')} value={area} onChange={(event) => { setArea(event.target.value); setFieldError('area'); }} maxLength={100} />
        <FieldError id="listing-area-error">{errors.area ? t(errors.area) : null}</FieldError>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="listing-meetup">{t('meetupPreference')}</label>
        <select id="listing-meetup" className="control" value={meetup} onChange={(event) => setMeetup(event.target.value)}>
          <option value="direct_meetup">{t('directMeetup')}</option><option value="pickup_point">{t('pickupPoint')}</option><option value="either">{t('either')}</option>
        </select>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="listing-description">{t('aboutCopy')} <span className="optional-label">{t('optional')}</span></label>
        <textarea id="listing-description" className="control" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1500} rows={4} placeholder={t('copyPlaceholder')} />
        <span className="field-hint">{t('publicSafety')}</span>
      </div>
      {formError ? <Alert onDismiss={() => setFormError('')} dismissLabel={t('dismiss')}>{formError}</Alert> : null}
      <Button type="submit" size="lg" className="w-full" loading={busy}>{busy ? t('saving') : initial ? t('saveChanges') : t('publishShelf')}</Button>
    </form>
  );
}

function scrollToEditor() {
  document.getElementById('listing-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function completeLabel(listing: Listing, t: (key: MessageKey) => string) {
  return listing.listing_type === 'sale' ? t('markSold') : listing.listing_type === 'exchange' ? t('markExchanged') : t('markGivenAway');
}

function PanelHead({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="panel-head">
      <div><h2 className="panel-title">{title}</h2>{subtitle ? <p className="panel-subtitle">{subtitle}</p> : null}</div>
      {action}
    </div>
  );
}

function SectionIntro({ title, copy }: { title: string; copy: string }) {
  return <div className="section-intro"><h2 className="section-intro-title">{title}</h2><p>{copy}</p></div>;
}

function StatCard({ tone, icon, label, value, note }: { tone: 'primary' | 'warning' | 'info'; icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <span className="stat-icon" aria-hidden="true">{icon}</span>
      <div><p className="stat-label">{label}</p><p className="stat-value">{value}</p><p className="stat-note">{note}</p></div>
    </article>
  );
}

function StatusPill({ status }: { status: string }) {
  const { t } = useLanguage();
  return <span className={`status-pill status-${status}`}>{formatStatus(status, t)}</span>;
}

function BookThumb({ listing, large = false }: { listing: Listing; large?: boolean }) {
  const image = listingImage(listing);
  const className = large ? 'row-thumb row-thumb-lg' : 'row-thumb';
  if (image) return <img className={className} src={image} alt="" />;
  return <span className={`${className} row-thumb-placeholder thumb-${listing.listing_type}`} aria-hidden="true"><BookOpen size={large ? 22 : 18} /></span>;
}

function RowSkeletons({ label, tall = false }: { label: string; tall?: boolean }) {
  return <div className="row-list" aria-busy="true" aria-label={label}>{[0, 1, 2].map((index) => <div key={index} className={tall ? 'skeleton sk-row sk-row-tall' : 'skeleton sk-row'} />)}</div>;
}

function CardSkeletons({ label }: { label: string }) {
  return <div className="card-grid" aria-busy="true" aria-label={label}>{[0, 1, 2, 3].map((index) => <div key={index} className="skeleton sk-card" />)}</div>;
}
