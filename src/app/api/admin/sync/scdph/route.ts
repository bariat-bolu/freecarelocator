import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { fetchScdphClinics } from '@/lib/ingestion/scdph';
import { runIngestion } from '@/lib/ingestion/upsert-engine';
import { adminRateLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

  const auth = await verifyAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    console.log('[SCDPH] Fetching clinics...');

    const clinics = await fetchScdphClinics();

    if (!clinics.length) {
      console.warn('[SCDPH] No clinics returned.');
      return NextResponse.json(
        { error: 'No clinics returned from SC DPH.' },
        { status: 502 }
      );
    }

    console.log(`[SCDPH] ${clinics.length} clinics fetched.`);

    const result = await runIngestion(
      'SCDPH', // keep consistent with ingestion file
      clinics,
      auth.userId!
    );

    console.log(
      `[SCDPH] Ingestion complete. Created: ${result.created}, Updated: ${result.updated}`
    );

    return NextResponse.json({
      success: true,
      run_id: result.runId,
      total: result.total,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors.slice(0, 10),
    });
  } catch (err) {
    console.error('[SCDPH] Sync error:', err);

    return NextResponse.json(
      {
        error: 'SC DPH sync failed',
        detail: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
