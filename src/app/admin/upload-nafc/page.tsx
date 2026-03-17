'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import AuthHeader from '@/components/AuthHeader';

interface UploadResult {
  success?: boolean;
  error?: string;
  total_csv_rows?: number;
  valid_rows?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  parse_errors?: string[];
  ingestion_errors?: string[];
  [key: string]: unknown;
}

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export default function UploadNafcPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setClientError(null);
    setResult(null);
    const selected = e.target.files?.[0] || null;

    if (selected) {
      // Client-side validation
      if (!selected.name.endsWith('.csv')) {
        setClientError('Only .csv files are accepted.');
        setFile(null);
        return;
      }
      if (selected.size > MAX_SIZE_BYTES) {
        setClientError(`File too large. Maximum size is ${MAX_SIZE_MB} MB.`);
        setFile(null);
        return;
      }
    }

    setFile(selected);
  }

  async function handleUpload() {
    if (!file) return;

    setLoading(true);
    setResult(null);
    setClientError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/sync/nafc-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: 'Network error — could not reach server.' });
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFile(null);
    setResult(null);
    setClientError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <div className="bg-sage-bg flex min-h-screen flex-col">
      <AuthHeader />

      <main className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-2xl">
          {/* Back link */}
          <Link
            href="/admin"
            className="text-sage-text/50 hover:text-sage-primary mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
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
            Back to admin dashboard
          </Link>

          <h1 className="font-display text-sage-text text-2xl font-bold">
            Upload NAFC CSV
          </h1>
          <p className="text-sage-text/50 mt-1 text-sm">
            Upload a CSV from the National Association of Free &amp; Charitable
            Clinics. Records will be upserted and require manual approval.
          </p>

          {/* Expected format */}
          <div className="border-sage-muted/30 mt-6 rounded-xl border bg-white p-4">
            <h3 className="text-sage-text/40 text-xs font-medium tracking-wider uppercase">
              Expected CSV columns
            </h3>
            <p className="text-sage-text/60 mt-1 text-sm">
              name (required), address, city, state, zip, phone, website, hours,
              services, eligibility, languages, latitude, longitude
            </p>
          </div>

          {/* Upload area */}
          <div className="border-sage-muted/40 mt-6 rounded-2xl border bg-white p-6 shadow-sm">
            <div className="border-sage-muted/40 flex flex-col items-center rounded-xl border-2 border-dashed px-6 py-10">
              <svg
                className="text-sage-muted/50 mb-3 h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="text-sage-text/70 file:bg-sage-primary hover:file:bg-sage-primary/90 text-sm file:mr-3 file:rounded-lg file:border-0 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
              />

              {file && (
                <p className="text-sage-text/60 mt-3 text-sm">
                  Selected: <strong>{file.name}</strong> (
                  {(file.size / 1024).toFixed(1)} KB)
                </p>
              )}

              {clientError && (
                <p className="mt-3 text-sm text-red-600">{clientError}</p>
              )}
            </div>

            {/* Upload button */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className="bg-sage-primary hover:bg-sage-primary/90 flex-1 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
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
                    Processing…
                  </span>
                ) : (
                  'Upload & Process'
                )}
              </button>

              {(file || result) && (
                <button
                  onClick={handleReset}
                  className="border-sage-muted text-sage-text/70 hover:border-sage-primary hover:text-sage-primary rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="border-sage-muted/40 mt-6 rounded-2xl border bg-white p-6 shadow-sm">
              {result.error && !result.success ? (
                <div>
                  <p className="font-medium text-red-600">{result.error}</p>
                  {result.parse_errors && result.parse_errors.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-red-500">
                        Parse errors ({result.parse_errors.length})
                      </summary>
                      <ul className="mt-1 space-y-0.5 text-xs text-red-500/80">
                        {result.parse_errors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="font-display text-sage-primary text-lg font-semibold">
                    Upload complete
                  </p>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatBox label="CSV rows" value={result.total_csv_rows} />
                    <StatBox label="Valid" value={result.valid_rows} />
                    <StatBox label="Created" value={result.created} />
                    <StatBox label="Updated" value={result.updated} />
                  </div>

                  {result.skipped != null && result.skipped > 0 && (
                    <p className="text-sage-text/50 text-sm">
                      {result.skipped} row(s) skipped (unchanged or errors).
                    </p>
                  )}

                  <p className="text-sm text-amber-600">
                    NAFC records are created with is_approved = false. Review
                    and approve them in the Supabase Table Editor.
                  </p>

                  {result.parse_errors && result.parse_errors.length > 0 && (
                    <details>
                      <summary className="cursor-pointer text-sm text-red-500">
                        Parse errors ({result.parse_errors.length})
                      </summary>
                      <ul className="mt-1 space-y-0.5 text-xs text-red-500/80">
                        {result.parse_errors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {result.ingestion_errors &&
                    result.ingestion_errors.length > 0 && (
                      <details>
                        <summary className="cursor-pointer text-sm text-red-500">
                          Ingestion errors ({result.ingestion_errors.length})
                        </summary>
                        <ul className="mt-1 space-y-0.5 text-xs text-red-500/80">
                          {result.ingestion_errors.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatBox({
  label,
  value,
}: {
  label: string;
  value: number | undefined;
}) {
  return (
    <div className="bg-sage-bg rounded-xl p-3 text-center">
      <p className="font-display text-sage-text text-xl font-bold">
        {value ?? '—'}
      </p>
      <p className="text-sage-text/50 text-xs">{label}</p>
    </div>
  );
}
