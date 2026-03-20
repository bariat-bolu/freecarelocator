import { createAdminClient } from '@/lib/supabase/admin';

/** Shape of a normalized clinic ready for upsert. */
export interface NormalizedClinic {
  source: string;
  source_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
  latitude: number | null;
  longitude: number | null;
  services: string[];
  languages: string[];
  hours_json: Record<string, string> | null;
  eligibility: string | null;
  accepts_uninsured: boolean;
  sliding_scale: boolean;
  cost: string | null;
  docs_needed: string | null;
  is_approved: boolean;
}

export interface IngestionResult {
  runId: string;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Upsert an array of normalized clinics and log everything.
 *
 * For each clinic:
 * 1. Check if a row with (source, source_id) already exists.
 * 2. If not → INSERT + log 'created' in clinic_changes.
 * 3. If yes → compare fields, UPDATE only if changed + log diffs.
 * 4. If error → skip and record the error.
 *
 * Uses the service-role client to bypass RLS (this is trusted admin code).
 * Each source's data lives in its own (source, source_id) namespace —
 * no cross-source merging.
 */
export async function runIngestion(
  source: string,
  clinics: NormalizedClinic[],
  triggeredBy: string
): Promise<IngestionResult> {
  const supabase = createAdminClient();

  // 1. Create ingestion_runs row
  const { data: run, error: runError } = await supabase
    .from('ingestion_runs')
    .insert({
      source,
      status: 'started',
      records_total: clinics.length,
      triggered_by: triggeredBy,
    })
    .select('id')
    .single();

  if (runError || !run) {
    throw new Error(`Failed to create ingestion run: ${runError?.message}`);
  }

  const result: IngestionResult = {
    runId: run.id,
    total: clinics.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  // 2. Process each clinic sequentially
  for (const clinic of clinics) {
    try {
      // Check for existing row by (source, source_id)
      const { data: existing } = await supabase
        .from('clinics')
        .select('*')
        .eq('source', clinic.source)
        .eq('source_id', clinic.source_id)
        .maybeSingle();

      if (!existing) {
        // ── INSERT ──
        const locationSql =
          clinic.longitude != null && clinic.latitude != null
            ? `SRID=4326;POINT(${clinic.longitude} ${clinic.latitude})`
            : null;

        const { data: inserted, error: insertError } = await supabase
          .from('clinics')
          .insert({
            ...clinic,
            location: locationSql,
          })
          .select('id')
          .single();

        if (insertError) {
          result.errors.push(
            `INSERT ${clinic.source_id}: ${insertError.message}`
          );
          result.skipped++;
          continue;
        }

        // Log the creation
        await supabase.from('clinic_changes').insert({
          ingestion_run_id: run.id,
          clinic_id: inserted.id,
          change_type: 'created',
          field_changes: null,
        });

        result.created++;
      } else {
        // ── UPDATE (only if fields changed) ──
        const diffs = computeDiffs(existing, clinic);

        if (Object.keys(diffs).length === 0) {
          result.skipped++;
          continue;
        }

        // Build the update payload from changed fields only
        const updatePayload: Record<string, unknown> = {};
        for (const key of Object.keys(diffs)) {
          updatePayload[key] = clinic[key as keyof NormalizedClinic];
        }

        // If lat/lon changed, update location too
        if (diffs.latitude || diffs.longitude) {
          const lat = clinic.latitude ?? existing.latitude;
          const lon = clinic.longitude ?? existing.longitude;
          if (lat != null && lon != null) {
            updatePayload.location = `SRID=4326;POINT(${lon} ${lat})`;
          }
        }

        const { error: updateError } = await supabase
          .from('clinics')
          .update(updatePayload)
          .eq('id', existing.id);

        if (updateError) {
          result.errors.push(
            `UPDATE ${clinic.source_id}: ${updateError.message}`
          );
          result.skipped++;
          continue;
        }

        // Log field-level changes
        await supabase.from('clinic_changes').insert({
          ingestion_run_id: run.id,
          clinic_id: existing.id,
          change_type: 'updated',
          field_changes: diffs,
        });

        result.updated++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push(`${clinic.source_id}: ${msg}`);
      result.skipped++;
    }
  }

  // 3. Finalize the ingestion run
  await supabase
    .from('ingestion_runs')
    .update({
      status: 'completed',
      records_created: result.created,
      records_updated: result.updated,
      records_skipped: result.skipped,
      error_message:
        result.errors.length > 0
          ? result.errors.slice(0, 20).join('\\n')
          : null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', run.id);

  return result;
}

/**
 * Compare an existing DB row against incoming data.
 * Returns an object of { field: { old, new } } for changed fields.
 */
function computeDiffs(
  existing: Record<string, unknown>,
  incoming: NormalizedClinic
): Record<string, { old: unknown; new: unknown }> {
  const diffs: Record<string, { old: unknown; new: unknown }> = {};

  const fieldsToCompare: (keyof NormalizedClinic)[] = [
    'name',
    'slug',
    'description',
    'phone',
    'email',
    'website',
    'address_line1',
    'address_line2',
    'city',
    'state',
    'zip',
    'county',
    'latitude',
    'longitude',
    'services',
    'languages',
    'hours_json',
    'eligibility',
    'accepts_uninsured',
    'sliding_scale',
    'cost',
    'docs_needed',
  ];

  for (const field of fieldsToCompare) {
    const oldVal = existing[field];
    const newVal = incoming[field];

    // Skip if incoming is null/undefined (don't overwrite with nothing)
    if (newVal == null || newVal === '') continue;

    const oldStr = JSON.stringify(oldVal ?? null);
    const newStr = JSON.stringify(newVal);

    if (oldStr !== newStr) {
      diffs[field] = { old: oldVal ?? null, new: newVal };
    }
  }

  return diffs;
}
