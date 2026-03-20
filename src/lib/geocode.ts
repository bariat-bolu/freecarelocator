import { createAdminClient } from '@/lib/supabase/admin';

interface GeoResult {
  lat: number;
  lon: number;
}

/**
 * Resolve a ZIP code or city name to coordinates.
 *
 * Strategy:
 * 1. If input is a 5-digit ZIP, look up the centroid of clinics with that ZIP.
 * 2. If input is a city name, look up the centroid of clinics in that city.
 * 3. Returns null if no matching clinics are found.
 *
 * This avoids an external geocoding API dependency for v1 by using our own
 * clinic data as the coordinate source.
 */
export async function geocode(input: string): Promise<GeoResult | null> {
  const supabase = createAdminClient();
  const isZip = /^\d{5}$/.test(input);

  let query = supabase
    .from('clinics')
    .select('latitude, longitude')
    .eq('is_approved', true)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (isZip) {
    query = query.eq('zip', input);
  } else {
    query = query.ilike('city', `%${input}%`);
  }

  const { data } = await query.limit(100);

  if (!data || data.length === 0) return null;

  const sum = data.reduce(
    (acc, row) => ({
      lat: acc.lat + (row.latitude as number),
      lon: acc.lon + (row.longitude as number),
    }),
    { lat: 0, lon: 0 }
  );

  return {
    lat: sum.lat / data.length,
    lon: sum.lon / data.length,
  };
}
