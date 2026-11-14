import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowLeftRight, ArrowRight, BadgeInfo, Banknote, BookOpen, Camera, Check, CheckCircle2, ChevronDown, Eye, Gift, Handshake, ImageUp, ListChecks, MapPin, RefreshCw, ShieldAlert } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { Listing, ListingPayload, ListingType } from '../types';
import { formatCondition, useLanguage } from '../i18n';
import type { MessageKey } from '../i18n';
import { describeError } from '../errors';
import { fayoumAreas, listingImage, priceLabel } from '../lib/listing';
import { Alert, FieldError } from '../components/ui/alert';
import { Button, buttonClass } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { useToast } from '../components/ui/toast';
import { BookCard } from '../components/book';
import { cn } from '../lib/utils';
import { ui } from '../lib/ui';

const maxImageBytes = 2 * 1024 * 1024;
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const conditions = ['like_new', 'good', 'acceptable', 'heavily_used'];
const meetups: Array<{ value: string; label: MessageKey }> = [
  { value: 'direct_meetup', label: 'directMeetup' },
  { value: 'pickup_point', label: 'pickupPoint' },
  { value: 'either', label: 'either' },
];
const types: Array<{ value: ListingType; label: MessageKey; hint: MessageKey }> = [
  { value: 'sale', label: 'forSale', hint: 'saleHint' },
  { value: 'exchange', label: 'exchange', hint: 'exchangeHint' },
  { value: 'free', label: 'free', hint: 'freeHint' },
];

type Field = 'photo' | 'title' | 'price' | 'area';

const sectionCard = cn(ui.card, 'flex flex-col gap-6 p-4 md:p-6');
const legend = cn(ui.label, 'mb-2');
const required = <span className="ms-1 font-bold text-pom" aria-hidden="true">*</span>;
const focusRing = 'has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-glaze';
const hiddenRadio = 'peer absolute h-px w-px opacity-0';

const typeIcons: Record<ListingType, typeof Banknote> = { sale: Banknote, exchange: ArrowLeftRight, free: Gift };
const typeChoice: Record<ListingType, { on: string; icon: string; title: string; check: string }> = {
  sale: { on: 'bg-cobalt-soft/60 ring-2 ring-cobalt', icon: 'bg-cobalt text-white dark:text-paper', title: 'text-cobalt-ink', check: 'bg-cobalt text-white dark:text-paper' },
  exchange: { on: 'bg-glaze-soft/60 ring-2 ring-glaze', icon: 'bg-glaze text-on-glaze', title: 'text-glaze-deep', check: 'bg-glaze text-on-glaze' },
  free: { on: 'bg-ochre-soft/60 ring-2 ring-ochre', icon: 'bg-ochre text-white', title: 'text-ochre-ink', check: 'bg-ochre text-white' },
};

/** Numbered heading at the top of each form card. */
function SectionHead({ id, step, title, lead, tone, aside }: { id: string; step: number; title: string; lead: string; tone: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line-strong/30 pb-4">
      <div className="flex items-start gap-3">
        <span className={cn('grid h-8 w-8 flex-none place-items-center rounded-ctl text-label-lg font-bold', tone)} aria-hidden="true">{step}</span>
        <div>
          <h2 id={id} className="font-book text-headline-sm font-semibold text-ink ar:leading-[1.5]">{title}</h2>
          <p className="text-body-sm text-ink-2">{lead}</p>
        </div>
      </div>
      {aside}
    </div>
  );
}

