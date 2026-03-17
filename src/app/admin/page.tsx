'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthHeader from '@/components/AuthHeader';

interface SyncResult {
  success?: boolean;
  error?: string;
  total?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  errors?: string[];
  [key: string]: unknown;
}

export default function AdminDashboard() {
  const [hrsaResult, setHrsaResult] = useState<SyncResult | null>(null);
  const [scdphResult, setScdphResult] = useState<SyncResult | null>(null);
  const [hrsaLoading, setHrsaLoading] = useState(false);
  const [scdphLoading, setScdphLoading] = useState(false);

  async function handleSync(
    endpoint: string,
    setLoading: (v: boolean) => void,
    setResult: (v: SyncResult) => void
  ) {
    setLoading(true);
    setResult({});
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: 'Network error — could not reach server.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-sage-bg flex min-h-screen flex-col">
      <AuthHeader />

      <main className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-sage-text text-2xl font-bold sm:text-3xl">
            Admin Dashboard
          </h1>
          <p className="text-sage-text/50 mt-1 text-sm">
            Manage data sources and sync clinic records.
          </p>

          {/* ── Sync panels ── */}
          <div className="mt-8 space-y-6">
            {/* HRSA */}
            <SyncPanel
              title="HRSA Health Centers"
              description="Pull all SC health center sites from the HRSA API."
              buttonLabel="Sync HRSA"
              loading={hrsaLoading}
              result={hrsaResult}
              onSync={() =>
                handleSync(
                  '/api/admin/sync/hrsa',
                  setHrsaLoading,
                  setHrsaResult
                )
              }
            />

            {/* SC DPH */}
            <SyncPanel
              title="SC DPH (ArcGIS)"
              description="Pull free clinic data from SC DHEC ArcGIS layer."
              buttonLabel="Sync SC DPH"
              loading={scdphLoading}
              result={scdphResult}
              onSync={() =>
                handleSync(
                  '/api/admin/sync/scdph',
                  setScdphLoading,
                  setScdphResult
                )
              }
            />

            {/* NAFC CSV */}
            <div className="border-sage-muted/40 rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-sage-text text-lg font-semibold">
                    NAFC CSV Upload
                  </h2>
                  <p className="text-sage-text/50 mt-1 text-sm">
                    Upload a CSV file from the National Association of Free
                    &amp; Charitable Clinics.
                  </p>
                </div>
                <Link
                  href="/admin/upload-nafc"
                  className="bg-sage-primary hover:bg-sage-primary/90 shrink-0 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-colors"
                >
                  Upload CSV
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Reusable sync panel ──

function SyncPanel({
  title,
  description,
  buttonLabel,
  loading,
  result,
  onSync,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  loading: boolean;
  result: SyncResult | null;
  onSync: () => void;
}) {
  return (
    <div className="border-sage-muted/40 rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-sage-text text-lg font-semibold">
            {title}
          </h2>
          <p className="text-sage-text/50 mt-1 text-sm">{description}</p>
        </div>
        <button
          onClick={onSync}
          disabled={loading}
          className="bg-sage-primary hover:bg-sage-primary/90 shrink-0 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
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
              Syncing…
            </span>
          ) : (
            buttonLabel
          )}
        </button>
      </div>

      {/* Result display */}
      {result && Object.keys(result).length > 0 && (
        <div className="bg-sage-bg mt-4 rounded-xl p-4">
          {result.error && !result.success ? (
            <p className="text-sm text-red-600">{result.error}</p>
          ) : (
            <div className="space-y-1 text-sm">
              <p className="text-sage-primary font-medium">Sync complete</p>
              <p className="text-sage-text/70">
                Total: {result.total ?? '—'} · Created: {result.created ?? '—'}{' '}
                · Updated: {result.updated ?? '—'} · Skipped:{' '}
                {result.skipped ?? '—'}
              </p>
              {result.errors && result.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-red-500">
                    {result.errors.length} error(s)
                  </summary>
                  <ul className="mt-1 space-y-0.5 text-xs text-red-500/80">
                    {result.errors.map((e, i) => (
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
  );
}
