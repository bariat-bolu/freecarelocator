import { createClient } from '@/lib/supabase/server';

interface AdminAuthResult {
  authorized: boolean;
  userId: string | null;
  error?: string;
}

/**
 * Verifies the request is from an authenticated admin.
 * Uses cookie-based auth (same as page requests).
 */
export async function verifyAdmin(): Promise<AdminAuthResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { authorized: false, userId: null, error: 'Not authenticated' };
    }

    const { data: adminRow } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!adminRow) {
      return {
        authorized: false,
        userId: user.id,
        error: 'Not authorized as admin',
      };
    }

    return { authorized: true, userId: user.id };
  } catch {
    return { authorized: false, userId: null, error: 'Auth check failed' };
  }
}
