import type { MessageKey } from './i18n';

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly detail: string | null) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor() {
    super('Network request failed');
    this.name = 'NetworkError';
  }
}

// Backend messages we know about, mapped to localized copy.
const knownDetails: Record<string, MessageKey> = {
  'You already have a pending request for this listing': 'errorDuplicateRequest',
  'You cannot request your own listing': 'errorOwnListing',
  'Inactive or sold listings cannot receive new requests': 'errorListingUnavailable',
  'Book photos must be 2 MB or smaller': 'imageTooLarge',
  'Upload a valid JPEG, PNG, or WebP image': 'invalidImageType',
  'Book photo could not be uploaded': 'imageUploadFailed',
  'Only active or reserved listings can be marked complete': 'errorCannotComplete',
  'Invalid login credentials': 'errorInvalidLogin',
  'Email not confirmed': 'errorEmailNotConfirmed',
  'Too many attempts. Please wait and try again.': 'errorRateLimit',
  'Receipt images must be 5 MB or smaller': 'receiptTooLarge',
  'Enter a valid Egyptian mobile number, like 01012345678': 'fieldMobile',
  'You have too many top-ups waiting for review': 'errorTooManyTopups',
  'Only pending top-ups can be reviewed': 'errorTopupReviewed',
  'Moderator access required': 'errorForbidden',
  'Insufficient wallet balance': 'errorInsufficient',
  'Choose at least one of your books to offer': 'offersRequired',
  'Offered books must be your own available listings': 'errorOffersInvalid',
  'Choose one of the offered books': 'errorChooseOffer',
  'The chosen book is no longer available': 'errorOfferUnavailable',
  'Only the buyer can confirm receiving the book': 'errorBuyerOnlyConfirm',
  'You already confirmed this handover': 'errorAlreadyConfirmed',
  'This book is in an open handover. Finish or cancel the handover first.': 'errorListingInHandover',
  'This handover is closed': 'chatClosed',
  "This promo code isn't valid": 'errorPromoInvalid',
  'This promo code has been fully used': 'errorPromoExhausted',
  'Promo codes only apply to sale and exchange fees': 'errorPromoNotApplicable',
  'A promo code with this name already exists': 'errorPromoTaken',
};

const statusMessages: Record<number, MessageKey> = {
  401: 'errorSession',
  402: 'errorInsufficient',
  403: 'errorForbidden',
  404: 'errorNotFound',
  409: 'errorConflict',
  413: 'imageTooLarge',
  415: 'invalidImageType',
  422: 'errorValidation',
  429: 'errorRateLimit',
};

/** Turns any thrown value into a short, localized message that is safe to show users. */
export function describeError(reason: unknown, t: (key: MessageKey) => string, fallback: MessageKey): string {
  if (reason instanceof NetworkError) return t('errorNetwork');
  const detail = reason instanceof ApiError ? reason.detail : reason instanceof Error ? reason.message : null;
  if (detail && knownDetails[detail]) return t(knownDetails[detail]);
  if (reason instanceof ApiError) {
    if (reason.status >= 500) return t('errorServer');
    if (statusMessages[reason.status]) return t(statusMessages[reason.status]);
    if (detail) return detail;
  }
  return t(fallback);
}

export function isNotFound(reason: unknown) {
  return reason instanceof ApiError && reason.status === 404;
}

/** FastAPI returns `detail` as a string for HTTPException and as a list for validation errors. */
export function readDetail(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const { detail, message } = payload as { detail?: unknown; message?: unknown };
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const messages = detail.map((item) => (item && typeof item === 'object' && 'msg' in item ? String(item.msg) : '')).filter(Boolean);
    return messages.length ? messages.join('. ') : null;
  }
  return typeof message === 'string' ? message : null;
}