/** Create (/sell) or edit (/account/books/:listingId/edit) a listing. */
export default function ListingEditor() {
  const { listingId } = useParams();
  const { session } = useAuth();
  const { t } = useLanguage();
  const [initial, setInitial] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(Boolean(listingId));
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!listingId || !session) return;
    let active = true;
    setLoading(true);
    api.myListings(session.access_token)
      .then((items) => {
        if (!active) return;
        const match = items.find((item) => item.id === listingId) ?? null;
        setInitial(match);
        setLoadError(match ? '' : t('listingNotFoundOwner'));
      })
      .catch((reason) => { if (active) setLoadError(describeError(reason, t, 'couldNotLoadBooks')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [listingId, session, t]);

  return (
    <div className={cn(ui.wrap, ui.page)}>
      <Link className={ui.backLink} to="/account/books"><ArrowLeft size={18} className={ui.flipRtl} aria-hidden="true" />{t('backToMyBooks')}</Link>
      <header className="mb-6 md:mb-8">
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-sunk-3 px-2.5 py-0.5 text-label-sm font-semibold text-glaze-deep">
          <BookOpen size={14} aria-hidden="true" />{listingId ? t('editorEyebrowEdit') : t('editorEyebrowNew')}
        </span>
        <h1 className={ui.pageTitle}>{listingId ? t('editListing') : t('newListingTitle')}</h1>
        <p className="mt-1 text-body-md text-ink-2">{listingId ? t('editorLeadEdit') : t('editorLeadNew')}</p>
      </header>
      {loading ? <div className={cn(ui.skeleton, 'h-60 rounded-card')} aria-busy="true" aria-label={t('loadingShelf')} />
        : loadError ? <EmptyState icon={<ImageUp size={24} />} title={loadError} action={<Link className={buttonClass({ variant: 'secondary' })} to="/account/books">{t('backToMyBooks')}</Link>} />
          : <ListingForm key={initial?.id ?? 'new'} initial={initial} />}
    </div>
  );
}

function ListingForm({ initial }: { initial: Listing | null }) {
  const { session } = useAuth();
  const { t, language } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  const areaListId = useId();
  const fileInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initial?.title ?? '');
  const [author, setAuthor] = useState(initial?.author ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [condition, setCondition] = useState(initial?.condition ?? 'good');
  const [listingType, setListingType] = useState<ListingType>(initial?.listing_type ?? 'sale');
  const [price, setPrice] = useState(initial?.price_egp == null ? '' : String(initial.price_egp));
  const [area, setArea] = useState(initial?.area ?? '');
  const [meetup, setMeetup] = useState(initial?.meetup_preference ?? 'direct_meetup');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initial ? listingImage(initial) : null);
  const [errors, setErrors] = useState<Partial<Record<Field, MessageKey>>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const existingPhoto = initial ? listingImage(initial) : null;

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(existingPhoto);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo, existingPhoto]);

  const setFieldError = (field: Field, key?: MessageKey) => setErrors((current) => ({ ...current, [field]: key }));

  const pickPhoto = (file: File | null) => {
    setFieldError('photo');
    if (!file) return;
    if (!allowedImageTypes.includes(file.type)) { setFieldError('photo', 'invalidImageType'); return; }
    if (file.size > maxImageBytes) { setFieldError('photo', 'imageTooLarge'); return; }
    setPhoto(file);
  };

  const validate = () => {
    const next: Partial<Record<Field, MessageKey>> = {};
    if (!photo && !existingPhoto) next.photo = 'photoRequired';
    if (!title.trim()) next.title = 'fieldRequired';
    else if (title.trim().length < 2) next.title = 'fieldTitleShort';
    if (listingType === 'sale') {
      const value = Number(price);
      if (price.trim() === '' || !Number.isInteger(value) || value < 0) next.price = 'fieldPrice';
    }
    if (!area.trim()) next.area = 'fieldRequired';
    else if (area.trim().length < 2) next.area = 'fieldAreaShort';
    return next;
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    setFormError('');
    const next = validate();
    setErrors(next);
    const firstInvalid = (['photo', 'title', 'price', 'area'] as Field[]).find((field) => next[field]);
    if (firstInvalid) {
      const target = document.getElementById(`listing-${firstInvalid}`);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: 'center' });
      return;
    }

    setBusy(true);
    try {
      let images = initial?.images ?? [];
      if (photo) {
        try {
          images = [(await api.uploadListingImage(session.access_token, photo)).url];
        } catch (reason) {
          setFormError(describeError(reason, t, 'imageUploadFailed'));
          return;
        }
      }
      const payload: ListingPayload = {
        title: title.trim(),
        author: author.trim() || null,
        description: description.trim() || null,
        condition,
        listing_type: listingType,
        price_egp: listingType === 'sale' ? Number(price) : null,
        area: area.trim(),
        meetup_preference: meetup,
        images,
      };
      if (initial) await api.updateListing(session.access_token, initial.id, payload);
      else await api.createListing(session.access_token, payload);
      toast.success(initial ? t('listingSavedTitle') : t('published'), payload.title);
      navigate('/account/books');
    } catch (reason) {
      setFormError(describeError(reason, t, 'couldNotSave'));
    } finally {
      setBusy(false);
    }
  };

  const invalid = (field: Field) => ({
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `listing-${field}-error` : undefined,
  });

  const previewCard = (
    <BookCard
      listing={{ id: initial?.id ?? 'preview', title: title || t('bookTitle'), author: author || null, images: [], listing_type: listingType, area: area || '…' }}
      photo={photoPreview}
      price={listingType === 'sale' && price === '' ? `… ${t('currencyCode')}` : priceLabel({ listing_type: listingType, price_egp: price === '' ? null : Number(price) }, t)}
      conditionLabel={formatCondition(condition, t)}
      authorFallback={t('authorNotListed')}
    />
  );

  return (
    <div className="grid items-start gap-6 wide:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_368px]">
      <form className="flex min-w-0 flex-col gap-6" onSubmit={submit} noValidate>
        <section className={sectionCard} aria-labelledby="group-book">
          <SectionHead
            id="group-book"
            step={1}
            title={t('bookDetails')}
            lead={t('editorBookLead')}
            tone="bg-sunk-3 text-glaze-deep"
            aside={<span className="hidden flex-none text-label-sm font-semibold text-pom xs:inline">* {t('editorRequiredNote')}</span>}
          />

          <div className={ui.field}>
            <span className={ui.label} id="listing-photo-label">{t('bookPhoto')}{required}</span>
            {errors.photo ? <div className="rounded-ctl bg-pom-soft px-4 py-2.5"><FieldError id="listing-photo-error">{t(errors.photo)}</FieldError></div> : null}
            <div className="mt-1 rounded-xl bg-sunk p-3 sm:p-5">
              <button
                type="button"
                id="listing-photo"
                className={cn(
                  'group flex w-full flex-col items-center justify-center gap-2 rounded-ctl border-2 border-dashed border-line-strong bg-surface/80 p-5 text-center transition-colors hover:border-glaze hover:bg-surface aria-[invalid=true]:border-pom',
                  photoPreview ? 'sm:flex-row sm:justify-start sm:gap-5 sm:text-start' : 'min-h-[220px]',
                )}
                onClick={() => fileInput.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { event.preventDefault(); pickPhoto(event.dataTransfer.files?.[0] ?? null); }}
                aria-labelledby="listing-photo-label listing-photo-action"
                aria-required="true"
                aria-invalid={errors.photo ? true : undefined}
                aria-describedby={errors.photo ? 'listing-photo-error listing-photo-hint' : 'listing-photo-hint'}
              >
                {photoPreview
                  ? <img className="max-h-[260px] w-auto max-w-full rounded-ctl object-contain shadow-book sm:max-h-[180px]" src={photoPreview} alt="" />
                  : <span className="grid h-12 w-12 place-items-center rounded-full bg-sunk-3 text-glaze" aria-hidden="true"><Camera size={26} /></span>}
                <span className={cn('flex flex-col items-center gap-1', photoPreview && 'sm:items-start')}>
                  {photoPreview ? null : <span className="text-label-lg font-semibold text-ink">{t('addPhoto')}</span>}
                  <span id="listing-photo-hint" className="max-w-sm text-body-sm text-ink-3">{t('addPhotoHint')}</span>
                  <span id="listing-photo-action" className="mt-2 inline-flex items-center gap-1.5 rounded-ctl bg-sunk-3 px-4 py-2 text-label-md font-semibold text-ink shadow-sm transition-colors group-hover:bg-glaze-soft group-hover:text-glaze-deep">
                    {photoPreview ? <RefreshCw size={15} aria-hidden="true" /> : <ImageUp size={15} aria-hidden="true" />}
                    {photoPreview ? t('replacePhoto') : t('editorChoosePhoto')}
                  </span>
                </span>
              </button>
            </div>
            <input ref={fileInput} className="sr-only" type="file" accept={allowedImageTypes.join(',')} tabIndex={-1} aria-hidden="true" onChange={(event) => { pickPhoto(event.target.files?.[0] ?? null); event.target.value = ''; }} />
          </div>

          <div className={ui.field}>
            <label className={ui.label} htmlFor="listing-title">{t('bookTitle')}{required}</label>
            <input id="listing-title" className={cn(ui.control, 'text-title-md font-medium')} value={title} onChange={(event) => { setTitle(event.target.value); setFieldError('title'); }} maxLength={180} aria-required="true" {...invalid('title')} />
            <FieldError id="listing-title-error">{errors.title ? t(errors.title) : null}</FieldError>
          </div>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="listing-author">{t('author')} <span className={ui.optional}>{t('optional')}</span></label>
            <input id="listing-author" className={ui.control} value={author} onChange={(event) => setAuthor(event.target.value)} maxLength={120} />
          </div>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="listing-description">{t('aboutCopy')} <span className={ui.optional}>{t('optional')}</span></label>
            <textarea id="listing-description" className={cn(ui.control, ui.textarea)} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1500} rows={4} placeholder={t('copyPlaceholder')} />
          </div>
          <fieldset className={ui.field}>
            <legend className={legend}>{t('condition')}{required}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {conditions.map((value) => (
                <label key={value} className={cn('relative flex min-h-12 cursor-pointer items-center justify-center rounded-ctl px-3 py-2.5 text-center text-label-lg font-semibold transition-colors', focusRing, condition === value ? 'bg-glaze text-on-glaze shadow-sm' : 'bg-sunk text-ink hover:bg-sunk-2')}>
                  <input className={hiddenRadio} type="radio" name="condition" value={value} checked={condition === value} onChange={() => setCondition(value)} />
                  {formatCondition(value, t)}
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className={sectionCard} aria-labelledby="group-pass">
          <SectionHead id="group-pass" step={2} title={t('passingOn')} lead={t('editorPassLead')} tone="bg-cobalt-soft text-cobalt-ink" />

          <fieldset className={ui.field}>
            <legend className={legend}>{t('howPassOn')}{required}</legend>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {types.map((item) => {
                const on = listingType === item.value;
                const Icon = typeIcons[item.value];
                return (
                  <label key={item.value} className={cn('relative flex cursor-pointer gap-3 rounded-xl p-4 transition-colors sm:flex-col sm:gap-2', focusRing, on ? cn(typeChoice[item.value].on, 'shadow-sm') : 'bg-sunk hover:bg-sunk-2')}>
                    <input className={hiddenRadio} type="radio" name="listing-type" value={item.value} checked={on} onChange={() => { setListingType(item.value); setFieldError('price'); }} />
                    <span className={cn('grid h-9 w-9 flex-none place-items-center rounded-ctl', on ? typeChoice[item.value].icon : 'bg-sunk-3 text-ink-2')} aria-hidden="true"><Icon size={20} /></span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-title-md font-bold', on ? typeChoice[item.value].title : 'text-ink')}>{t(item.label)}</span>
                      <span className="block text-body-sm text-ink-2">{t(item.hint)}</span>
                    </span>
                    <span className={cn('absolute end-4 top-4 grid h-5 w-5 place-items-center rounded-full', on ? typeChoice[item.value].check : 'bg-line-strong/40')} aria-hidden="true">{on ? <Check size={13} strokeWidth={3} /> : null}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {listingType === 'sale' ? (
            <div className="grid gap-4 rounded-xl bg-sunk p-4 md:grid-cols-2 md:items-center">
              <div className={ui.field}>
                <label className={ui.label} htmlFor="listing-price">{t('priceEgp')}{required}</label>
                <div className="relative max-w-xs">
                  <input id="listing-price" className={cn(ui.control, 'bg-surface pe-20 text-headline-sm font-bold text-cobalt')} type="number" inputMode="numeric" min="0" step="1" value={price} onChange={(event) => { setPrice(event.target.value); setFieldError('price'); }} aria-required="true" {...invalid('price')} />
                  <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 rounded-md bg-sunk-2 px-2 py-1 text-label-md font-bold text-ink-2" aria-hidden="true">{t('egpSuffix')}</span>
                </div>
                <FieldError id="listing-price-error">{errors.price ? t(errors.price) : null}</FieldError>
              </div>
              <p className="flex items-start gap-2 rounded-ctl bg-surface/80 p-3 text-body-sm text-ink-2">
                <BadgeInfo size={16} className="mt-px flex-none text-cobalt" aria-hidden="true" />{t('priceNote')}
              </p>
            </div>
          ) : null}

          <div className={ui.field}>
            <label className={ui.label} htmlFor="listing-area">{t('approximateArea')}{required}</label>
            <div className="relative">
              <input id="listing-area" className={cn(ui.control, 'pe-11')} list={areaListId} value={area} onChange={(event) => { setArea(event.target.value); setFieldError('area'); }} maxLength={100} autoComplete="off" aria-required="true" {...invalid('area')} aria-describedby={errors.area ? 'listing-area-error listing-area-hint' : 'listing-area-hint'} />
              <MapPin className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-ink-3" size={18} aria-hidden="true" />
            </div>
            <datalist id={areaListId}>{fayoumAreas[language].map((name) => <option key={name} value={name} />)}</datalist>
            <span id="listing-area-hint" className={cn(ui.hint, 'flex items-start gap-1.5')}><ShieldAlert size={15} className="mt-px flex-none text-ochre" aria-hidden="true" />{t('areaHint')}</span>
            <FieldError id="listing-area-error">{errors.area ? t(errors.area) : null}</FieldError>
          </div>

          <fieldset className={ui.field}>
            <legend className={legend}>{t('meetupPreference')}{required}</legend>
            <div className="grid gap-2 xs:grid-cols-3">
              {meetups.map((item) => (
                <label key={item.value} className={cn('flex min-h-12 cursor-pointer items-center gap-3 rounded-ctl px-3 py-2.5 transition-colors', meetup === item.value ? 'bg-glaze-soft/70 ring-1 ring-glaze/60' : 'bg-sunk hover:bg-sunk-2')}>
                  <input className="h-4 w-4 flex-none accent-glaze" type="radio" name="meetup" value={item.value} checked={meetup === item.value} onChange={() => setMeetup(item.value)} />
                  <span className="text-label-lg font-semibold text-ink">{t(item.label)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-start gap-3 rounded-xl bg-sunk-3/60 p-4">
            <Handshake size={22} className="mt-0.5 flex-none text-glaze-deep" aria-hidden="true" />
            <div>
              <p className="text-label-lg font-semibold text-ink">{t('handoverHint')}</p>
              <p className="mt-0.5 text-body-sm text-ink-2">{t('publicSafety')}</p>
            </div>
          </div>
        </section>

        <details className={cn(ui.card, 'group wide:hidden')}>
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-label-lg font-semibold text-ink [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-glaze" aria-hidden="true" />{t('editorShowPreview')}</span>
            <ChevronDown size={18} className="text-glaze-deep transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="grid gap-3 border-t border-line-strong/30 p-4">
            <p className={ui.hint}>{t('previewHint')}</p>
            <div className="max-w-[240px]">{previewCard}</div>
          </div>
        </details>

        {formError ? <Alert onDismiss={() => setFormError('')} dismissLabel={t('dismiss')}>{formError}</Alert> : null}

        <div className={cn(ui.card, 'flex flex-col gap-3 p-3 shadow-deck sm:flex-row sm:items-center sm:justify-between sm:p-4 md:shadow-card max-md:sticky max-md:bottom-[calc(66px+env(safe-area-inset-bottom))] max-md:z-30')}>
          {initial ? <span className="hidden sm:block" /> : (
            <p className="hidden items-center gap-2 text-label-md font-medium text-ink-2 sm:flex">
              <Eye size={17} className="flex-none text-glaze" aria-hidden="true" />{t('editorPublishNote')}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Link className={cn(buttonClass({ variant: 'ghost' }), 'hidden xs:inline-flex')} to="/account/books">{t('cancel')}</Link>
            <Button type="submit" className="flex-1 sm:flex-initial" loading={busy}>
              {busy ? t('saving') : initial ? t('saveChanges') : t('publish')}
              {busy ? null : <ArrowRight size={18} className={ui.flipRtl} aria-hidden="true" />}
            </Button>
          </div>
        </div>
      </form>

      <aside className="hidden flex-col gap-4 wide:sticky wide:top-[calc(var(--topbar-h)+24px)] wide:flex" aria-label={t('preview')}>
        <div className={cn(ui.card, 'p-4')}>
          <div className="mb-3 flex items-center gap-2 border-b border-line-strong/30 pb-2">
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-glaze opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-glaze" />
            </span>
            <span className="text-label-lg font-bold text-ink">{t('editorLivePreview')}</span>
          </div>
          <p className="mb-4 text-body-sm text-ink-2">{t('previewHint')}</p>
          {previewCard}
        </div>
        <div className="rounded-card bg-sunk p-4">
          <p className="mb-2 flex items-center gap-1.5 text-title-md font-semibold text-ink"><ListChecks size={20} className="text-glaze" aria-hidden="true" />{t('editorChecklistTitle')}</p>
          <ul className="flex flex-col gap-2 text-body-sm text-ink-2">
            {(['editorCheckOwnCopy', 'editorCheckPublicPlace', 'editorCheckNoFees'] as MessageKey[]).map((key) => (
              <li key={key} className="flex items-start gap-2"><CheckCircle2 size={17} className="mt-px flex-none text-glaze" aria-hidden="true" />{t(key)}</li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
