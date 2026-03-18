import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { fetchHrsaClinicsByState } from '@/lib/ingestion/hrsa';
import { runIngestion } from '@/lib/ingestion/upsert-engine';
import { adminRateLimiter } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1';

  const rl = adminRateLimiter.check(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again shortly.' },
      { status: 429 }
    );
  }

  const auth = await verifyAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    const stateFips = request.nextUrl.searchParams.get('state') || '45'; // default SC

    const clinics = await fetchHrsaClinicsByState(stateFips);

    if (clinics.length === 0) {
      return NextResponse.json(
        { error: 'No clinics returned from HRSA API.' },
        { status: 502 }
      );
    }

    const result = await runIngestion(
      `HRSA-${stateFips}`,
      clinics,
      auth.userId!
    );

    return NextResponse.json({
      success: true,
      state: stateFips,
      run_id: result.runId,
      total: result.total,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors.slice(0, 10),
    });
  } catch (err) {
    console.error('HRSA sync error:', err);
    return NextResponse.json(
      {
        error: 'HRSA sync failed',
        detail: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
