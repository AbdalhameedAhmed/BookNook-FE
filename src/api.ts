import type { AuthUser, Listing, ListingPayload, BookRequest, SessionResponse, Transaction } from './types';
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
  createRequest: (token: string, id: string, message: string) => apiRequest<BookRequest>(`/api/v1/listings/${id}/requests`, token, {
    method: 'POST', body: JSON.stringify({ message }),
  }),
  updateRequest: (token: string, id: string, status: string) => apiRequest<BookRequest>(`/api/v1/requests/${id}`, token, {
    method: 'PATCH', body: JSON.stringify({ status }),
  }),
  activity: async (token: string) => {
    const [requestResponse, transactionResponse] = await Promise.all([
      apiRequest<{ items: BookRequest[] }>('/api/v1/me/requests', token),
      apiRequest<{ items: Transaction[] }>('/api/v1/me/transactions', token),
    ]);
    return { requests: requestResponse.items, transactions: transactionResponse.items };
  },
  completeTransaction: (token: string, id: string) => apiRequest(`/api/v1/transactions/${id}/complete`, token, { method: 'POST' }),
  reportListing: (token: string, id: string, reason: string, details: string | null) => apiRequest('/api/v1/reports', token, {
    method: 'POST', body: JSON.stringify({ listing_id: id, reason, details }),
  }),
};