import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './config';

let client: SupabaseClient | null = null;

/** Server-only client using the service role key. Never import in client components. */
export function db(): SupabaseClient {
  if (!client) {
    client = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false },
    });
  }
  return client;
}

export function photoUrl(path: string) {
  return `${env('SUPABASE_URL')}/storage/v1/object/public/portfolio/${path}`;
}
