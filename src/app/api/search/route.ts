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
    // 3. Geocode the query to get a center point
    const geo = await geocode(q);

    const supabase = await createClient();
    let results: Clinic[] = [];
    let geoInfo: SearchResponse['geo'] = null;

    if (geo) {
      // ── Geo radius search via PostGIS RPC ──
      const { data, error } = await supabase.rpc('search_clinics_by_location', {
        lat: geo.lat,
        lon: geo.lon,
        radius_miles: radius,
        filter_services: services,
        filter_languages: languages,
        result_limit: limit + 1, // Fetch one extra to detect has_more
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
      // ── Fallback: text-based search (no geocodable match) ──
      // Try matching clinic names directly as a last resort
      let query = supabase
        .from('clinics')
        .select('*')
        .eq('is_approved', true)
        .ilike('name', `%${q}%`)
        .order('name');

      if (services.length > 0) {
        query = query.overlaps('services', services);
      }
      if (languages.length > 0) {
        query = query.overlaps('languages', languages);
      }

      query = query.range(offset, offset + limit); // Fetch limit+1 for has_more

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

    // 4. Determine pagination
    const has_more = results.length > limit;
    if (has_more) {
      results = results.slice(0, limit); // Trim the extra row
    }

    // 5. Build response
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
