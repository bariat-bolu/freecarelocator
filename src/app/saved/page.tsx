'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthHeader from '@/components/AuthHeader';
import SavedClinicCard from '@/components/SavedClinicCard';
import { createClient } from '@/lib/supabase/client';
import type { Clinic } from '@/types/clinic';

export default function SavedPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // 1. Check authentication
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUserId(user.id);

      // 2. Fetch saved clinics by joining saved_clinics → clinics
      const { data, error: dbError } = await supabase
        .from('saved_clinics')
        .select(
          `
          clinic_id,
          created_at,
          clinics (*)
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (dbError) {
        setError(dbError.message);
      } else if (data) {
        // Extract the nested clinic objects
        const extracted = data
          .map((row: any) => row.clinics as Clinic)
          .filter(Boolean);
        setClinics(extracted);
      }

      setLoading(false);
    }

    load();
  }, [router]);

  function handleRemoved(clinicId: string) {
    setClinics((prev) => prev.filter((c) => c.id !== clinicId));
  }

  return (
    <div className="bg-sage-bg flex min-h-screen flex-col">
      <AuthHeader />

      <main className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-2xl">
          {/* Page header */}
          <div className="mb-8">
            <Link
              href="/"
              className="text-sage-text/50 hover:text-sage-primary mb-4 inline-flex items-center gap-1.5 text-sm transition-colors"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 19l-7-7 7-7" />
              </svg>
              Back to search
            </Link>
            <h1 className="font-display text-sage-text text-2xl font-bold sm:text-3xl">
              Saved clinics
            </h1>
            <p className="text-sage-text/50 mt-1 text-sm">
              Clinics you&apos;ve bookmarked for quick access.
            </p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="border-sage-muted/40 animate-pulse rounded-2xl border bg-white p-5"
                >
                  <div className="bg-sage-muted/30 h-5 w-2/3 rounded-lg" />
                  <div className="bg-sage-muted/20 mt-3 h-4 w-1/2 rounded-lg" />
                  <div className="mt-3 flex gap-2">
                    <div className="bg-sage-muted/15 h-6 w-20 rounded-lg" />
                    <div className="bg-sage-muted/15 h-6 w-16 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
              <p className="text-sm font-medium text-red-700">
                Failed to load saved clinics
              </p>
              <p className="mt-1 text-sm text-red-600/70">{error}</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && clinics.length === 0 && (
            <div className="border-sage-muted/40 rounded-2xl border bg-white px-6 py-14 text-center">
              <svg
                className="text-sage-muted/40 mx-auto h-12 w-12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
              <p className="font-display text-sage-text mt-4 text-lg font-semibold">
                No saved clinics yet
              </p>
              <p className="text-sage-text/50 mt-1 text-sm">
                Search for clinics and tap the heart icon to save them here.
              </p>
              <Link
                href="/"
                className="bg-sage-primary hover:bg-sage-primary/90 mt-6 inline-block rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-colors"
              >
                Find clinics
              </Link>
            </div>
          )}

          {/* Clinic list */}
          {!loading && !error && clinics.length > 0 && userId && (
            <div className="space-y-3">
              <p className="text-sage-text/50 text-sm">
                {clinics.length} {clinics.length === 1 ? 'clinic' : 'clinics'}{' '}
                saved
              </p>
              {clinics.map((clinic) => (
                <SavedClinicCard
                  key={clinic.id}
                  clinic={clinic}
                  userId={userId}
                  onRemoved={handleRemoved}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-sage-muted/40 border-t px-6 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sage-text/40 text-xs">
            &copy; {new Date().getFullYear()} FreeCare Locator. Not a substitute
            for professional medical advice.
          </p>
          <p className="text-sage-text/40 text-xs">
            Data sourced from HRSA, SC DHEC &amp; NAFC.
          </p>
        </div>
      </footer>
    </div>
  );
}
