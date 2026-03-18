import { z } from 'zod';
import type { NormalizedClinic } from './upsert-engine';
import {
  normalizePhone,
  normalizeUrl,
  normalizeZip,
  slugify,
} from './normalize';

/**
 * SC DPH ArcGIS Feature attributes
 * Matches real dataset field names exactly
 */
const scdphAttributeSchema = z.object({
  OBJECTID: z.coerce.string(),
  Name: z.string().optional().nullable(),
  Address: z.string().optional().nullable(),
  City: z.string().optional().nullable(),
  State: z.string().optional().nullable(),
  Zip: z.union([z.string(), z.number()]).optional().nullable(),
  County: z.string().optional().nullable(),
  Phone_Numb: z.string().optional().nullable(),
  URL: z.string().optional().nullable(),

  Child_Heal: z.string().optional().nullable(),
  CSHCN: z.string().optional().nullable(),
  Family_Pla: z.string().optional().nullable(),
  WIC: z.string().optional().nullable(),
  Immunizati: z.string().optional().nullable(),
  TB: z.string().optional().nullable(),
  STD_HIV: z.string().optional().nullable(),
  FSS: z.string().optional().nullable(),
  EPI: z.string().optional().nullable(),
  VR: z.string().optional().nullable(),

  Region: z.string().optional().nullable(),
  Appt_Numb: z.string().optional().nullable(),
});

const scdphFeatureSchema = z.object({
  attributes: scdphAttributeSchema,
  geometry: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional()
    .nullable(),
});

/**
 * Convert service flags (Yes) into structured array
 */
function extractServices(a: z.infer<typeof scdphAttributeSchema>): string[] {
  const services: string[] = [];

  const map: Record<string, string> = {
    Child_Heal: 'Child Health',
    CSHCN: 'Children with Special Health Care Needs',
    Family_Pla: 'Family Planning',
    WIC: 'WIC',
    Immunizati: 'Immunizations',
    TB: 'Tuberculosis',
    STD_HIV: 'STD/HIV',
    FSS: 'Family Support Services',
    EPI: 'Epidemiology',
    VR: 'Vital Records',
  };

  for (const key of Object.keys(map)) {
    if ((a as any)[key] === 'Yes') {
      services.push(map[key]);
    }
  }

  return services;
}

/**
 * Fetch SC DPH clinic data from ArcGIS REST endpoint
 */
export async function fetchScdphClinics(): Promise<NormalizedClinic[]> {
  const url = new URL(
    'https://gis.dhec.sc.gov/arcgis/rest/services/health/HealthDepartments/MapServer/0/query'
  );

  url.searchParams.set('where', '1=1');
  url.searchParams.set('outFields', '*');
  url.searchParams.set('f', 'json');
  url.searchParams.set('resultRecordCount', '5000');
  url.searchParams.set('outSR', '4326'); // convert to lat/lon automatically

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(
      `SC DPH ArcGIS returned ${response.status}: ${response.statusText}`
    );
  }

  const json = await response.json();

  if (json.error) {
    throw new Error(
      `ArcGIS error: ${json.error.message || JSON.stringify(json.error)}`
    );
  }

  const features: unknown[] = json.features || [];
  const clinics: NormalizedClinic[] = [];

  for (const raw of features) {
    const parsed = scdphFeatureSchema.safeParse(raw);
    if (!parsed.success) continue;

    const { attributes: a, geometry: g } = parsed.data;

    if (!a.Name) continue;

    clinics.push({
      source: 'SCDPH',
      source_id: a.OBJECTID,
      name: a.Name,
      slug: slugify(a.Name),
      description: a.Region || null,
      phone: normalizePhone(a.Phone_Numb),
      email: null,
      website: normalizeUrl(a.URL),
      address_line1: a.Address?.trim() || null,
      address_line2: null,
      city: a.City?.trim() || null,
      state: a.State?.trim() || 'SC',
      zip: normalizeZip(String(a.Zip ?? '')),
      county: a.County?.trim() || null,
      latitude: g?.y ?? null,
      longitude: g?.x ?? null,
      services: extractServices(a),
      languages: ['English'],
      hours_json: null,
      eligibility: 'Public health services provided by South Carolina DPH.',
      accepts_uninsured: true,
      sliding_scale: false,
      cost: null,
      docs_needed: null,
      is_approved: true,
    });
  }

  return clinics;
}
