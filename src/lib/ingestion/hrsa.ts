import { z } from 'zod';
import type { NormalizedClinic } from './upsert-engine';
import {
  normalizePhone,
  normalizeUrl,
  normalizeZip,
  toArray,
  slugify,
} from './normalize';

/**
 * Zod schema matching HRSA Socrata dataset fields
 */
const hrsaRecordSchema = z.object({
  healthcenterid: z.coerce.string(),
  healthcentername: z.string(),
  site_address: z.string().optional().nullable(),
  site_city: z.string().optional().nullable(),
  site_state_abbreviation: z.string().optional().nullable(),
  site_postal_code: z.string().optional().nullable(),
  healthcentercounty: z.string().optional().nullable(),
  site_telephone_number: z.string().optional().nullable(),
  healthcenterurl: z.string().optional().nullable(),
  geocoding_artifact_address_primary_x_coordinate: z.coerce
    .number()
    .optional()
    .nullable(),
  geocoding_artifact_address_primary_y_coordinate: z.coerce
    .number()
    .optional()
    .nullable(),
  healthcenterservicedeliverymethods: z.string().optional().nullable(),
  operationalstatus: z.string().optional().nullable(),
});

type HrsaRecord = z.infer<typeof hrsaRecordSchema>;

/**
 * Fetch HRSA Health Centers for South Carolina.
 */
export async function fetchHrsaClinics(): Promise<NormalizedClinic[]> {
  const apiKey = process.env.HRSA_API_KEY;

  if (!apiKey) {
    throw new Error('HRSA_API_KEY is not configured');
  }

  const url = new URL(
    'https://data.hrsa.gov/resource/healthcenterservicesites.json'
  );

  // SC filter
  url.searchParams.set('$limit', '5000');
  url.searchParams.set('$where', "site_state_abbreviation = 'SC'");

  const response = await fetch(url.toString(), {
    headers: {
      'X-App-Token': apiKey,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HRSA API returned ${response.status}: ${text}`);
  }

  const json = await response.json();
  const records: unknown[] = Array.isArray(json) ? json : [];

  const clinics: NormalizedClinic[] = [];

  for (const raw of records) {
    const parsed = hrsaRecordSchema.safeParse(raw);
    if (!parsed.success) continue;

    const r: HrsaRecord = parsed.data;

    // Skip non-operational sites
    if (r.operationalstatus && r.operationalstatus !== 'Active') continue;

    const lon = r.geocoding_artifact_address_primary_x_coordinate ?? null;
    const lat = r.geocoding_artifact_address_primary_y_coordinate ?? null;

    clinics.push({
      source: 'HRSA',
      source_id: r.healthcenterid,
      name: r.healthcentername,
      slug: slugify(r.healthcentername),
      description: null,
      phone: normalizePhone(r.site_telephone_number),
      email: null,
      website: normalizeUrl(r.healthcenterurl),
      address_line1: r.site_address?.trim() || null,
      address_line2: null,
      city: r.site_city?.trim() || null,
      state: r.site_state_abbreviation?.trim() || 'SC',
      zip: normalizeZip(r.site_postal_code),
      county: r.healthcentercounty?.trim() || null,
      latitude: lat,
      longitude: lon,
      services: toArray(r.healthcenterservicedeliverymethods, ';'),
      languages: ['English'],
      hours_json: null,
      eligibility: 'All residents regardless of ability to pay.',
      accepts_uninsured: true,
      sliding_scale: true,
      cost: 'Sliding scale based on income.',
      docs_needed: null,
      is_approved: true,
    });
  }

  return clinics;
}
