'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LogoutPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function signOut() {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        setError(error.message);
        return;
      }

      router.push('/');
      router.refresh();
    }

    signOut();
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="border-sage-muted/40 w-full max-w-sm rounded-2xl border bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-red-700">Sign out failed: {error}</p>
          <button
            onClick={() => router.push('/')}
            className="text-sage-primary mt-4 text-sm font-medium hover:underline"
          >
            Return home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <p className="text-sage-text/60 text-sm">Signing out…</p>
    </div>
  );
}
