'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Clinic } from '@/types/clinic';

interface SavedClinicCardProps {
  clinic: Clinic;
  userId: string;
  onRemoved: (clinicId: string) => void;
}

export default function SavedClinicCard({
  clinic,
  userId,
  onRemoved,
}: SavedClinicCardProps) {
  const [removing, setRemoving] = useState(false);

  const address = [clinic.address_line1, clinic.city, clinic.state, clinic.zip]
    .filter(Boolean)
    .join(', ');

  async function handleRemove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setRemoving(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('saved_clinics')
        .delete()
        .eq('user_id', userId)
        .eq('clinic_id', clinic.id);

      if (!error) {
        onRemoved(clinic.id);
      }
    } catch {
      // Silent fail
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Link
      href={`/clinic/${clinic.id}`}
      className={`group border-sage-muted/40 hover:border-sage-accent block rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
        removing ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-sage-text group-hover:text-sage-primary flex-1 text-lg font-semibold">
          {clinic.name}
        </h3>

        {/* Remove button */}
        <button
          onClick={handleRemove}
          disabled={removing}
          aria-label="Remove from saved clinics"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-400 transition-colors hover:bg-red-100 hover:text-red-600"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>
      </div>

      {address && <p className="text-sage-text/60 mt-1.5 text-sm">{address}</p>}

      {clinic.services.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {clinic.services.slice(0, 4).map((service) => (
            <span
              key={service}
              className="bg-sage-accent/15 text-sage-primary rounded-lg px-2.5 py-0.5 text-xs font-medium"
            >
              {service}
            </span>
          ))}
          {clinic.services.length > 4 && (
            <span className="bg-sage-bg text-sage-text/40 rounded-lg px-2.5 py-0.5 text-xs">
              +{clinic.services.length - 4} more
            </span>
          )}
        </div>
      )}

      <div className="text-sage-text/50 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {clinic.phone && (
          <span className="flex items-center gap-1">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
            </svg>
            {clinic.phone}
          </span>
        )}
        {clinic.accepts_uninsured && (
          <span className="text-sage-primary flex items-center gap-1">
            <svg
              className="h-3.5 w-3.5"
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
      </div>
    </Link>
  );
}
