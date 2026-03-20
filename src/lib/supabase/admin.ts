import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client using the service_role key.
 * Bypasses RLS — use ONLY in server-side admin code.
 * NEVER import from client components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVraGJic3Fza2hidWxpZG9jdG9lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk2Njk3OSwiZXhwIjoyMDg3NTQyOTc5fQ.qx4KC7_8kRWjBoHgxiLjgApUH3sPuJSkLnrPJb_s6vw'
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
