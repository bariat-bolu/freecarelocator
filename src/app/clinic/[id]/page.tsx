import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Clinic, HoursJson } from '@/types/clinic';
import AuthHeader from '@/components/AuthHeader';
import SaveButton from '@/components/SaveButton';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClinicDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Validate UUID format to prevent injection
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: clinic, error } = await supabase
    .from('clinics')
    .select('*')
    .eq('id', id)
    .eq('is_approved', true)
    .single();

  if (error || !clinic) {
    notFound();
  }

  const c = clinic as Clinic;

  const address = [c.address_line1, c.address_line2, c.city, c.state, c.zip]
    .filter(Boolean)
    .join(', ');

  const updatedDate = new Date(c.updated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="bg-sage-bg flex min-h-screen flex-col">
      <AuthHeader />

      <main className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-2xl">
          {/* Back link */}
          <Link
            href="/"
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
            Back to search
          </Link>

          {/* Clinic card */}
          <div className="border-sage-muted/40 rounded-2xl border bg-white shadow-sm">
            {/* Header */}
            <div className="border-sage-muted/30 border-b px-6 py-6 sm:px-8">
              <div className="flex items-start justify-between gap-3">
                <h1 className="font-display text-sage-text text-2xl font-bold sm:text-3xl">
                  {c.name}
                </h1>
                <span className="bg-sage-bg text-sage-text/40 shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium tracking-wider uppercase">
                  {c.source}
                </span>
              </div>
              {c.description && (
                <p className="text-sage-text/60 mt-2">{c.description}</p>
              )}
              {/* Save button */}
              <div className="mt-4">
                <SaveButton clinicId={c.id} variant="detail" />
              </div>
            </div>

            {/* Body */}
            <div className="space-y-6 px-6 py-6 sm:px-8">
              {/* Address */}
              {address && (
                <DetailSection icon="location" label="Address">
                  <p className="text-sage-text">{address}</p>
                  {c.county && (
                    <p className="text-sage-text/50 mt-0.5 text-sm">
                      {c.county} County
                    </p>
                  )}
                </DetailSection>
              )}

              {/* Phone */}
              {c.phone && (
                <DetailSection icon="phone" label="Phone">
                  <a
                    href={`tel:${c.phone}`}
                    className="text-sage-primary hover:underline"
                  >
                    {c.phone}
                  </a>
                </DetailSection>
              )}

              {/* Website */}
              {c.website && (
                <DetailSection icon="link" label="Website">
                  <a
                    href={c.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sage-primary break-all hover:underline"
                  >
                    {c.website.replace(/^https?:\/\//, '')}
                  </a>
                </DetailSection>
              )}

              {/* Hours */}
              {c.hours_json && Object.keys(c.hours_json).length > 0 && (
                <DetailSection icon="clock" label="Hours">
                  <dl className="space-y-1">
                    {Object.entries(c.hours_json as HoursJson).map(
                      ([day, hours]) => (
                        <div
                          key={day}
                          className="flex justify-between gap-4 text-sm"
                        >
                          <dt className="text-sage-text/70 font-medium">
                            {day}
                          </dt>
                          <dd className="text-sage-text">{hours}</dd>
                        </div>
                      )
                    )}
                  </dl>
                </DetailSection>
              )}

              {/* Services */}
              {c.services.length > 0 && (
                <DetailSection icon="services" label="Services">
                  <div className="flex flex-wrap gap-2">
                    {c.services.map((service) => (
                      <span
                        key={service}
                        className="bg-sage-accent/15 text-sage-primary rounded-xl px-3 py-1 text-sm font-medium"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </DetailSection>
              )}

              {/* Languages */}
              {c.languages.length > 0 && (
                <DetailSection icon="language" label="Languages">
                  <div className="flex flex-wrap gap-2">
                    {c.languages.map((lang) => (
                      <span
                        key={lang}
                        className="bg-sage-bg text-sage-text/70 rounded-xl px-3 py-1 text-sm"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </DetailSection>
              )}

              {/* Eligibility */}
              {c.eligibility && (
                <DetailSection icon="eligibility" label="Eligibility">
                  <p className="text-sage-text">{c.eligibility}</p>
                </DetailSection>
              )}

              {/* Cost */}
              <DetailSection icon="cost" label="Cost">
                <div className="space-y-1">
                  {c.cost ? (
                    <p className="text-sage-text">{c.cost}</p>
                  ) : (
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {c.accepts_uninsured && (
                        <span className="text-sage-primary flex items-center gap-1.5 text-sm">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Accepts uninsured
                        </span>
                      )}
                      {c.sliding_scale && (
                        <span className="text-sage-text/60 flex items-center gap-1.5 text-sm">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Sliding scale fees
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </DetailSection>

              {/* Docs needed */}
              {c.docs_needed && (
                <DetailSection icon="doc" label="Documents needed">
                  <p className="text-sage-text">{c.docs_needed}</p>
                </DetailSection>
              )}
            </div>

            {/* Footer metadata */}
            <div className="border-sage-muted/30 border-t px-6 py-4 sm:px-8">
              <div className="text-sage-text/40 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span>Source: {c.source}</span>
                <span>·</span>
                <span>Last updated: {updatedDate}</span>
              </div>
            </div>
          </div>
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

// ── Detail Section Helper ───────────────────────────────────────────────

function DetailSection({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3.5">
      <div className="bg-sage-bg mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
        <DetailIcon type={icon} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sage-text/40 mb-1 text-xs font-medium tracking-wider uppercase">
          {label}
        </h3>
        {children}
      </div>
    </div>
  );
}

function DetailIcon({ type }: { type: string }) {
  const cls = 'h-4 w-4 text-sage-accent';
  switch (type) {
    case 'location':
      return (
        <svg
          className={cls}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'phone':
      return (
        <svg
          className={cls}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
        </svg>
      );
    case 'link':
      return (
        <svg
          className={cls}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
      );
    case 'clock':
      return (
        <svg
          className={cls}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
    case 'services':
      return (
        <svg
          className={cls}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4.8 2.449A.75.75 0 015.5 2h13a.75.75 0 01.7.449l2 5A.75.75 0 0120.5 8.5h-17a.75.75 0 01-.7-1.051l2-5zM3.5 10v10a2 2 0 002 2h13a2 2 0 002-2V10" />
        </svg>
      );
    case 'language':
      return (
        <svg
          className={cls}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9 15.3 15.3 0 01-4-9 15.3 15.3 0 014-9z" />
        </svg>
      );
    case 'eligibility':
      return (
        <svg
          className={cls}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      );
    case 'cost':
      return (
        <svg
          className={cls}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      );
    case 'doc':
      return (
        <svg
          className={cls}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </svg>
      );
    default:
      return null;
  }
}
