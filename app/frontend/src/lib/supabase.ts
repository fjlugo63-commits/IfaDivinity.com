import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

let supabaseInstance: SupabaseClient;

try {
  if (isSupabaseConfigured) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } else {
    supabaseInstance = createClient(
      'https://placeholder-project.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTkwMDAwMDAwMH0.placeholder'
    );
  }
} catch {
  supabaseInstance = createClient(
    'https://placeholder-project.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTkwMDAwMDAwMH0.placeholder'
  );
}

export const supabase: SupabaseClient = supabaseInstance;

export type UserRole = 'anon' | 'buyer' | 'seller' | 'admin';

// Centralized table names mapping to actual Supabase tables
export const TABLES = {
  profiles: 'app_340b9f1944_profiles',
  categories: 'app_340b9f1944_categories',
  products: 'app_340b9f1944_products',
  orders: 'app_340b9f1944_orders',
  order_items: 'app_340b9f1944_order_items',
  bookings: 'app_340b9f1944_bookings',
  reviews: 'app_340b9f1944_reviews',
} as const;

// Product type matching actual DB schema
export interface DBProduct {
  id: string;
  seller_id: string;
  category_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  currency: string | null;
  images: string[] | null;
  status: string; // 'active' | 'draft' | 'archived'
  is_digital: boolean | null;
  digital_file_url: string | null;
  stock_quantity: number | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

// Order type matching actual DB schema
export interface DBOrder {
  id: string;
  buyer_id: string | null;
  total_amount: number;
  currency: string | null;
  status: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  shipping_address: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Profile type matching actual DB schema
export interface DBProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  bio: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// Booking type matching actual DB schema
export interface DBBooking {
  id: string;
  practitioner_id: string | null;
  client_id: string | null;
  service_type: string;
  scheduled_at: string;
  duration_minutes: number | null;
  status: string;
  price: number;
  notes: string | null;
  meeting_url: string | null;
  created_at: string;
  updated_at: string;
}

// Category type matching actual DB schema
export interface DBCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

// Order item type matching actual DB schema
export interface DBOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  seller_id: string | null;
  title: string;
  quantity: number;
  price: number;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
}