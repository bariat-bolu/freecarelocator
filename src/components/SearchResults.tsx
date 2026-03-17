import type { Clinic } from '@/types/clinic';
import ClinicCard from './ClinicCard';

interface SearchResultsProps {
  clinics: Clinic[];
  loading: boolean;
  error: string | null;
  hasSearched: boolean;
}

export default function SearchResults({
  clinics,
  loading,
  error,
  hasSearched,
}: SearchResultsProps) {
  // Loading state
  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
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
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
          <svg
            className="mx-auto h-10 w-10 text-red-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <p className="mt-3 text-sm font-medium text-red-700">
            Something went wrong
          </p>
          <p className="mt-1 text-sm text-red-600/70">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state — before searching
  if (!hasSearched) {
    return (
      <div className="mx-auto w-full max-w-2xl text-center">
        <div className="py-8">
          <svg
            className="text-sage-muted/50 mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1"
          >
            <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sage-text/40 mt-3 text-sm">
            Enter a city or ZIP code above to find clinics near you.
          </p>
        </div>
      </div>
    );
  }

  // Empty state — no results
  if (clinics.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl text-center">
        <div className="border-sage-muted/40 rounded-2xl border bg-white px-6 py-10">
          <svg
            className="text-sage-muted/40 mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1"
          >
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="font-display text-sage-text mt-3 text-lg font-semibold">
            No clinics found
          </p>
          <p className="text-sage-text/50 mt-1 text-sm">
            Try a different location, a larger radius, or fewer filters.
          </p>
        </div>
      </div>
    );
  }

  // Results
  return (
    <div className="mx-auto w-full max-w-2xl">
      <p className="text-sage-text/50 mb-4 text-sm">
        {clinics.length} {clinics.length === 1 ? 'clinic' : 'clinics'} found
      </p>
      <div className="space-y-3">
        {clinics.map((clinic) => (
          <ClinicCard key={clinic.id} clinic={clinic} />
        ))}
      </div>
    </div>
  );
}
