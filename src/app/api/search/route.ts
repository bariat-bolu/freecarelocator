import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { geocode } from '@/lib/geocode';
import { searchRateLimiter } from '@/lib/rate-limit';
import type { Clinic, SearchResponse } from '@/types/clinic';

// ── Zod schema: strict validation of every query param ──────────────────

const searchParamsSchema = z.object({
  q: z
    .string()
    .min(1, 'Search query is required')
    .max(100, 'Query too long')
    .transform((s) => s.trim()),
  radius: z.coerce
    .number()
    .min(1, 'Radius must be at least 1 mile')
    .max(200, 'Radius must be 200 miles or less')
    .default(10),
  services: z
    .string()
    .optional()
    .transform((s) =>
      s
        ? s
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
        : []
    ),
  languages: z
    .string()
    .optional()
    .transform((s) =>
      s
        ? s
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
        : []
    ),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50, 'Limit must be 50 or less')
    .default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── State lookup map ────────────────────────────────────────────────────

const STATE_LOOKUP: Record<string, string> = {
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

function resolveState(input: string): string | null {
  const trimmed = input.trim().toUpperCase();
  return STATE_LOOKUP[trimmed] || null;
}

// ── Helper: extract client IP ───────────────────────────────────────────

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

// ── GET /api/search ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // 1. Rate limit
  const ip = getClientIp(request);
  const rl = searchRateLimiter.check(ip);

  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests. Please wait a moment and try again.',
        retry_after_seconds: Math.ceil((rl.resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': '30',
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // 2. Parse + validate query params
  const rawParams = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = searchParamsSchema.safeParse(rawParams);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid search parameters',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { q, radius, services, languages, limit, offset } = parsed.data;

  try {
    const supabase = await createClient();
    let results: Clinic[] = [];
    let geoInfo: SearchResponse['geo'] = null;

    // 3. Check if this is a state-only search
    const stateAbbr = resolveState(q);
    if (stateAbbr) {
      let stateQuery = supabase
        .from('clinics')
        .select('*')
        .eq('is_approved', true)
        .eq('state', stateAbbr)
        .order('name');

      if (services.length > 0) {
        stateQuery = stateQuery.overlaps('services', services);
      }
      if (languages.length > 0) {
        stateQuery = stateQuery.overlaps('languages', languages);
      }

      stateQuery = stateQuery.range(offset, offset + limit);

      const { data, error } = await stateQuery;

      if (error) {
        console.error('State search error:', error);
        return NextResponse.json(
          { error: 'Search failed. Please try again.' },
          { status: 500 }
        );
      }

      results = (data as Clinic[]) || [];

      const has_more = results.length > limit;
      if (has_more) {
        results = results.slice(0, limit);
      }

      results = deduplicateResults(results);

      const response: SearchResponse = {
        results,
        pagination: { limit, offset, count: results.length, has_more },
        geo: null,
      };

      return NextResponse.json(response, {
        status: 200,
        headers: {
          'X-RateLimit-Limit': '30',
          'X-RateLimit-Remaining': String(rl.remaining),
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      });
    }

    // 4. Geocode the query to get a center point
    const geo = await geocode(q);

    if (geo) {
      // ── Geo radius search via PostGIS RPC ──
      const { data, error } = await supabase.rpc('search_clinics_by_location', {
        lat: geo.lat,
        lon: geo.lon,
        radius_miles: radius,
        filter_services: services,
        filter_languages: languages,
        result_limit: limit + 1,
        result_offset: offset,
      });

      if (error) {
        console.error('RPC search error:', error);
        return NextResponse.json(
          { error: 'Search failed. Please try again.' },
          { status: 500 }
        );
      }

      results = (data as Clinic[]) || [];
      geoInfo = { lat: geo.lat, lon: geo.lon, radius_miles: radius };
    } else {
      // ── Fallback: text-based search ──
      let query = supabase
        .from('clinics')
        .select('*')
        .eq('is_approved', true)
        .ilike('city', `%${q}%`)
        .order('name');

      if (services.length > 0) {
        query = query.overlaps('services', services);
      }
      if (languages.length > 0) {
        query = query.overlaps('languages', languages);
      }

      query = query.range(offset, offset + limit);

      const { data, error } = await query;

      if (error) {
        console.error('Fallback search error:', error);
        return NextResponse.json(
          { error: 'Search failed. Please try again.' },
          { status: 500 }
        );
      }

      results = (data as Clinic[]) || [];
    }

    // 5. Determine pagination
    const has_more = results.length > limit;
    if (has_more) {
      results = results.slice(0, limit);
    }

    // 6. Deduplicate cross-source matches
    results = deduplicateResults(results);

    // 7. Build response
    const response: SearchResponse = {
      results,
      pagination: {
        limit,
        offset,
        count: results.length,
        has_more,
      },
      geo: geoInfo,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'X-RateLimit-Limit': '30',
        'X-RateLimit-Remaining': String(rl.remaining),
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    console.error('Unexpected search error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}

/**
 * Deduplicate clinics that appear in multiple sources.
 * Groups by normalized name + zip and keeps the row with the most data.
 */
function deduplicateResults(clinics: Clinic[]): Clinic[] {
  const seen = new Map<string, Clinic>();

  for (const clinic of clinics) {
    const key =
      (clinic.name || '').toLowerCase().replace(/[^a-z0-9]/g, '') +
      '|' +
      (clinic.zip || '');

    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, clinic);
      continue;
    }

    const existingScore = completenessScore(existing);
    const newScore = completenessScore(clinic);

    if (newScore > existingScore) {
      seen.set(key, clinic);
    }
  }

  return Array.from(seen.values());
}

function completenessScore(c: Clinic): number {
  let score = 0;
  if (c.phone) score++;
  if (c.website) score++;
  if (c.email) score++;
  if (c.hours_json) score++;
  if (c.eligibility) score++;
  if (c.cost) score++;
  if (c.docs_needed) score++;
  if (c.description) score++;
  if (c.services && c.services.length > 0) score += c.services.length;
  if (c.languages && c.languages.length > 1) score++;
  if (c.latitude != null) score++;
  return score;
}
