'use client';

import { useState, useCallback } from 'react';
import AuthHeader from '@/components/AuthHeader';
import SearchBar from '@/components/SearchBar';
import ClinicFilters from '@/components/ClinicFilters';
import SearchResults from '@/components/SearchResults';
import type { Clinic, SearchResponse } from '@/types/clinic';

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [radius, setRadius] = useState(10);
  const [services, setServices] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState<
    SearchResponse['pagination'] | null
  >(null);

  const handleSearch = useCallback(
    async (offset = 0) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      setLoading(true);
      setError(null);
      setHasSearched(true);

      try {
        const params = new URLSearchParams({
          q: trimmed,
          radius: String(radius),
          limit: '20',
          offset: String(offset),
        });

        if (services.length > 0) {
          params.set('services', services.join(','));
        }
        if (languages.length > 0) {
          params.set('languages', languages.join(','));
        }

        const res = await fetch(`/api/search?${params.toString()}`);

        if (res.status === 429) {
          setError(
            'You\\u2019re searching too quickly. Please wait a moment and try again.'
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
          // Append for "Load more"
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
    },
    [query, radius, services, languages]
  );

  function handleLoadMore() {
    if (pagination) {
      handleSearch(pagination.offset + pagination.limit);
    }
  }

  function clearFilters() {
    setServices([]);
    setLanguages([]);
  }

  const activeFilterCount = services.length + languages.length;

  return (
    <div className="bg-sage-bg flex min-h-screen flex-col">
      <AuthHeader />

      <main className="flex-1">
        {/* Hero + Search */}
        <section className="border-sage-muted/30 to-sage-bg border-b bg-gradient-to-b from-white px-6 pt-12 pb-8 sm:pt-16">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-display text-sage-text text-3xl font-bold tracking-tight sm:text-4xl">
              Find care near you
              <span className="text-sage-primary">.</span>
            </h1>
            <p className="text-sage-text/60 mx-auto mt-3 max-w-lg">
              Search free and reduced-cost clinics near you.
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

          {/* Filter toggle */}
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

        {/* Results */}
        <section className="px-6 py-8">
          <SearchResults
            clinics={clinics}
            loading={loading}
            error={error}
            hasSearched={hasSearched}
          />

          {/* Load more */}
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
