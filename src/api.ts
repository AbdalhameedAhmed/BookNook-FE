import type {
  AdminOverview, AdminTopup, AuthUser, ChatMessage, Listing, ListingPayload, BookRequest, NotificationPage, PromoCode, PromoPreview,
  SessionResponse, TopupStatus, Transaction, Wallet, WalletTopup,
} from './types';
import { ApiError, NetworkError, readDetail } from './errors';

let unauthorizedHandler: (() => void) | null = null;

/** Called when an authenticated request is rejected with 401 (expired or revoked session). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

async function apiRequest<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  const API_BASE_URL = import.meta.env.VITE_API_URL
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new NetworkError();
  }

  if (!response.ok) {
    if (response.status === 401 && token) unauthorizedHandler?.();
    let detail: string | null = null;
    try { detail = readDetail(await response.json()); } catch { /* Non-JSON error body. */ }
    throw new ApiError(detail ?? `Request failed (${response.status})`, response.status, detail);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const postJson = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export const api = {
  auth: {
    signUp: (email: string, password: string, displayName: string) =>
      apiRequest<{ message: string }>('/api/v1/auth/signup', undefined, postJson({ email, password, display_name: displayName })),
    logIn: (email: string, password: string) =>
      apiRequest<SessionResponse>('/api/v1/auth/login', undefined, postJson({ email, password })),
    confirmEmail: (token: string) =>
      apiRequest<SessionResponse>('/api/v1/auth/confirm-email', undefined, postJson({ token })),
    resendConfirmation: (email: string) =>
      apiRequest<{ message: string }>('/api/v1/auth/resend-confirmation', undefined, postJson({ email })),
    forgotPassword: (email: string) =>
      apiRequest<{ message: string }>('/api/v1/auth/forgot-password', undefined, postJson({ email })),
    resetPassword: (token: string, password: string) =>
      apiRequest<SessionResponse>('/api/v1/auth/reset-password', undefined, postJson({ token, password })),
    me: (token: string) => apiRequest<AuthUser>('/api/v1/auth/me', token),
  },
  listings: (filters: { q?: string; listingType?: string; condition?: string; page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.listingType) params.set('listing_type', filters.listingType);
    if (filters.condition) params.set('condition', filters.condition);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('page_size', String(filters.pageSize));
    const search = params.toString();
    return apiRequest<{ items: Listing[]; total: number }>(`/api/v1/listings${search ? `?${search}` : ''}`);
  },
  listing: (id: string) => apiRequest<Listing>(`/api/v1/listings/${id}`),
  myListings: async (token: string) => (await apiRequest<{ items: Listing[] }>('/api/v1/me/listings', token)).items,
  uploadListingImage: (token: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return apiRequest<{ url: string }>('/api/v1/listing-images', token, { method: 'POST', body });
  },
  createListing: (token: string, payload: ListingPayload) => apiRequest<Listing>('/api/v1/listings', token, {
    method: 'POST', body: JSON.stringify(payload),
  }),
  updateListing: (token: string, id: string, payload: ListingPayload) => apiRequest<Listing>(`/api/v1/listings/${id}`, token, {
    method: 'PATCH', body: JSON.stringify(payload),
  }),
  deactivateListing: (token: string, id: string) => apiRequest(`/api/v1/listings/${id}/deactivate`, token, { method: 'POST' }),
  markListingComplete: (token: string, id: string) => apiRequest<{ status: string }>(`/api/v1/listings/${id}/mark-complete`, token, { method: 'POST' }),
  fees: () => apiRequest<{ platform_fee_egp: number }>('/api/v1/fees'),
  /** Sale: holds price + fee from the wallet. Exchange: holds the fee; `offeredListingIds` are the requester's own books. */
  createRequest: (token: string, id: string, message: string, offeredListingIds: string[] = [], promoCode?: string) => apiRequest<BookRequest>(`/api/v1/listings/${id}/requests`, token, {
    method: 'POST', body: JSON.stringify({ message, offered_listing_ids: offeredListingIds, promo_code: promoCode ?? null }),
  }),
  updateRequest: (token: string, id: string, status: string, chosenListingId?: string, promoCode?: string) => apiRequest<BookRequest>(`/api/v1/requests/${id}`, token, {
    method: 'PATCH', body: JSON.stringify({ status, chosen_listing_id: chosenListingId ?? null, promo_code: promoCode ?? null }),
  }),
  /** Previews a promo code's discount. Does not use it up. */
  checkPromo: (token: string, code: string) => apiRequest<PromoPreview>(`/api/v1/promo-codes/${encodeURIComponent(code.trim())}`, token),
  messages: async (token: string, transactionId: string) =>
    (await apiRequest<{ items: ChatMessage[] }>(`/api/v1/transactions/${transactionId}/messages`, token)).items,
  sendMessage: (token: string, transactionId: string, body: string) =>
    apiRequest<ChatMessage>(`/api/v1/transactions/${transactionId}/messages`, token, postJson({ body })),
  activity: async (token: string) => {
    const [requestResponse, transactionResponse] = await Promise.all([
      apiRequest<{ items: BookRequest[] }>('/api/v1/me/requests', token),
      apiRequest<{ items: Transaction[] }>('/api/v1/me/transactions', token),
    ]);
    return { requests: requestResponse.items, transactions: transactionResponse.items };
  },
  /** Sale: buyer confirms receipt (releases payment). Exchange: each side confirms; completes when both have. */
  completeTransaction: (token: string, id: string) => apiRequest<Transaction>(`/api/v1/transactions/${id}/complete`, token, { method: 'POST' }),
  reportListing: (token: string, id: string, reason: string, details: string | null) => apiRequest('/api/v1/reports', token, {
    method: 'POST', body: JSON.stringify({ listing_id: id, reason, details }),
  }),
  wallet: (token: string) => apiRequest<Wallet>('/api/v1/wallet', token),
  createTopup: (token: string, topup: { senderNumber: string; amountEgp: number; receipt: File }) => {
    const body = new FormData();
    body.append('method', 'e_wallet');
    body.append('sender_number', topup.senderNumber);
    body.append('amount_egp', String(topup.amountEgp));
    body.append('receipt', topup.receipt);
    return apiRequest<WalletTopup>('/api/v1/wallet/topups', token, { method: 'POST', body });
  },
  notifications: {
    list: (token: string, before?: string) =>
      apiRequest<NotificationPage>(`/api/v1/me/notifications?limit=30${before ? `&before=${encodeURIComponent(before)}` : ''}`, token),
    unreadCount: async (token: string) =>
      (await apiRequest<{ unread_count: number }>('/api/v1/me/notifications/unread-count', token)).unread_count,
    /** Omit `ids` to mark everything read. */
    markRead: (token: string, ids?: string[]) =>
      apiRequest<{ updated: number; unread_count: number }>('/api/v1/me/notifications/read', token, postJson(ids ? { ids } : {})),
    /** 404 when the server has no VAPID keys (push switched off). */
    pushPublicKey: async () => (await apiRequest<{ public_key: string }>('/api/v1/push/public-key')).public_key,
    savePushSubscription: (token: string, subscription: PushSubscriptionJSON, lang: string) =>
      apiRequest<void>('/api/v1/me/push-subscriptions', token, postJson({ endpoint: subscription.endpoint, keys: subscription.keys, lang })),
    removePushSubscription: (token: string, endpoint: string) =>
      apiRequest<void>('/api/v1/me/push-subscriptions/remove', token, postJson({ endpoint })),
  },
  admin: {
    overview: (token: string) => apiRequest<AdminOverview>('/api/v1/admin/overview', token),
    topups: async (token: string, status: TopupStatus = 'pending') =>
      (await apiRequest<{ items: AdminTopup[] }>(`/api/v1/admin/wallet-topups?status=${status}`, token)).items,
    approveTopup: (token: string, id: string) => apiRequest<WalletTopup>(`/api/v1/admin/wallet-topups/${id}/approve`, token, { method: 'POST' }),
    rejectTopup: (token: string, id: string, note: string) =>
      apiRequest<WalletTopup>(`/api/v1/admin/wallet-topups/${id}/reject`, token, postJson({ note: note || null })),
    transactions: async (token: string) =>
      (await apiRequest<{ items: Transaction[] }>('/api/v1/admin/transactions?status=arranging', token)).items,
    cancelTransaction: (token: string, id: string) =>
      apiRequest<Transaction>(`/api/v1/admin/transactions/${id}/cancel`, token, { method: 'POST' }),
    promoCodes: async (token: string) => (await apiRequest<{ items: PromoCode[] }>('/api/v1/admin/promo-codes', token)).items,
    createPromo: (token: string, promo: { code: string; discountEgp: number; maxUses: number }) =>
      apiRequest<PromoCode>('/api/v1/admin/promo-codes', token, postJson({ code: promo.code, discount_egp: promo.discountEgp, max_uses: promo.maxUses })),
    setPromoActive: (token: string, id: string, active: boolean) =>
      apiRequest<PromoCode>(`/api/v1/admin/promo-codes/${id}`, token, { method: 'PATCH', body: JSON.stringify({ active }) }),
  },
};
