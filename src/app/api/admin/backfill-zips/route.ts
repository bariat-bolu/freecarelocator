import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { backfillMissingZips } from '@/lib/ingestion/reverse-geocode';
import { adminRateLimiter } from '@/lib/rate-limit';

export const maxDuration = 300; // Allow up to 5 minutes on Vercel Pro

export async function POST(request: NextRequest) {
  // Rate limit
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1';
  const rl = adminRateLimiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  // Auth
  const auth = await verifyAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    const result = await backfillMissingZips();

    return NextResponse.json({
      success: true,
      total_missing: result.total,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors.slice(0, 20),
    });
  } catch (err) {
    console.error('ZIP backfill error:', err);
    return NextResponse.json(
      {
        error: 'ZIP backfill failed',
        detail: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
