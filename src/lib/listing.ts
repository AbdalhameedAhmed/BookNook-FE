import type { Listing } from '../types';
import type { MessageKey } from '../i18n';

const coverFallbacks = [
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=760&q=80',
  'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=760&q=80',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=760&q=80',
];

/** The seller's own photo, if one was uploaded (seed data uses placeholder URLs). */
export function listingImage(listing: Listing): string | null {
  const image = listing.images?.[0];
  return image && !image.includes('images.example.com') ? image : null;
}

/** A display cover for public browsing: the seller's photo or a neutral stock image. */
export function coverFor(listing: Listing, index = 0) {
  return listingImage(listing) ?? coverFallbacks[index % coverFallbacks.length];
}

export function listingTypeLabel(type: Listing['listing_type'], t: (key: MessageKey) => string) {
  return type === 'sale' ? t('forSale') : type === 'exchange' ? t('exchange') : t('free');
}

export function priceLabel(listing: Listing, t: (key: MessageKey) => string) {
  if (listing.price_egp != null) return `${listing.price_egp} ${t('currencyCode')}`;
  return listing.listing_type === 'free' ? t('free') : t('swap');
}
