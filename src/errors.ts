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
  'User already registered': 'errorAlreadyRegistered',
};

const statusMessages: Record<number, MessageKey> = {
  401: 'errorSession',
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
  if (reason instanceof NetworkError || (reason instanceof Error && reason.name === 'AuthRetryableFetchError')) return t('errorNetwork');
  const detail = reason instanceof ApiError ? reason.detail : reason instanceof Error ? reason.message : null;
  if (detail && knownDetails[detail]) return t(knownDetails[detail]);
  if (reason instanceof ApiError) {
    if (reason.status >= 500) return t('errorServer');
    if (statusMessages[reason.status]) return t(statusMessages[reason.status]);
    if (detail) return detail;
  }
  // Supabase Auth messages are written for end users; other runtime errors may not be.
  if (reason instanceof Error && reason.name.startsWith('Auth') && detail) {
    const status = (reason as Error & { status?: number }).status;
    if (status === 429) return t('errorRateLimit');
    if (status && status >= 500) return t('errorServer');
    return detail;
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
