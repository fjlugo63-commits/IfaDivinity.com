import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

let supabaseInstance: SupabaseClient;

try {
  if (isSupabaseConfigured) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } else {
    // Use a valid-looking but non-functional placeholder to avoid crashes
    supabaseInstance = createClient(
      'https://placeholder-project.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTkwMDAwMDAwMH0.placeholder'
    );
  }
} catch {
  // Fallback: create with placeholder values
  supabaseInstance = createClient(
    'https://placeholder-project.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTkwMDAwMDAwMH0.placeholder'
  );
}

export const supabase: SupabaseClient = supabaseInstance;

export type UserRole = 'anon' | 'buyer' | 'seller' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  created_at: string;
}