import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Check, CircleDollarSign, Clock3, Languages, LogOut, Plus, RefreshCw, ArrowUpRight } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { BookRequest, Listing, ListingPayload, Transaction } from '../types';
import { supabase } from '../supabase';
import { formatCondition, formatMeetup, useLanguage } from '../i18n';
import type { MessageKey } from '../i18n';

export function AccountLayout() {
  const { session } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const navItems = [
    { to: '/account', label: t('overview'), icon: RefreshCw, end: true },
    { to: '/account/books', label: t('myBooks'), icon: BookOpen },
    { to: '/account/requests', label: t('requests'), icon: Clock3 },
    { to: '/account/transactions', label: t('transactions'), icon: CircleDollarSign },
  ];

  const signOut = async () => {
    await supabase?.auth.signOut();
    navigate('/', { replace: true });
  };

  return (
    <main className="account-page">
      <header className="account-heading">
        <div><p className="eyebrow eyebrow-ink">{t('accountEyebrow')}</p><h1>{t('accountTitleOne')}<br />{t('accountTitleTwo')}</h1></div>
        <div className="account-user"><span className="user-avatar">{session?.user.email?.slice(0, 1).toUpperCase() || 'R'}</span><span><strong>{session?.user.user_metadata?.display_name || 'Reader'}</strong><small>{session?.user.email}</small></span><button className="language-toggle" onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')} aria-label={language === 'en' ? t('switchToArabic') : t('switchToEnglish')}><Languages size={15} /><span>{t('language')}</span></button><button className="icon-quiet" onClick={signOut} aria-label={t('signOut')} title={t('signOut')}><LogOut size={17} /></button></div>
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

  useEffect(() => {
    let active = true;
    const token = session?.access_token;
    if (!token) return () => { active = false; };
    Promise.all([api.myListings(token), api.activity(token)])
      .then(([myListings, activity]) => {
        if (!active) return;
        setListings(myListings);
        setRequests(activity.requests);
        setTransactions(activity.transactions);
      })
      .catch((reason) => { if (active) setError(reason.message || t('listingError')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session?.access_token]);

  const activeCount = listings.filter((listing) => listing.status === 'active').length;
  const pendingCount = requests.filter((request) => request.status === 'pending').length;

  return (
    <>
      <div className="account-welcome"><span>{t('overviewShelf')} / {new Date().getFullYear()}</span><p>{t('accountWelcome')}</p><NavLink to="/account/books?new=1">{t('addBook')} <ArrowUpRight size={16} /></NavLink></div>
      {error ? <p className="inline-alert" role="alert">{error}</p> : null}
      <section className="stat-grid" aria-label="Account summary">
        <Stat label={t('activeBooks')} value={loading ? '—' : String(activeCount).padStart(2, '0')} note={t('activeBooksNote')} icon={<BookOpen />} />
        <Stat label={t('waitingForYou')} value={loading ? '—' : String(pendingCount).padStart(2, '0')} note={t('pendingRequests')} icon={<Clock3 />} accent />
        <Stat label={t('inProgress')} value={loading ? '—' : String(transactions.filter((item) => item.status === 'arranging').length).padStart(2, '0')} note={t('meetupsArranged')} icon={<CircleDollarSign />} />
      </section>
      <div className="account-columns">
        <section className="account-section">
          <div className="account-section-head"><div><p className="eyebrow eyebrow-ink">{t('recentlyListed')}</p><h2>{t('yourBooks')}</h2></div><NavLink to="/account/books">{t('viewAll')} <ArrowUpRight size={15} /></NavLink></div>
          {loading ? <p className="muted">{t('loadingShelf')}</p> : listings.length === 0 ? <EmptyState title={t('yourShelfStarts')} copy={t('listReadyBook')} /> : (
            <div className="compact-list">{listings.slice(0, 4).map((listing) => <ListingLine listing={listing} key={listing.id} />)}</div>
          )}
        </section>
        <section className="account-section waiting-section">
          <div className="account-section-head"><div><p className="eyebrow eyebrow-ink">{t('littleActivity')}</p><h2>{t('requests')}</h2></div><NavLink to="/account/requests">{t('viewAll')} <ArrowUpRight size={15} /></NavLink></div>
          {loading ? <p className="muted">{t('loadingRequests')}</p> : requests.length === 0 ? <EmptyState title={t('quietNow')} copy={t('newRequestsAppear')} /> : (
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<Listing | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    if (!session) return;
    setLoading(true);
    try { setListings(await api.myListings(session.access_token)); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('couldNotLoadBooks')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, [session?.access_token]);

  useEffect(() => {
    if (searchParams.get('new') !== '1') return;
    document.getElementById('listing-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleDeactivate = async (listing: Listing) => {
    if (!session) return;
    try {
      await api.deactivateListing(session.access_token, listing.id);
      setListings((current) => current.map((item) => item.id === listing.id ? { ...item, status: 'inactive' } : item));
      setNotice(t('deactivated'));
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('couldNotDeactivate')); }
  };

  const handleComplete = async (listing: Listing) => {
    if (!session) return;
    try {
      const result = await api.markListingComplete(session.access_token, listing.id);
      setListings((current) => current.map((item) => item.id === listing.id ? { ...item, status: result.status } : item));
      setNotice(`${t('marked')} ${result.status}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('couldNotUpdate')); }
  };

  const handleSave = async (payload: ListingPayload) => {
    if (!session) return;
    setSaving(true);
    setError('');
    try {
      const photo = payload.images?.[0];
      const listingPayload = { ...payload, images: photo ? [photo] : editing?.images ?? [] };
      if (editing) await api.updateListing(session.access_token, editing.id, listingPayload);
      else await api.createListing(session.access_token, listingPayload);
      setNotice(editing ? t('listingChangesSaved') : t('bookOnShelf'));
      setEditing(null);
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('couldNotSave')); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="account-section-head page-section-head"><div><p className="eyebrow eyebrow-ink">{t('booksShared')}</p><h2>{t('listMyBooks')}</h2></div><button className="accent-button" onClick={() => { setEditing(null); setNotice(''); document.getElementById('listing-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><Plus size={17} /> {t('listBookButton')}</button></div>
      {error ? <p className="inline-alert" role="alert">{error}</p> : null}
      {notice ? <p className="inline-success" role="status"><Check size={16} />{notice}</p> : null}
      <div className="books-manage-layout">
        <section className="managed-books">
          {loading ? <p className="muted">{t('loadingShelf')}</p> : listings.length === 0 ? <EmptyState title={t('shelfEmpty')} copy={t('addBookFindReader')} /> : listings.map((listing) => (
            <article className="managed-book" key={listing.id}>
              <div className={`managed-cover cover-${listing.listing_type}`}><BookOpen size={25} /></div>
              <div className="managed-book-copy"><span className={`status-dot status-${listing.status}`} />{listing.status === 'active' ? t('statusActive') : listing.status === 'reserved' ? t('statusReserved') : listing.status === 'sold' ? t('statusSold') : listing.status === 'exchanged' ? t('statusExchanged') : t('statusInactive')}<h3>{listing.title}</h3><p>{listing.author || t('authorNotListed')} · {listing.area} · {formatCondition(listing.condition, t)}</p><strong>{listing.price_egp != null ? `${listing.price_egp} ${t('currencyCode')}` : listing.listing_type === 'free' ? t('free') : t('exchange')}</strong></div>
              <div className="managed-actions"><button onClick={() => setEditing(listing)}>{t('edit')}</button>{listing.status === 'active' || listing.status === 'reserved' ? <><button onClick={() => void handleComplete(listing)}>{listing.listing_type === 'sale' ? t('markSold') : listing.listing_type === 'exchange' ? t('markExchanged') : t('markGivenAway')}</button><button className="quiet-action" onClick={() => void handleDeactivate(listing)}>{t('deactivate')}</button></> : null}</div>
            </article>
          ))}
        </section>
        <section className="listing-editor" id="listing-editor">
          <div className="editor-heading"><span className="editor-index">{editing ? '02' : '01'}</span><div><p className="eyebrow eyebrow-ink">{editing ? t('editListing') : t('passBookAlong')}</p><h2>{editing ? t('makeItYours') : t('listFormTitle')}</h2></div></div>
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
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const reload = async () => {
    if (!session) return;
    try { setRequests((await api.activity(session.access_token)).requests); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('requestFailed')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void reload(); }, [session?.access_token]);
  const update = async (request: BookRequest, status: string) => {
    if (!session) return;
    try { await api.updateRequest(session.access_token, request.id, status); setNotice(t('requestUpdated')); await reload(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('updateRequestFailed')); }
  };

  return (
    <>
      <Link to="/" className="back-link account-home-link"><ArrowLeft size={16} /> {t('backHome')}</Link>
      <div className="page-section-head"><p className="eyebrow eyebrow-ink">{t('readerToReader')}</p><h2>{t('requestsTitle')}</h2><p className="page-intro">{t('requestIntro')}</p></div>
      {error ? <p className="inline-alert" role="alert">{error}</p> : null}{notice ? <p className="inline-success" role="status"><Check size={16} />{notice}</p> : null}
      {loading ? <p className="muted">{t('loadingRequests')}</p> : requests.length === 0 ? <EmptyState title={t('noRequests')} copy={t('noRequestsCopy')} /> : (
        <div className="request-list">{requests.map((request) => {
          const incoming = request.seller_id === session?.user.id;
          return <article className="request-card" key={request.id}><div className="request-card-top"><span className={incoming ? 'request-direction incoming' : 'request-direction'}>{incoming ? t('forYourBook') : t('youSent')}</span><span className={`request-status status-${request.status}`}>{statusText(request.status, t)}</span></div><h3>{request.listing_title || t('requestsTitle')}</h3><p className="request-note">“{request.message || t('noMessage')}”</p><p className="request-id">{request.id.slice(0, 8)}</p>{request.status === 'pending' ? <div className="request-actions">{incoming ? <><button className="small-accent" onClick={() => void update(request, 'accepted')}>{t('acceptRequest')}</button><button onClick={() => void update(request, 'rejected')}>{t('decline')}</button></> : <button onClick={() => void update(request, 'cancelled')}>{t('cancelRequest')}</button>}</div> : null}</article>;
        })}</div>
      )}
    </>
  );
}

export function TransactionsPage() {
  const { session } = useAuth();
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = async () => {
    if (!session) return;
    try { setTransactions((await api.activity(session.access_token)).transactions); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t('transactionFailed')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void reload(); }, [session?.access_token]);
  const complete = async (transaction: Transaction) => {
    if (!session) return;
    try {
      await api.completeTransaction(session.access_token, transaction.id);
      setTransactions((current) => current.map((item) => item.id === transaction.id ? { ...item, status: 'completed' } : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : t('completeFailed')); }
  };

  return (
    <>
      <div className="page-section-head"><p className="eyebrow eyebrow-ink">{t('handoverEyebrow')}</p><h2>{t('transactionsTitle')}</h2><p className="page-intro">{t('transactionIntro')}</p></div>
      {error ? <p className="inline-alert" role="alert">{error}</p> : null}
      {loading ? <p className="muted">{t('loadingTransactions')}</p> : transactions.length === 0 ? <EmptyState title={t('nothingMoving')} copy={t('acceptedBecomeTransactions')} /> : (
        <div className="transaction-list">{transactions.map((transaction) => <article className="transaction-row" key={transaction.id}><div className="transaction-stamp"><RefreshCw size={19} /></div><div className="transaction-copy"><span className={`request-status status-${transaction.status}`}>{statusText(transaction.status, t)}</span><h3>{transaction.listing_title || t('transactionsTitle')}</h3><p>{formatMeetup(transaction.fulfillment_method, t)} · {transaction.id.slice(0, 8)}</p></div>{transaction.status === 'arranging' ? <button className="small-accent" onClick={() => void complete(transaction)}>{t('markComplete')}</button> : <span className="completed-label"><Check size={15} /> {t('complete')}</span>}</article>)}</div>
      )}
    </>
  );
}

function ListingForm({ initial, onSave, onUpload, saving }: {
  initial: Listing | null;
  onSave: (payload: ListingPayload) => Promise<void>;
  onUpload: (file: File) => Promise<{ url: string }>;
  saving: boolean;
}) {
  const { t } = useLanguage();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [author, setAuthor] = useState(initial?.author ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [condition, setCondition] = useState(initial?.condition ?? 'good');
  const [listingType, setListingType] = useState<Listing['listing_type']>(initial?.listing_type ?? 'sale');
  const [price, setPrice] = useState(initial?.price_egp == null ? '' : String(initial.price_egp));
  const [area, setArea] = useState(initial?.area ?? 'Fayoum Center');
  const [meetup, setMeetup] = useState(initial?.meetup_preference ?? 'direct_meetup');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(initial?.images?.[0] ?? '');
      return;
    }
    const previewUrl = URL.createObjectURL(photo);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [initial?.images, photo]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPhotoError('');
    let uploadedImage: string | undefined;
    if (photo) {
      if (photo.size > 2 * 1024 * 1024) {
        setPhotoError(t('imageTooLarge'));
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) {
        setPhotoError(t('invalidImageType'));
        return;
      }
    }

    const payload: ListingPayload = {
      title: title.trim(), author: author.trim() || null, description: description.trim() || null,
      condition, listing_type: listingType, price_egp: listingType === 'sale' ? Number(price) : null,
      area: area.trim(), meetup_preference: meetup,
    };
    try {
      if (photo) uploadedImage = (await onUpload(photo)).url;
      await onSave({ ...payload, images: uploadedImage ? [uploadedImage] : undefined });
    } catch (reason) {
      setPhotoError(reason instanceof Error ? reason.message : t('imageUploadFailed'));
    }
  };

  return <form className="listing-form" onSubmit={submit}>
    <label>{t('bookTitle')}<input value={title} onChange={(event) => setTitle(event.target.value)} minLength={2} maxLength={180} required /></label>
    <label>{t('author')} <span className="optional-label">{t('optional')}</span><input value={author} onChange={(event) => setAuthor(event.target.value)} maxLength={120} /></label>
    <div className="editor-two-col"><label>{t('condition')}<select value={condition} onChange={(event) => setCondition(event.target.value)}><option value="like_new">{t('likeNew')}</option><option value="good">{t('good')}</option><option value="acceptable">{t('acceptable')}</option><option value="heavily_used">{t('heavilyUsed')}</option></select></label><label>{t('offer')}<select value={listingType} onChange={(event) => setListingType(event.target.value as Listing['listing_type'])}><option value="sale">{t('forSale')}</option><option value="exchange">{t('exchange')}</option><option value="free">{t('free')}</option></select></label></div>
    {listingType === 'sale' ? <label>{t('priceEgp')}<input type="number" value={price} onChange={(event) => setPrice(event.target.value)} min="0" step="1" required /></label> : null}
    <label>{t('bookPhoto')} <span className="optional-label">{t('optional')}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
      const nextPhoto = event.target.files?.[0] ?? null;
      setPhotoError('');
      if (nextPhoto && nextPhoto.size > 2 * 1024 * 1024) {
        setPhoto(null);
        setPhotoError(t('imageTooLarge'));
        event.target.value = '';
        return;
      }
      if (nextPhoto && !['image/jpeg', 'image/png', 'image/webp'].includes(nextPhoto.type)) {
        setPhoto(null);
        setPhotoError(t('invalidImageType'));
        event.target.value = '';
        return;
      }
      setPhoto(nextPhoto);
    }} /></label>
    <p className="form-safety">{t('imageUploadLimit')}</p>
    {photoPreview ? <img className="listing-photo-preview" src={photoPreview} alt={t('coverAlt')} /> : null}
    {photoError ? <p className="inline-alert" role="alert">{photoError}</p> : null}
    <label>{t('approximateArea')}<input value={area} onChange={(event) => setArea(event.target.value)} minLength={2} maxLength={100} required /></label>
    <label>{t('meetupPreference')}<select value={meetup} onChange={(event) => setMeetup(event.target.value)}><option value="direct_meetup">{t('directMeetup')}</option><option value="pickup_point">{t('pickupPoint')}</option><option value="either">{t('either')}</option></select></label>
    <label>{t('aboutCopy')} <span className="optional-label">{t('optional')}</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1500} rows={4} placeholder={t('copyPlaceholder')} /></label>
    <p className="form-safety">{t('publicSafety')}</p>
    <button type="submit" className="save-listing-button" disabled={saving}>{saving ? t('saving') : initial ? t('saveChanges') : t('publishShelf')} <ArrowUpRight size={17} /></button>
  </form>;
}

function Stat({ label, value, note, icon, accent = false }: { label: string; value: string; note: string; icon: React.ReactNode; accent?: boolean }) {
  return <article className={accent ? 'stat-card stat-accent' : 'stat-card'}><div className="stat-head"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong>{value}</strong><small>{note}</small></article>;
}

function ListingLine({ listing }: { listing: Listing }) {
  const { t } = useLanguage();
  return <article className="compact-row"><span className={`mini-book mini-${listing.listing_type}`}><BookOpen size={17} /></span><span className="compact-row-copy"><strong>{listing.title}</strong><small>{listing.area} · {formatCondition(listing.condition, t)} · {listing.status === 'active' ? t('statusActive') : listing.status}</small></span><span className="compact-row-price">{listing.price_egp != null ? `${listing.price_egp} ${t('currencyCode')}` : listing.listing_type === 'free' ? t('free') : t('swap')}</span></article>;
}

function RequestLine({ request }: { request: BookRequest }) {
  const { t } = useLanguage();
  return <article className="compact-row"><span className="request-initial">{request.status.slice(0, 1).toUpperCase()}</span><span className="compact-row-copy"><strong>{request.listing_title || t('requestsTitle')}</strong><small>{statusText(request.status, t)} · {request.message || t('noMessage')}</small></span><span className={`tiny-status status-${request.status}`}>{statusText(request.status, t)}</span></article>;
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="empty-account"><span className="empty-symbol">↗</span><h3>{title}</h3><p>{copy}</p></div>;
}

function statusText(status: string, t: (key: MessageKey) => string) {
  const statusKey: Record<string, MessageKey> = {
    pending: 'statusPending',
    accepted: 'statusAccepted',
    rejected: 'statusRejected',
    cancelled: 'statusCancelled',
    arranging: 'statusArranging',
    completed: 'statusCompleted',
  };
  return statusKey[status] ? t(statusKey[status]) : status;
}
