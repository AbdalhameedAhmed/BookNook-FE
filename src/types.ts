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

export type BookRequest = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  message: string;
  status: string;
  listing_title?: string | null;
};

export type Transaction = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  fulfillment_method: string;
  listing_title?: string | null;
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
};