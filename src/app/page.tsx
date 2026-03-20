'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthHeader from '@/components/AuthHeader';
import SearchBar from '@/components/SearchBar';
import ClinicFilters from '@/components/ClinicFilters';
import SearchResults from '@/components/SearchResults';
import type { Clinic, SearchResponse } from '@/types/clinic';

function HomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get('q') || '';
  const initialRadius = Number(searchParams.get('radius')) || 10;
  const initialServices =
    searchParams.get('services')?.split(',').filter(Boolean) || [];
  const initialLanguages =
    searchParams.get('languages')?.split(',').filter(Boolean) || [];

  const [query, setQuery] = useState(initialQuery);
  const [radius, setRadius] = useState(initialRadius);
  const [services, setServices] = useState<string[]>(initialServices);
  const [languages, setLanguages] = useState<string[]>(initialLanguages);

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState<
    SearchResponse['pagination'] | null
  >(null);

  const updateUrl = useCallback(
    (q: string, r: number, svc: string[], lang: string[]) => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (r !== 10) params.set('radius', String(r));
      if (svc.length > 0) params.set('services', svc.join(','));
      if (lang.length > 0) params.set('languages', lang.join(','));

      const paramString = params.toString();
      const newUrl = paramString ? `/?${paramString}` : '/';
      router.replace(newUrl, { scroll: false });
    },
    [router]
  );

  /**
   * Runs a search. When called with explicit params (from the mount effect),
   * uses those. Otherwise reads from React state (for user-triggered searches).
   */
  async function runSearch(opts?: {
    q: string;
    r: number;
    svc: string[];
    lang: string[];
    offset: number;
  }) {
    const q = opts?.q ?? query.trim();
    const r = opts?.r ?? radius;
    const svc = opts?.svc ?? services;
    const lang = opts?.lang ?? languages;
    const offset = opts?.offset ?? 0;

    if (!q) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        q,
        radius: String(r),
        limit: '20',
        offset: String(offset),
      });

      if (svc.length > 0) params.set('services', svc.join(','));
      if (lang.length > 0) params.set('languages', lang.join(','));

      const res = await fetch(`/api/search?${params.toString()}`);

      if (res.status === 429) {
        setError(
          'You\u2019re searching too quickly. Please wait a moment and try again.'
        );
        setClinics([]);
        setPagination(null);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Search failed (${res.status})`);
        setClinics([]);
        setPagination(null);
        return;
      }

      const data: SearchResponse = await res.json();

      if (offset === 0) {
        setClinics(data.results);
      } else {
        setClinics((prev) => [...prev, ...data.results]);
      }

      setPagination(data.pagination);
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setClinics([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(offset = 0) {
    const trimmed = query.trim();
    if (!trimmed) return;
    updateUrl(trimmed, radius, services, languages);
    runSearch({
      q: trimmed,
      r: radius,
      svc: services,
      lang: languages,
      offset,
    });
  }

  function handleLoadMore() {
    if (pagination) {
      handleSearch(pagination.offset + pagination.limit);
    }
  }

  function clearFilters() {
    setServices([]);
    setLanguages([]);
  }

  // On mount: if URL has a query, re-run the search using URL values directly
  useEffect(() => {
    if (initialQuery.trim()) {
      runSearch({
        q: initialQuery.trim(),
        r: initialRadius,
        svc: initialServices,
        lang: initialLanguages,
        offset: 0,
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFilterCount = services.length + languages.length;

  return (
    <div className="bg-sage-bg flex min-h-screen flex-col">
      <AuthHeader />

      <main className="flex-1">
        <section className="border-sage-muted/30 to-sage-bg border-b bg-gradient-to-b from-white px-6 pt-12 pb-8 sm:pt-16">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-display text-sage-text text-3xl font-bold tracking-tight sm:text-4xl">
              Find care near you
              <span className="text-sage-primary">.</span>
            </h1>
            <p className="text-sage-text/60 mx-auto mt-3 max-w-lg">
              Search free and reduced-cost clinics across South Carolina.
            </p>
          </div>

          <div className="mt-8">
            <SearchBar
              query={query}
              radius={radius}
              onQueryChange={setQuery}
              onRadiusChange={setRadius}
              onSearch={() => handleSearch(0)}
              loading={loading}
            />
          </div>

          <div className="mx-auto mt-4 flex max-w-2xl justify-center">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sage-text/50 hover:text-sage-primary flex items-center gap-1.5 text-sm transition-colors"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 4h18M3 12h18M3 20h18" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-sage-primary flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-4">
              <ClinicFilters
                selectedServices={services}
                selectedLanguages={languages}
                onServicesChange={setServices}
                onLanguagesChange={setLanguages}
                onClear={clearFilters}
              />
            </div>
          )}
        </section>

        <section className="px-6 py-8">
          <SearchResults
            clinics={clinics}
            loading={loading}
            error={error}
            hasSearched={hasSearched}
          />

          {pagination?.has_more && !loading && (
            <div className="mx-auto mt-6 max-w-2xl text-center">
              <button
                onClick={handleLoadMore}
                className="border-sage-muted text-sage-text/70 hover:border-sage-primary hover:text-sage-primary rounded-xl border px-6 py-2.5 text-sm font-medium transition-colors"
              >
                Load more clinics
              </button>
            </div>
          )}
        </section>
      </main>

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

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="bg-sage-bg flex min-h-screen items-center justify-center">
          <p className="text-sage-text/40 text-sm">Loading…</p>
        </div>
      }
    >
      <HomePageInner />
    </Suspense>
  );
}
