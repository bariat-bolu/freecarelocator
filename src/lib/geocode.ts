import { createAdminClient } from '@/lib/supabase/admin';

interface GeoResult {
  lat: number;
  lon: number;
}

const STATE_MAP: Record<string, string> = {
  ALABAMA: 'AL',
  ALASKA: 'AK',
  ARIZONA: 'AZ',
  ARKANSAS: 'AR',
  CALIFORNIA: 'CA',
  COLORADO: 'CO',
  CONNECTICUT: 'CT',
  DELAWARE: 'DE',
  FLORIDA: 'FL',
  GEORGIA: 'GA',
  HAWAII: 'HI',
  IDAHO: 'ID',
  ILLINOIS: 'IL',
  INDIANA: 'IN',
  IOWA: 'IA',
  KANSAS: 'KS',
  KENTUCKY: 'KY',
  LOUISIANA: 'LA',
  MAINE: 'ME',
  MARYLAND: 'MD',
  MASSACHUSETTS: 'MA',
  MICHIGAN: 'MI',
  MINNESOTA: 'MN',
  MISSISSIPPI: 'MS',
  MISSOURI: 'MO',
  MONTANA: 'MT',
  NEBRASKA: 'NE',
  NEVADA: 'NV',
  'NEW HAMPSHIRE': 'NH',
  'NEW JERSEY': 'NJ',
  'NEW MEXICO': 'NM',
  'NEW YORK': 'NY',
  'NORTH CAROLINA': 'NC',
  'NORTH DAKOTA': 'ND',
  OHIO: 'OH',
  OKLAHOMA: 'OK',
  OREGON: 'OR',
  PENNSYLVANIA: 'PA',
  'RHODE ISLAND': 'RI',
  'SOUTH CAROLINA': 'SC',
  'SOUTH DAKOTA': 'SD',
  TENNESSEE: 'TN',
  TEXAS: 'TX',
  UTAH: 'UT',
  VERMONT: 'VT',
  VIRGINIA: 'VA',
  WASHINGTON: 'WA',
  'WEST VIRGINIA': 'WV',
  WISCONSIN: 'WI',
  WYOMING: 'WY',
  'DISTRICT OF COLUMBIA': 'DC',
  AL: 'AL',
  AK: 'AK',
  AZ: 'AZ',
  AR: 'AR',
  CA: 'CA',
  CO: 'CO',
  CT: 'CT',
  DE: 'DE',
  FL: 'FL',
  GA: 'GA',
  HI: 'HI',
  ID: 'ID',
  IL: 'IL',
  IN: 'IN',
  IA: 'IA',
  KS: 'KS',
  KY: 'KY',
  LA: 'LA',
  ME: 'ME',
  MD: 'MD',
  MA: 'MA',
  MI: 'MI',
  MN: 'MN',
  MS: 'MS',
  MO: 'MO',
  MT: 'MT',
  NE: 'NE',
  NV: 'NV',
  NH: 'NH',
  NJ: 'NJ',
  NM: 'NM',
  NY: 'NY',
  NC: 'NC',
  ND: 'ND',
  OH: 'OH',
  OK: 'OK',
  OR: 'OR',
  PA: 'PA',
  RI: 'RI',
  SC: 'SC',
  SD: 'SD',
  TN: 'TN',
  TX: 'TX',
  UT: 'UT',
  VT: 'VT',
  VA: 'VA',
  WA: 'WA',
  WV: 'WV',
  WI: 'WI',
  WY: 'WY',
  DC: 'DC',
};

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

  // Check if input is a state abbreviation or full state name
  const trimmedUpper = input.trim().toUpperCase();
  const stateAbbr = STATE_MAP[trimmedUpper] || null;

  if (stateAbbr) {
    const { data } = await supabase
      .from('clinics')
      .select('latitude, longitude')
      .eq('is_approved', true)
      .eq('state', stateAbbr)
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

  // Check if last part looks like a state abbreviation or full name
  if (parts.length >= 2) {
    // Try last word as 2-letter abbreviation
    const lastPart = parts[parts.length - 1].toUpperCase();
    if (STATE_MAP[lastPart]) {
      state = STATE_MAP[lastPart];
      city = parts.slice(0, -1).join(' ');
    }
    // Try last two words as full state name (e.g. "New York", "South Carolina")
    if (!state && parts.length >= 3) {
      const lastTwo = (
        parts[parts.length - 2] +
        ' ' +
        parts[parts.length - 1]
      ).toUpperCase();
      if (STATE_MAP[lastTwo]) {
        state = STATE_MAP[lastTwo];
        city = parts.slice(0, -2).join(' ');
      }
    }
  }

  // If state is provided, search with it
  if (state) {
    const { data } = await supabase
      .from('clinics')
      .select('latitude, longitude')
      .eq('is_approved', true)
      .ilike('city', `%${city}%`)
      .eq('state', state)
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
