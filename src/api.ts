import type { Listing, ListingPayload, BookRequest, Transaction } from './types';
import { ApiError, NetworkError, readDetail } from './errors';

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
    let detail: string | null = null;
    try { detail = readDetail(await response.json()); } catch { /* Non-JSON error body. */ }
    throw new ApiError(detail ?? `Request failed (${response.status})`, response.status, detail);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  listings: async (query = '') => {
    const search = query ? `?q=${encodeURIComponent(query)}` : '';
    return apiRequest<{ items: Listing[]; total: number }>(`/api/v1/listings${search}`);
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