import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Check, CircleDollarSign, Clock3, Languages, LogOut, Plus, RefreshCw, ArrowUpRight, X } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { BookRequest, Listing, ListingPayload, Transaction } from '../types';
import { supabase } from '../supabase';
import { formatCondition, formatMeetup, formatStatus, useLanguage } from '../i18n';
import type { MessageKey } from '../i18n';
import { describeError } from '../errors';
import { Alert, FieldError } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { useConfirm } from '../components/ui/dialog';
import { useToast } from '../components/ui/toast';

const maxImageBytes = 2 * 1024 * 1024;
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

export function AccountLayout() {
  const { session } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const navItems = [
    { to: '/account', label: t('overview'), icon: RefreshCw, end: true },
    { to: '/account/books', label: t('myBooks'), icon: BookOpen },
    { to: '/account/requests', label: t('requests'), icon: Clock3 },
    { to: '/account/transactions', label: t('transactions'), icon: CircleDollarSign },
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
    <main className="account-page">
      <Link to="/" className="back-link"><ArrowLeft size={16} className="flip-rtl" /> {t('backHome')}</Link>
      <header className="account-heading">
        <div><p className="eyebrow eyebrow-ink">{t('accountEyebrow')}</p><h1>{t('accountTitleOne')}<br />{t('accountTitleTwo')}</h1></div>
        <div className="account-user"><span className="user-avatar">{session?.user.email?.slice(0, 1).toUpperCase() || 'R'}</span><span><strong>{session?.user.user_metadata?.display_name || 'Reader'}</strong><small>{session?.user.email}</small></span><button className="language-toggle" onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')} aria-label={language === 'en' ? t('switchToArabic') : t('switchToEnglish')}><Languages size={15} /><span>{t('language')}</span></button><button className="icon-quiet" onClick={() => void signOut()} aria-label={t('signOut')} title={t('signOut')}><LogOut size={17} className="flip-rtl" /></button></div>
      </header>
      <nav className="account-tabs" aria-label={t('accountSections')}>
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? 'account-tab is-active' : 'account-tab'}>
            <Icon size={17} /> <span>{label}</span>
          </NavLink>
        ))}
        <NavLink to="/account/books?new=1" className="account-tab account-tab-cta"><Plus size={17} /><span>{t('listBook')}</span></NavLink>
      </nav>
      <div className="account-body"><Outlet /></div>
    </main>
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

  const activeCount = listings.filter((listing) => listing.status === 'active').length;
  const pendingCount = requests.filter((request) => request.status === 'pending').length;

  return (
    <>
      <div className="account-welcome"><span>{t('overviewShelf')} / {new Date().getFullYear()}</span><p>{t('accountWelcome')}</p><NavLink to="/account/books?new=1">{t('addBook')} <ArrowUpRight size={16} className="flip-rtl" /></NavLink></div>
      {error ? <Alert className="page-alert" title={t('listingError')} onRetry={load} retryLabel={t('tryAgain')}>{error}</Alert> : null}
      <section className="stat-grid" aria-label="Account summary">
        <Stat label={t('activeBooks')} value={loading ? '—' : String(activeCount).padStart(2, '0')} note={t('activeBooksNote')} icon={<BookOpen />} />
        <Stat label={t('waitingForYou')} value={loading ? '—' : String(pendingCount).padStart(2, '0')} note={t('pendingRequests')} icon={<Clock3 />} accent />
        <Stat label={t('inProgress')} value={loading ? '—' : String(transactions.filter((item) => item.status === 'arranging').length).padStart(2, '0')} note={t('meetupsArranged')} icon={<CircleDollarSign />} />
      </section>
      <div className="account-columns">
        <section className="account-section">
          <div className="account-section-head"><div><p className="eyebrow eyebrow-ink">{t('recentlyListed')}</p><h2>{t('yourBooks')}</h2></div><NavLink to="/account/books">{t('viewAll')} <ArrowUpRight size={15} className="flip-rtl" /></NavLink></div>
          {loading ? <RowSkeletons label={t('loadingShelf')} /> : listings.length === 0 ? <EmptyState title={t('yourShelfStarts')} copy={t('listReadyBook')} /> : (
            <div className="compact-list">{listings.slice(0, 4).map((listing) => <ListingLine listing={listing} key={listing.id} />)}</div>
          )}
        </section>
        <section className="account-section waiting-section">
          <div className="account-section-head"><div><p className="eyebrow eyebrow-ink">{t('littleActivity')}</p><h2>{t('requests')}</h2></div><NavLink to="/account/requests">{t('viewAll')} <ArrowUpRight size={15} className="flip-rtl" /></NavLink></div>
          {loading ? <RowSkeletons label={t('loadingRequests')} /> : requests.length === 0 ? <EmptyState title={t('quietNow')} copy={t('newRequestsAppear')} /> : (
            <div className="compact-list">{requests.slice(0, 4).map((request) => <RequestLine request={request} key={request.id} />)}</div>
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
    <>
      <div className="account-section-head page-section-head"><div><p className="eyebrow eyebrow-ink">{t('booksShared')}</p><h2>{t('listMyBooks')}</h2></div><Button className="accent-button" onClick={() => { setEditing(null); scrollToEditor(); }}><Plus size={17} /> {t('listBookButton')}</Button></div>
      <div className="books-manage-layout">
        <section className="managed-books" aria-busy={loading}>
          {loadError ? <Alert className="page-alert" title={t('couldNotLoadBooks')} onRetry={() => void refresh()} retryLabel={t('tryAgain')}>{loadError}</Alert> : null}
          {loading ? <RowSkeletons label={t('loadingShelf')} tall /> : listings.length === 0 && !loadError ? <EmptyState title={t('shelfEmpty')} copy={t('addBookFindReader')} /> : listings.map((listing) => (
            <article className={editing?.id === listing.id ? 'managed-book is-editing' : 'managed-book'} key={listing.id}>
              <div className={`managed-cover cover-${listing.listing_type}`}><BookOpen size={25} /></div>
              <div className="managed-book-copy"><span className={`status-dot status-${listing.status}`} />{formatStatus(listing.status, t)}<h3>{listing.title}</h3><p>{listing.author || t('authorNotListed')} · {listing.area} · {formatCondition(listing.condition, t)}</p><strong>{listing.price_egp != null ? `${listing.price_egp} ${t('currencyCode')}` : listing.listing_type === 'free' ? t('free') : t('exchange')}</strong></div>
              <div className="managed-actions">
                <Button variant="outline" size="sm" onClick={() => startEditing(listing)} disabled={busyId === listing.id}>{t('edit')}</Button>
                {listing.status === 'active' || listing.status === 'reserved' ? <>
                  <Button variant="outline" size="sm" onClick={() => void handleComplete(listing)} loading={busyId === listing.id}>{completeLabel(listing, t)}</Button>
                  <Button variant="destructive-outline" size="sm" onClick={() => void handleDeactivate(listing)} disabled={busyId === listing.id}>{t('deactivate')}</Button>
                </> : null}
              </div>
            </article>
          ))}
        </section>
        <section className="listing-editor" id="listing-editor">
          <div className="editor-heading">
            <span className="editor-index">{editing ? '02' : '01'}</span>
            <div><p className="eyebrow eyebrow-ink">{editing ? t('editListing') : t('passBookAlong')}</p><h2>{editing ? t('makeItYours') : t('listFormTitle')}</h2></div>
            {editing ? <button type="button" className="icon-quiet editor-cancel" onClick={() => setEditing(null)} aria-label={t('cancel')} title={t('cancel')}><X size={16} /></button> : null}
          </div>
          <ListingForm
            key={editing?.id ?? 'new'}
            initial={editing}
            onSave={handleSave}
            onUpload={(file) => api.uploadListingImage(session!.access_token, file)}
            saving={saving}
          />
        </section>
      </div>
    </>
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
      <div className="page-section-head"><p className="eyebrow eyebrow-ink">{t('readerToReader')}</p><h2>{t('requestsTitle')}</h2><p className="page-intro">{t('requestIntro')}</p></div>
      {error ? <Alert className="page-alert" title={t('requestFailed')} onRetry={() => { setLoading(true); void reload(); }} retryLabel={t('tryAgain')}>{error}</Alert> : null}
      {loading ? <CardSkeletons label={t('loadingRequests')} /> : requests.length === 0 && !error ? <EmptyState title={t('noRequests')} copy={t('noRequestsCopy')} /> : (
        <div className="request-list">{requests.map((request) => {
          const incoming = request.seller_id === session?.user.id;
          const busy = busyId === request.id;
          return (
            <article className="request-card" key={request.id}>
              <div className="request-card-top"><span className={incoming ? 'request-direction incoming' : 'request-direction'}>{incoming ? t('forYourBook') : t('youSent')}</span><span className={`request-status status-${request.status}`}>{formatStatus(request.status, t)}</span></div>
              <h3><Link to={`/books/${request.listing_id}`}>{request.listing_title || t('requestsTitle')}</Link></h3>
              <p className="request-note">“{request.message || t('noMessage')}”</p>
              <p className="request-id">{request.id.slice(0, 8)}</p>
              {request.status === 'pending' ? (
                <div className="request-actions">
                  {incoming ? <>
                    <Button size="sm" onClick={() => void update(request, 'accepted')} loading={busy}>{t('acceptRequest')}</Button>
                    <Button size="sm" variant="destructive-outline" onClick={() => void update(request, 'rejected')} disabled={busy}>{t('decline')}</Button>
                  </> : <Button size="sm" variant="outline" onClick={() => void update(request, 'cancelled')} loading={busy}>{t('cancelRequest')}</Button>}
                </div>
              ) : null}
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
      <div className="page-section-head"><p className="eyebrow eyebrow-ink">{t('handoverEyebrow')}</p><h2>{t('transactionsTitle')}</h2><p className="page-intro">{t('transactionIntro')}</p></div>
      {error ? <Alert className="page-alert" title={t('transactionFailed')} onRetry={() => { setLoading(true); void reload(); }} retryLabel={t('tryAgain')}>{error}</Alert> : null}
      {loading ? <RowSkeletons label={t('loadingTransactions')} tall /> : transactions.length === 0 && !error ? <EmptyState title={t('nothingMoving')} copy={t('acceptedBecomeTransactions')} /> : (
        <div className="transaction-list">{transactions.map((transaction) => (
          <article className="transaction-row" key={transaction.id}>
            <div className="transaction-stamp"><RefreshCw size={19} /></div>
            <div className="transaction-copy"><span className={`request-status status-${transaction.status}`}>{formatStatus(transaction.status, t)}</span><h3>{transaction.listing_title || t('transactionsTitle')}</h3><p>{formatMeetup(transaction.fulfillment_method, t)} · {transaction.id.slice(0, 8)}</p></div>
            {transaction.status === 'arranging'
              ? <Button size="sm" onClick={() => void complete(transaction)} loading={busyId === transaction.id}>{t('markComplete')}</Button>
              : <span className="completed-label"><Check size={15} /> {formatStatus(transaction.status, t)}</span>}
          </article>
        ))}</div>
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
      setPhotoPreview(initial?.images?.[0] ?? '');
      return;
    }
    const previewUrl = URL.createObjectURL(photo);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [initial?.images, photo]);

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
        setFieldError('photo', undefined);
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

  const invalid = (field: ListingField) => ({
    id: `listing-${field}`,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `listing-${field}-error` : undefined,
  });

  const busy = saving || uploading;

  return <form className="listing-form" onSubmit={submit} noValidate>
    <label className="form-field">{t('bookTitle')}<input {...invalid('title')} value={title} onChange={(event) => { setTitle(event.target.value); setFieldError('title'); }} maxLength={180} /><FieldError id="listing-title-error">{errors.title ? t(errors.title) : null}</FieldError></label>
    <label className="form-field"><span className="field-label">{t('author')} <span className="optional-label">{t('optional')}</span></span><input value={author} onChange={(event) => setAuthor(event.target.value)} maxLength={120} /></label>
    <div className="editor-two-col"><label>{t('condition')}<select value={condition} onChange={(event) => setCondition(event.target.value)}><option value="like_new">{t('likeNew')}</option><option value="good">{t('good')}</option><option value="acceptable">{t('acceptable')}</option><option value="heavily_used">{t('heavilyUsed')}</option></select></label><label>{t('offer')}<select value={listingType} onChange={(event) => { setListingType(event.target.value as Listing['listing_type']); setFieldError('price'); }}><option value="sale">{t('forSale')}</option><option value="exchange">{t('exchange')}</option><option value="free">{t('free')}</option></select></label></div>
    {listingType === 'sale' ? <label className="form-field">{t('priceEgp')}<input {...invalid('price')} type="number" inputMode="numeric" value={price} onChange={(event) => { setPrice(event.target.value); setFieldError('price'); }} min="0" step="1" /><FieldError id="listing-price-error">{errors.price ? t(errors.price) : null}</FieldError></label> : null}
    <label className="form-field"><span className="field-label">{t('bookPhoto')} <span className="optional-label">{t('optional')}</span></span><input {...invalid('photo')} type="file" accept={allowedImageTypes.join(',')} onChange={(event) => {
      const nextPhoto = event.target.files?.[0] ?? null;
      setFieldError('photo');
      if (nextPhoto && (nextPhoto.size > maxImageBytes || !allowedImageTypes.includes(nextPhoto.type))) {
        setPhoto(null);
        setFieldError('photo', nextPhoto.size > maxImageBytes ? 'imageTooLarge' : 'invalidImageType');
        event.target.value = '';
        return;
      }
      setPhoto(nextPhoto);
    }} /><FieldError id="listing-photo-error">{errors.photo ? t(errors.photo) : null}</FieldError></label>
    <p className="form-safety">{t('imageUploadLimit')}</p>
    {photoPreview ? <img className="listing-photo-preview" src={photoPreview} alt={t('coverAlt')} /> : null}
    <label className="form-field">{t('approximateArea')}<input {...invalid('area')} value={area} onChange={(event) => { setArea(event.target.value); setFieldError('area'); }} maxLength={100} /><FieldError id="listing-area-error">{errors.area ? t(errors.area) : null}</FieldError></label>
    <label className="form-field">{t('meetupPreference')}<select value={meetup} onChange={(event) => setMeetup(event.target.value)}><option value="direct_meetup">{t('directMeetup')}</option><option value="pickup_point">{t('pickupPoint')}</option><option value="either">{t('either')}</option></select></label>
    <label className="form-field"><span className="field-label">{t('aboutCopy')} <span className="optional-label">{t('optional')}</span></span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1500} rows={4} placeholder={t('copyPlaceholder')} /></label>
    <p className="form-safety">{t('publicSafety')}</p>
    {formError ? <Alert onDismiss={() => setFormError('')} dismissLabel={t('dismiss')}>{formError}</Alert> : null}
    <Button type="submit" className="save-listing-button" loading={busy}><span>{busy ? t('saving') : initial ? t('saveChanges') : t('publishShelf')}</span>{busy ? null : <ArrowUpRight size={17} className="flip-rtl" />}</Button>
  </form>;
}

function scrollToEditor() {
  document.getElementById('listing-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function completeLabel(listing: Listing, t: (key: MessageKey) => string) {
  return listing.listing_type === 'sale' ? t('markSold') : listing.listing_type === 'exchange' ? t('markExchanged') : t('markGivenAway');
}

function Stat({ label, value, note, icon, accent = false }: { label: string; value: string; note: string; icon: React.ReactNode; accent?: boolean }) {
  return <article className={accent ? 'stat-card stat-accent' : 'stat-card'}><div className="stat-head"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong>{value}</strong><small>{note}</small></article>;
}

function ListingLine({ listing }: { listing: Listing }) {
  const { t } = useLanguage();
  return <article className="compact-row"><span className={`mini-book mini-${listing.listing_type}`}><BookOpen size={17} /></span><span className="compact-row-copy"><strong>{listing.title}</strong><small>{listing.area} · {formatCondition(listing.condition, t)} · {formatStatus(listing.status, t)}</small></span><span className="compact-row-price">{listing.price_egp != null ? `${listing.price_egp} ${t('currencyCode')}` : listing.listing_type === 'free' ? t('free') : t('swap')}</span></article>;
}

function RequestLine({ request }: { request: BookRequest }) {
  const { t } = useLanguage();
  return <article className="compact-row"><span className="request-initial">{request.status.slice(0, 1).toUpperCase()}</span><span className="compact-row-copy"><strong>{request.listing_title || t('requestsTitle')}</strong><small>{request.message || t('noMessage')}</small></span><span className={`tiny-status status-${request.status}`}>{formatStatus(request.status, t)}</span></article>;
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="empty-account"><span className="empty-symbol"><BookOpen size={22} /></span><h3>{title}</h3><p>{copy}</p></div>;
}

function RowSkeletons({ label, tall = false }: { label: string; tall?: boolean }) {
  return <div className="compact-list" aria-busy="true" aria-label={label}>{[0, 1, 2].map((index) => <div key={index} className={tall ? 'skeleton skeleton-row skeleton-row-tall' : 'skeleton skeleton-row'} />)}</div>;
}

function CardSkeletons({ label }: { label: string }) {
  return <div className="request-list" aria-busy="true" aria-label={label}>{[0, 1, 2, 3].map((index) => <div key={index} className="skeleton request-card" />)}</div>;
}
