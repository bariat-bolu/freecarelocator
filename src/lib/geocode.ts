import { createAdminClient } from '@/lib/supabase/admin';

interface GeoResult {
  lat: number;
  lon: number;
}

export async function geocode(input: string): Promise<GeoResult | null> {
  const supabase = createAdminClient();
  const isZip = /^\d{5}$/.test(input);

  if (isZip) {
    const { data } = await supabase
      .from('clinics')
      .select('latitude, longitude')
      .eq('is_approved', true)
      .eq('zip', input)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(100);

    if (!data || data.length === 0) return null;
    return computeCentroid(data);
  }

  // Check if input is a 2-letter state abbreviation
  const trimmedUpper = input.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(trimmedUpper)) {
    const { data } = await supabase
      .from('clinics')
      .select('latitude, longitude')
      .eq('is_approved', true)
      .ilike('state', trimmedUpper)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(200);

    if (data && data.length > 0) return computeCentroid(data);
    return null;
  }

  // Parse "city, state" format (e.g. "Columbia, SC" or "Columbia SC")
  const parts = input
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  let city = input.trim();
  let state: string | null = null;

  // Check if last part looks like a 2-letter state abbreviation
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].toUpperCase();
    if (/^[A-Z]{2}$/.test(lastPart)) {
      state = lastPart;
      city = parts.slice(0, -1).join(' ');
    }
  }

  // If state is provided, search with it
  if (state) {
    const { data } = await supabase
      .from('clinics')
      .select('latitude, longitude')
      .eq('is_approved', true)
      .ilike('city', `%${city}%`)
      .ilike('state', state)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(100);

    if (data && data.length > 0) return computeCentroid(data);
  }

  // No state provided — search all, but return results grouped by state
  // and pick the state with the most clinics (likely the intended one)
  const { data } = await supabase
    .from('clinics')
    .select('latitude, longitude, state')
    .eq('is_approved', true)
    .ilike('city', `%${city}%`)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(500);

  if (!data || data.length === 0) return null;

  // Group by state and find the state with the most matches
  const byState = new Map<string, typeof data>();
  for (const row of data) {
    const s = (row.state || 'unknown').toUpperCase();
    if (!byState.has(s)) byState.set(s, []);
    byState.get(s)!.push(row);
  }

  // Pick the state with the most clinics
  let bestState = data;
  let bestCount = 0;
  for (const [, rows] of byState) {
    if (rows.length > bestCount) {
      bestCount = rows.length;
      bestState = rows;
    }
  }

  return computeCentroid(bestState);
}

function computeCentroid(
  data: { latitude: unknown; longitude: unknown }[]
): GeoResult {
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
