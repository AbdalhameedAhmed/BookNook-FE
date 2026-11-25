import type { Listing, ListingType } from '../types';
import type { MessageKey } from '../i18n';

type T = (key: MessageKey) => string;

/** The seller's own photo. Seed data uses placeholder URLs, which count as "no photo". */
export function listingImage(listing: Pick<Listing, 'images'>): string | null {
  const image = listing.images?.[0];
  return image && !image.includes('images.example.com') ? image : null;
}

/**
 * Glaze colours from Tunis-village pottery. Used for generated spines and covers
 * so a book looks the same everywhere it appears. `ink` is the readable text colour on it.
 */
const glazes = [
  { bg: '#12797B', ink: '#F4F6F3' },
  { bg: '#2B4A9A', ink: '#F4F6F3' },
  { bg: '#C9921F', ink: '#17202E' },
  { bg: '#5A6E2C', ink: '#F4F6F3' },
  { bg: '#6B3A5B', ink: '#F4F6F3' },
  { bg: '#1E4E6B', ink: '#F4F6F3' },
  { bg: '#D9C79E', ink: '#17202E' },
  { bg: '#8CC7C0', ink: '#17202E' },
];

function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/** Stable visual traits for a book, derived from its id and title. */
export function bookLook(listing: Pick<Listing, 'id' | 'title'>) {
  const seed = hash(`${listing.id}:${listing.title}`);
  const glaze = glazes[seed % glazes.length];
  return {
    ...glaze,
    spineWidth: 38 + (seed >> 3) % 22,
    spineHeight: 82 + (seed >> 7) % 18,
    band: (seed >> 11) % 3,
  };
}

export function listingTypeLabel(type: ListingType, t: T) {
  return type === 'sale' ? t('forSale') : type === 'exchange' ? t('exchange') : t('free');
}

export function priceLabel(listing: Pick<Listing, 'price_egp' | 'listing_type'>, t: T) {
  if (listing.listing_type === 'sale' && listing.price_egp != null) return `${listing.price_egp} ${t('currencyCode')}`;
  return listing.listing_type === 'free' ? t('free') : t('swap');
}

export function completeLabel(listing: Pick<Listing, 'listing_type'>, t: T) {
  return listing.listing_type === 'sale' ? t('markSold') : listing.listing_type === 'exchange' ? t('markExchanged') : t('markGivenAway');
}

/** "3 days ago", localized. */
export function timeAgo(iso: string, language: string) {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const seconds = Math.round((then - Date.now()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  const format = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return format.format(0, 'minute');
}

/** Egypt's 27 governorates. Codes match the backend's VALID_GOVERNORATES and the DB check (migration 020). */
export const GOVERNORATES = [
  { code: 'cairo', en: 'Cairo', ar: 'القاهرة' },
  { code: 'giza', en: 'Giza', ar: 'الجيزة' },
  { code: 'alexandria', en: 'Alexandria', ar: 'الإسكندرية' },
  { code: 'qalyubia', en: 'Qalyubia', ar: 'القليوبية' },
  { code: 'sharqia', en: 'Sharqia', ar: 'الشرقية' },
  { code: 'dakahlia', en: 'Dakahlia', ar: 'الدقهلية' },
  { code: 'gharbia', en: 'Gharbia', ar: 'الغربية' },
  { code: 'monufia', en: 'Monufia', ar: 'المنوفية' },
  { code: 'kafr_el_sheikh', en: 'Kafr El Sheikh', ar: 'كفر الشيخ' },
  { code: 'beheira', en: 'Beheira', ar: 'البحيرة' },
  { code: 'damietta', en: 'Damietta', ar: 'دمياط' },
  { code: 'port_said', en: 'Port Said', ar: 'بورسعيد' },
  { code: 'ismailia', en: 'Ismailia', ar: 'الإسماعيلية' },
  { code: 'suez', en: 'Suez', ar: 'السويس' },
  { code: 'north_sinai', en: 'North Sinai', ar: 'شمال سيناء' },
  { code: 'south_sinai', en: 'South Sinai', ar: 'جنوب سيناء' },
  { code: 'red_sea', en: 'Red Sea', ar: 'البحر الأحمر' },
  { code: 'fayoum', en: 'Fayoum', ar: 'الفيوم' },
  { code: 'beni_suef', en: 'Beni Suef', ar: 'بني سويف' },
  { code: 'minya', en: 'Minya', ar: 'المنيا' },
  { code: 'asyut', en: 'Asyut', ar: 'أسيوط' },
  { code: 'sohag', en: 'Sohag', ar: 'سوهاج' },
  { code: 'qena', en: 'Qena', ar: 'قنا' },
  { code: 'luxor', en: 'Luxor', ar: 'الأقصر' },
  { code: 'aswan', en: 'Aswan', ar: 'أسوان' },
  { code: 'new_valley', en: 'New Valley', ar: 'الوادي الجديد' },
  { code: 'matrouh', en: 'Matrouh', ar: 'مطروح' },
] as const;

/** Governorates sorted by name in the current language, for selects. */
export function sortedGovernorates(language: 'en' | 'ar') {
  return [...GOVERNORATES].sort((a, b) => a[language].localeCompare(b[language], language));
}

export function governorateName(code: string | null | undefined, language: 'en' | 'ar') {
  return GOVERNORATES.find((item) => item.code === code)?.[language] ?? '';
}

/** "Smouha, Alexandria": the free-text area plus its governorate when known. */
export function placeLabel(listing: { area: string; governorate?: string | null }, language: 'en' | 'ar') {
  const governorate = governorateName(listing.governorate, language);
  if (!governorate || listing.area.trim() === governorate) return listing.area;
  return `${listing.area}${language === 'ar' ? '، ' : ', '}${governorate}`;
}
