import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';
import { fetchHrsaClinicsByState } from '@/lib/ingestion/hrsa';
import { runIngestion } from '@/lib/ingestion/upsert-engine';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const STATE_FIPS_CODES = [
  '01',
  '02',
  '04',
  '05',
  '06',
  '08',
  '09',
  '10',
  '11',
  '12',
  '13',
  '15',
  '16',
  '17',
  '18',
  '19',
  '20',
  '21',
  '22',
  '23',
  '24',
  '25',
  '26',
  '27',
  '28',
  '29',
  '30',
  '31',
  '32',
  '33',
  '34',
  '35',
  '36',
  '37',
  '38',
  '39',
  '40',
  '41',
  '42',
  '44',
  '45',
  '46',
  '47',
  '48',
  '49',
  '50',
  '51',
  '53',
  '54',
  '55',
  '56',
];

const STATES_PER_RUN = 3;

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const supabase = await createClient();

  // Find active nationwide job
  let { data: activeRun } = await supabase
    .from('ingestion_runs')
    .select('*')
    .eq('source', 'HRSA-NATIONWIDE')
    .eq('status', 'in_progress')
    .maybeSingle();

  // If none, create new job
  if (!activeRun) {
    const { data: newRun } = await supabase
      .from('ingestion_runs')
      .insert({
        source: 'HRSA-NATIONWIDE',
        status: 'in_progress',
        records_total: 0,
        triggered_by: auth.userId,
        states_remaining: STATE_FIPS_CODES,
        states_completed: [],
      })
      .select('*')
      .single();

    activeRun = newRun;
  }

  const remaining: string[] = activeRun.states_remaining || [];

  if (remaining.length === 0) {
    await supabase
      .from('ingestion_runs')
      .update({ status: 'completed' })
      .eq('id', activeRun.id);

    return NextResponse.json({ message: 'Nationwide sync completed.' });
  }

  const batch = remaining.slice(0, STATES_PER_RUN);
  let totalProcessed = 0;

  for (const fips of batch) {
    const clinics = await fetchHrsaClinicsByState(fips);
    const result = await runIngestion(`HRSA-${fips}`, clinics, auth.userId!);

    totalProcessed += result.total;
  }

  const updatedRemaining = remaining.slice(STATES_PER_RUN);
  const updatedCompleted = [...(activeRun.states_completed || []), ...batch];

  await supabase
    .from('ingestion_runs')
    .update({
      states_remaining: updatedRemaining,
      states_completed: updatedCompleted,
    })
    .eq('id', activeRun.id);

  return NextResponse.json({
    message: 'Batch processed',
    states_processed: batch,
    states_remaining: updatedRemaining.length,
    total_processed: totalProcessed,
  });
}
