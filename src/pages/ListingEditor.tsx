import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, Camera, ImageUp } from 'lucide-react';
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
import { BookCover, TileBody } from '../components/book';
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

const group = 'flex flex-col gap-5 border-t border-line pt-6';
const legend = cn(ui.label, 'mb-2');
const choiceTones: Record<ListingType, { box: string; dot: string }> = {
  sale: { box: 'has-[:checked]:border-cobalt has-[:checked]:bg-cobalt-soft has-[:checked]:shadow-[inset_0_0_0_1px_rgb(var(--cobalt))]', dot: 'before:bg-cobalt' },
  exchange: { box: 'has-[:checked]:border-olive has-[:checked]:bg-olive-soft has-[:checked]:shadow-[inset_0_0_0_1px_rgb(var(--olive))]', dot: 'before:bg-olive' },
  free: { box: 'has-[:checked]:border-ochre-ink has-[:checked]:bg-ochre-soft has-[:checked]:shadow-[inset_0_0_0_1px_rgb(var(--ochre-ink))]', dot: 'before:bg-ochre-ink' },
};

/** A radio button drawn as a rounded pill. */
function Pill({ name, value, checked, onChange, children }: { name: string; value: string; checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="relative">
      <input className="peer absolute h-px w-px opacity-0" type="radio" name={name} value={value} checked={checked} onChange={onChange} />
      <span className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line-strong bg-surface px-4 text-15 font-medium peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-glaze">{children}</span>
    </label>
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
      <h1 className={ui.pageTitle}>{listingId ? t('editListing') : t('newListingTitle')}</h1>
      {loading ? <div className={cn(ui.skeleton, 'mt-5 h-60')} aria-busy="true" aria-label={t('loadingShelf')} />
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
      document.getElementById(`listing-${firstInvalid}`)?.focus();
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

  const preview = (
    <div className="grid gap-3">
      <p className={ui.label}>{t('preview')}</p>
      <div className="flex max-w-[220px] flex-col gap-3">
        <BookCover listing={{ id: initial?.id ?? 'preview', title: title || t('bookTitle'), author: author || null, images: [] }} photo={photoPreview} />
        <TileBody
          title={title || t('bookTitle')}
          author={author || t('authorNotListed')}
          price={listingType === 'sale' && price === '' ? `… ${t('currencyCode')}` : priceLabel({ listing_type: listingType, price_egp: price === '' ? null : Number(price) }, t)}
          type={listingType}
          area={area || '…'}
          condition={formatCondition(condition, t)}
        />
      </div>
      <p className={ui.hint}>{t('previewHint')}</p>
    </div>
  );

  return (
    <div className="mt-5 grid gap-10 wide:grid-cols-[minmax(0,620px)_240px] wide:items-start wide:gap-[72px]">
      <form className="flex min-w-0 flex-col gap-7" onSubmit={submit} noValidate>
        <div className={ui.field}>
          <span className={ui.label} id="listing-photo-label">{t('bookPhoto')}</span>
          <button
            type="button"
            id="listing-photo"
            className={cn(
              'relative flex min-h-[220px] w-full flex-col items-center justify-center gap-2.5 rounded-[14px] border-2 border-dashed border-line-strong bg-surface p-6 font-semibold text-ink-2 hover:border-glaze hover:text-glaze aria-[invalid=true]:border-pom',
              photoPreview && 'border-solid bg-sunk p-3',
            )}
            onClick={() => fileInput.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); pickPhoto(event.dataTransfer.files?.[0] ?? null); }}
            aria-labelledby="listing-photo-label listing-photo-action"
            {...invalid('photo')}
          >
            {photoPreview ? <img className="max-h-[320px] w-auto rounded shadow-book" src={photoPreview} alt="" /> : <Camera size={32} aria-hidden="true" />}
            <span id="listing-photo-action" className={cn(photoPreview && 'rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink')}>{photoPreview ? t('replacePhoto') : t('addPhoto')}</span>
          </button>
          <input ref={fileInput} className="sr-only" type="file" accept={allowedImageTypes.join(',')} tabIndex={-1} aria-hidden="true" onChange={(event) => { pickPhoto(event.target.files?.[0] ?? null); event.target.value = ''; }} />
          <span className={ui.hint}>{t('addPhotoHint')}</span>
          <FieldError id="listing-photo-error">{errors.photo ? t(errors.photo) : null}</FieldError>
        </div>

        <section className={group} aria-labelledby="group-book">
          <h2 id="group-book" className="font-book text-22 font-semibold">{t('bookDetails')}</h2>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="listing-title">{t('bookTitle')}</label>
            <input id="listing-title" className={ui.control} value={title} onChange={(event) => { setTitle(event.target.value); setFieldError('title'); }} maxLength={180} {...invalid('title')} />
            <FieldError id="listing-title-error">{errors.title ? t(errors.title) : null}</FieldError>
          </div>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="listing-author">{t('author')} <span className={ui.optional}>{t('optional')}</span></label>
            <input id="listing-author" className={ui.control} value={author} onChange={(event) => setAuthor(event.target.value)} maxLength={120} />
          </div>
          <fieldset className={ui.field}>
            <legend className={legend}>{t('condition')}</legend>
            <div className="flex flex-wrap gap-2">
              {conditions.map((value) => (
                <Pill key={value} name="condition" value={value} checked={condition === value} onChange={() => setCondition(value)}>{formatCondition(value, t)}</Pill>
              ))}
            </div>
          </fieldset>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="listing-description">{t('aboutCopy')} <span className={ui.optional}>{t('optional')}</span></label>
            <textarea id="listing-description" className={cn(ui.control, ui.textarea)} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1500} rows={4} placeholder={t('copyPlaceholder')} />
          </div>
        </section>

        <section className={group} aria-labelledby="group-pass">
          <h2 id="group-pass" className="font-book text-22 font-semibold">{t('passingOn')}</h2>
          <fieldset className={ui.field}>
            <legend className={legend}>{t('howPassOn')}</legend>
            <div className="grid gap-2.5 xs:grid-cols-[repeat(3,1fr)]">
              {types.map((item) => (
                <label key={item.value} className={cn('relative grid cursor-pointer gap-0.5 rounded-xl border-[1.5px] border-line-strong bg-surface px-4 py-3.5 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-glaze', choiceTones[item.value].box)}>
                  <input className="peer absolute h-px w-px opacity-0" type="radio" name="listing-type" value={item.value} checked={listingType === item.value} onChange={() => { setListingType(item.value); setFieldError('price'); }} />
                  <span className={cn('flex items-center gap-2 font-semibold before:h-2.5 before:w-2.5 before:rounded-full', choiceTones[item.value].dot)}>{t(item.label)}</span>
                  <span className="text-13 text-ink-3">{t(item.hint)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {listingType === 'sale' ? (
            <div className={ui.field}>
              <label className={ui.label} htmlFor="listing-price">{t('priceEgp')}</label>
              <div className="relative">
                <input id="listing-price" className={cn(ui.control, 'pe-14')} type="number" inputMode="numeric" min="0" step="1" value={price} onChange={(event) => { setPrice(event.target.value); setFieldError('price'); }} {...invalid('price')} />
                <span className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 font-medium text-ink-3" aria-hidden="true">{t('egpSuffix')}</span>
              </div>
              <span className={ui.hint}>{t('priceNote')}</span>
              <FieldError id="listing-price-error">{errors.price ? t(errors.price) : null}</FieldError>
            </div>
          ) : null}
          <div className={ui.field}>
            <label className={ui.label} htmlFor="listing-area">{t('approximateArea')}</label>
            <input id="listing-area" className={ui.control} list={areaListId} value={area} onChange={(event) => { setArea(event.target.value); setFieldError('area'); }} maxLength={100} autoComplete="off" {...invalid('area')} aria-describedby={errors.area ? 'listing-area-error' : 'listing-area-hint'} />
            <datalist id={areaListId}>{fayoumAreas[language].map((name) => <option key={name} value={name} />)}</datalist>
            <span id="listing-area-hint" className={ui.hint}>{t('areaHint')}</span>
            <FieldError id="listing-area-error">{errors.area ? t(errors.area) : null}</FieldError>
          </div>
          <fieldset className={ui.field}>
            <legend className={legend}>{t('meetupPreference')}</legend>
            <div className="flex flex-wrap gap-2">
              {meetups.map((item) => (
                <Pill key={item.value} name="meetup" value={item.value} checked={meetup === item.value} onChange={() => setMeetup(item.value)}>{t(item.label)}</Pill>
              ))}
            </div>
            <span className={ui.hint}>{t('handoverHint')}</span>
          </fieldset>
        </section>

        <div className="border-t border-line pt-6 wide:hidden">{preview}</div>

        {formError ? <Alert onDismiss={() => setFormError('')} dismissLabel={t('dismiss')}>{formError}</Alert> : null}
        <p className={ui.fine}>{t('publicSafety')}</p>
        <Button type="submit" size="lg" block loading={busy}>{busy ? t('saving') : initial ? t('saveChanges') : t('publish')}</Button>
      </form>
      <aside className="hidden wide:sticky wide:top-[calc(var(--topbar-h)+28px)] wide:block">{preview}</aside>
    </div>
  );
}
