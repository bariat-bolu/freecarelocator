import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeZip } from './normalize';

interface BackfillResult {
  total: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Sleep helper to respect Nominatim's 1 req/sec rate limit.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reverse geocode a single lat/lon pair using OpenStreetMap Nominatim.
 * Returns the ZIP code or null if not found.
 *
 * Nominatim usage policy:
 * - Max 1 request per second
 * - Must include a valid User-Agent
 * - Free, no API key needed
 */
async function reverseGeocodeZip(
  lat: number,
  lon: number
): Promise<string | null> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode?latitude=${lat}&longitude=${lon}&localityLanguage=en&key=bdc_c7e65fe041484445b339e42a498ea05e`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Geocoder returned ${response.status}`);
  }

  const data = await response.json();
  const postcode = data?.postcode;

  return normalizeZip(postcode);
}

/**
 * Find all clinics with coordinates but no ZIP, reverse geocode them,
 * and update the rows.
 */
export async function backfillMissingZips(): Promise<BackfillResult> {
  const supabase = createAdminClient();

  // Find clinics with lat/lon but no ZIP
  const { data: clinics, error } = await supabase
    .from('clinics')
    .select('id, name, latitude, longitude, zip')
    .is('zip', null)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(45);

  if (error) {
    throw new Error(`Failed to fetch clinics: ${error.message}`);
  }

  if (!clinics || clinics.length === 0) {
    return { total: 0, updated: 0, skipped: 0, errors: [] };
  }

  const result: BackfillResult = {
    total: clinics.length,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const clinic of clinics) {
    try {
      const zip = await reverseGeocodeZip(
        clinic.latitude as number,
        clinic.longitude as number
      );

      if (!zip) {
        result.skipped++;
        continue;
      }

      // Update the clinic row
      const { error: updateError } = await supabase
        .from('clinics')
        .update({
          zip,
          // Also update the location field if it's missing
          location:
            clinic.latitude != null && clinic.longitude != null
              ? `SRID=4326;POINT(${clinic.longitude} ${clinic.latitude})`
              : undefined,
        })
        .eq('id', clinic.id);

      if (updateError) {
        result.errors.push(`${clinic.name}: ${updateError.message}`);
        result.skipped++;
      } else {
        result.updated++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push(`${clinic.name}: ${msg}`);
      result.skipped++;
    }

    // Respect Nominatim rate limit: 1 request per second
    await sleep(300);
  }

  return result;
}
