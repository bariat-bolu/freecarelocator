import { createClient } from '@/lib/supabase/server';

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
 * Generate normalized identity key for cross-source dedupe.
 */
function identityKey(c: any) {
  return (
    (c.name || '').toLowerCase().replace(/[^a-z0-9]/g, '') +
    '|' +
    (c.address_line1 || '').toLowerCase().replace(/[^a-z0-9]/g, '') +
    '|' +
    (c.city || '').toLowerCase() +
    '|' +
    (c.state || '').toLowerCase()
  );
}

export async function runIngestion(
  source: string,
  clinics: NormalizedClinic[],
  triggeredBy: string
): Promise<IngestionResult> {
  const supabase = await createClient();

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

  const CONCURRENCY_LIMIT = 10;

  for (let i = 0; i < clinics.length; i += CONCURRENCY_LIMIT) {
    const chunk = clinics.slice(i, i + CONCURRENCY_LIMIT);

    await Promise.all(
      chunk.map(async (clinic) => {
        try {
          // 🔹 First: per-source lookup
          const { data: existing } = await supabase
            .from('clinics')
            .select('*')
            .eq('source', clinic.source)
            .eq('source_id', clinic.source_id)
            .maybeSingle();

          if (!existing) {
            // 🔥 Cross-source identity check BEFORE insert
            const key = identityKey(clinic);

            const { data: potentialMatches } = await supabase
              .from('clinics')
              .select('*')
              .eq('city', clinic.city)
              .eq('state', clinic.state);

            if (potentialMatches && potentialMatches.length > 0) {
              for (const match of potentialMatches) {
                if (identityKey(match) === key) {
                  const mergedSources = Array.from(
                    new Set([...(match.sources || []), clinic.source])
                  );

                  const mergedServices = Array.from(
                    new Set([
                      ...(match.services || []),
                      ...(clinic.services || []),
                    ])
                  );

                  await supabase
                    .from('clinics')
                    .update({
                      sources: mergedSources,
                      services: mergedServices,
                      phone: match.phone || clinic.phone,
                      website: match.website || clinic.website,
                    })
                    .eq('id', match.id);

                  await supabase.from('clinic_changes').insert({
                    ingestion_run_id: run.id,
                    clinic_id: match.id,
                    change_type: 'merged',
                    field_changes: { merged_source: clinic.source },
                  });

                  result.updated++;
                  return;
                }
              }
            }

            // ── INSERT (no identity match found) ──
            const locationSql =
              clinic.longitude != null && clinic.latitude != null
                ? `SRID=4326;POINT(${clinic.longitude} ${clinic.latitude})`
                : null;

            const { data: inserted, error: insertError } = await supabase
              .from('clinics')
              .insert({
                ...clinic,
                location: locationSql,
                sources: [clinic.source],
              })
              .select('id')
              .single();

            if (insertError) {
              result.errors.push(
                `INSERT ${clinic.source_id}: ${insertError.message}`
              );
              result.skipped++;
              return;
            }

            await supabase.from('clinic_changes').insert({
              ingestion_run_id: run.id,
              clinic_id: inserted.id,
              change_type: 'created',
              field_changes: null,
            });

            result.created++;
          } else {
            // ── STANDARD UPDATE (same source) ──
            const diffs = computeDiffs(existing, clinic);

            if (Object.keys(diffs).length === 0) {
              result.skipped++;
              return;
            }

            const updatePayload: Record<string, unknown> = {};
            for (const key of Object.keys(diffs)) {
              updatePayload[key as keyof typeof clinic] =
                clinic[key as keyof typeof clinic];
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
              return;
            }

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
      })
    );
  }

  await supabase
    .from('ingestion_runs')
    .update({
      status: 'completed',
      records_created: result.created,
      records_updated: result.updated,
      records_skipped: result.skipped,
      error_message:
        result.errors.length > 0 ? result.errors.slice(0, 20).join('\n') : null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', run.id);

  return result;
}

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

    if (newVal == null || newVal === '') continue;

    const oldStr = JSON.stringify(oldVal ?? null);
    const newStr = JSON.stringify(newVal);

    if (oldStr !== newStr) {
      diffs[field] = { old: oldVal ?? null, new: newVal };
    }
  }

  return diffs;
}
