'use client';

interface SearchBarProps {
  query: string;
  radius: number;
  onQueryChange: (value: string) => void;
  onRadiusChange: (value: number) => void;
  onSearch: () => void;
  loading: boolean;
}

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

export default function SearchBar({
  query,
  radius,
  onQueryChange,
  onRadiusChange,
  onSearch,
  loading,
}: SearchBarProps) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') onSearch();
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Search input */}
        <div className="relative flex-1">
          <svg
            className="text-sage-muted absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="City, ZIP code, or clinic name…"
            aria-label="Search by city, ZIP code, or clinic name"
            className="border-sage-muted text-sage-text placeholder:text-sage-muted focus:border-sage-primary focus:ring-sage-primary/20 w-full rounded-2xl border bg-white py-3.5 pr-4 pl-12 shadow-sm focus:ring-2 focus:outline-none"
          />
        </div>

        {/* Radius select */}
        <div className="flex gap-3">
          <div className="relative">
            <select
              value={radius}
              onChange={(e) => onRadiusChange(Number(e.target.value))}
              aria-label="Search radius in miles"
              className="border-sage-muted text-sage-text focus:border-sage-primary focus:ring-sage-primary/20 h-full appearance-none rounded-2xl border bg-white py-3.5 pr-10 pl-4 text-sm shadow-sm focus:ring-2 focus:outline-none"
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r} mi
                </option>
              ))}
            </select>
            <svg
              className="text-sage-muted pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>

          {/* Search button */}
          <button
            onClick={onSearch}
            disabled={loading}
            className="bg-sage-primary hover:bg-sage-primary/90 focus:ring-sage-primary/20 rounded-2xl px-6 py-3.5 text-sm font-medium text-white shadow-sm transition-colors focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <svg
                className="h-5 w-5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              'Search'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
