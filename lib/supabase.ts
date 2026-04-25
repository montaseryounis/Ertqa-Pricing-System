import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-only Supabase client using the service_role key. Never import
// this from a client component - it has full read/write access.
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  image_url: string | null;
  role: 'admin' | 'sales';
  created_at: string;
};

export type ConversationRow = {
  id: string;
  user_id: string;
  user_email: string;
  session_id: string | null;
  customer_name: string | null;
  workflow_id: string | null;
  started_at: string;
};
