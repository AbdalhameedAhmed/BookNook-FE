export type ListingType = 'sale' | 'exchange' | 'free';

export type Listing = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  condition: 'like_new' | 'good' | 'acceptable' | 'heavily_used' | string;
  listing_type: ListingType;
  price_egp: number | null;
  status: string;
  area: string;
  meetup_preference: string;
  seller_id: string;
  seller_name: string;
  images: string[];
  created_at: string;
};

export type OfferedBook = {
  listing_id: string;
  title: string;
  author: string | null;
  condition: string | null;
  status: string;
  images: string[];
};

export type BookRequest = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  message: string;
  status: string;
  listing_title?: string | null;
  /** The listing type at the time of the request. */
  kind: ListingType;
  price_egp: number;
  /** The requester's platform fee. */
  fee_egp: number;
  /** Currently held from the requester's wallet (0 once accepted, refunded, or closed). */
  held_egp: number;
  buyer_name?: string | null;
  /** Exchange requests: the requester's books on offer. */
  offers: OfferedBook[];
};

export type Transaction = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  fulfillment_method: string;
  listing_title?: string | null;
  kind: ListingType;
  offered_listing_id: string | null;
  offered_listing_title: string | null;
  price_egp: number;
  buyer_fee_egp: number;
  seller_fee_egp: number;
  buyer_held_egp: number;
  seller_held_egp: number;
  buyer_confirmed_at: string | null;
  seller_confirmed_at: string | null;
  buyer_name: string | null;
  seller_name: string | null;
  created_at?: string;
};

export type ChatMessage = {
  id: string;
  transaction_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type WalletEntry = {
  id: string;
  amount_egp: number;
  kind: 'topup' | 'hold' | 'refund' | 'payout' | 'fee';
  created_at: string;
};

export type ListingPayload = {
  title: string;
  author: string | null;
  description: string | null;
  condition: string;
  listing_type: ListingType;
  price_egp: number | null;
  area: string;
  meetup_preference: string;
  images?: string[];
};
export type AuthUser = {
  id: string;
  email: string;
  display_name: string;
  role: 'user' | 'moderator';
};

/** Returned by the backend when a user signs in, confirms their email, or resets their password. */
export type SessionResponse = {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
  user: AuthUser;
};

export type TopupStatus = 'pending' | 'approved' | 'rejected';

export type WalletTopup = {
  id: string;
  method: 'e_wallet';
  sender_number: string;
  recipient_number: string;
  amount_egp: number;
  status: TopupStatus;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export type ChargingOption = { method: 'e_wallet'; recipient_number: string };

export type Wallet = {
  balance_egp: number;
  /** Taken from the balance for open requests and handovers; refunded or paid out later. */
  held_egp: number;
  entries: WalletEntry[];
  platform_fee_egp: number;
  options: ChargingOption[];
  topups: WalletTopup[];
};

/** A top-up as moderators see it: includes who sent it and a short-lived receipt link. */
export type AdminTopup = WalletTopup & {
  user_id: string;
  user_email: string | null;
  receipt_url: string | null;
};

export type AdminOverview = {
  users_total: number;
  listings_active: number;
  listings_total: number;
  requests_pending: number;
  transactions_arranging: number;
  transactions_completed: number;
  reports_open: number;
  topups_pending: number;
  topups_pending_egp: number;
  wallet_balance_total_egp: number;
  held_total_egp: number;
  platform_revenue_egp: number;
};
