import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { parseNafcCsv } from '@/lib/ingestion/nafc-csv';
import { runIngestion } from '@/lib/ingestion/upsert-engine';
import { adminRateLimiter } from '@/lib/rate-limit';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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
    const formData = await request.formData();
    const file = formData.get('file');

    // Validate file presence
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No CSV file provided. Use the "file" form field.' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only .csv files are accepted.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 10 MB.` },
        { status: 400 }
      );
    }

    // Read file content
    const csvText = await file.text();

    if (!csvText.trim()) {
      return NextResponse.json(
        { error: 'CSV file is empty.' },
        { status: 400 }
      );
    }

    // Parse CSV
    const {
      clinics,
      errors: parseErrors,
      totalRows,
    } = await parseNafcCsv(csvText);

    if (clinics.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid clinic rows found in CSV.',
          parse_errors: parseErrors.slice(0, 20),
          total_rows: totalRows,
        },
        { status: 400 }
      );
    }

    // Run ingestion
    const result = await runIngestion('NAFC', clinics, auth.userId!);

    return NextResponse.json({
      success: true,
      run_id: result.runId,
      total_csv_rows: totalRows,
      valid_rows: clinics.length,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      parse_errors: parseErrors.slice(0, 20),
      ingestion_errors: result.errors.slice(0, 10),
    });
  } catch (err) {
    console.error('NAFC CSV ingestion error:', err);
    return NextResponse.json(
      {
        error: 'CSV ingestion failed',
        detail: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
