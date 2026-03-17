import { z } from 'zod';
import type { NormalizedClinic } from './upsert-engine';
import {
  normalizePhone,
  normalizeUrl,
  normalizeZip,
  toArray,
  slugify,
} from './normalize';

// HRSA Health Center API returns JSON with these fields (subset)
const hrsaRecordSchema = z.object({
  HealthCenterID: z.coerce.string(),
  HealthCenterName: z.string(),
  Site_Address: z.string().optional().nullable(),
  Site_City: z.string().optional().nullable(),
  Site_State_Abbreviation: z.string().optional().nullable(),
  Site_Postal_Code: z.string().optional().nullable(),
  HealthCenterCounty: z.string().optional().nullable(),
  Site_Telephone_Number: z.string().optional().nullable(),
  HealthCenterURL: z.string().optional().nullable(),
  Geocoding_Artifact_Address_Primary_X_Coordinate: z.coerce
    .number()
    .optional()
    .nullable(),
  Geocoding_Artifact_Address_Primary_Y_Coordinate: z.coerce
    .number()
    .optional()
    .nullable(),
  HealthCenterServiceDeliveryMethods: z.string().optional().nullable(),
  OperationalStatus: z.string().optional().nullable(),
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

  // HRSA Health Center Service Delivery Sites API
  // Filter for South Carolina
  const url = new URL(
    'https://data.hrsa.gov/api/download/healthcenterservicesites'
  );
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('$filter', "Site_State_Abbreviation eq 'SC'");
  url.searchParams.set('$top', '5000');

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(
      `HRSA API returned ${response.status}: ${response.statusText}`
    );
  }

  const json = await response.json();
  const records: unknown[] = Array.isArray(json) ? json : json.value || [];

  const clinics: NormalizedClinic[] = [];

  for (const raw of records) {
    const parsed = hrsaRecordSchema.safeParse(raw);
    if (!parsed.success) continue;

    const r = parsed.data;

    // Skip non-operational sites
    if (r.OperationalStatus && r.OperationalStatus !== 'Active') continue;

    const lon = r.Geocoding_Artifact_Address_Primary_X_Coordinate ?? null;
    const lat = r.Geocoding_Artifact_Address_Primary_Y_Coordinate ?? null;

    clinics.push({
      source: 'HRSA',
      source_id: r.HealthCenterID,
      name: r.HealthCenterName,
      slug: slugify(r.HealthCenterName),
      description: null,
      phone: normalizePhone(r.Site_Telephone_Number),
      email: null,
      website: normalizeUrl(r.HealthCenterURL),
      address_line1: r.Site_Address?.trim() || null,
      address_line2: null,
      city: r.Site_City?.trim() || null,
      state: r.Site_State_Abbreviation?.trim() || 'SC',
      zip: normalizeZip(r.Site_Postal_Code),
      county: r.HealthCenterCounty?.trim() || null,
      latitude: lat,
      longitude: lon,
      services: toArray(r.HealthCenterServiceDeliveryMethods, ';'),
      languages: ['English'],
      hours_json: null,
      eligibility: 'All residents regardless of ability to pay.',
      accepts_uninsured: true,
      sliding_scale: true,
      cost: 'Sliding scale based on income.',
      docs_needed: null,
      is_approved: true, // HRSA data is trusted
    });
  }

  return clinics;
}
