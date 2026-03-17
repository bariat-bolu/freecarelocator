import { z } from 'zod';
import type { NormalizedClinic } from './upsert-engine';
import {
  normalizePhone,
  normalizeUrl,
  normalizeZip,
  toArray,
  slugify,
} from './normalize';

// SC DPH ArcGIS Feature attributes (subset)
const scdphAttributeSchema = z.object({
  OBJECTID: z.coerce.string(),
  NAME: z.string().optional().nullable(),
  ADDRESS: z.string().optional().nullable(),
  CITY: z.string().optional().nullable(),
  STATE: z.string().optional().nullable(),
  ZIP: z.string().optional().nullable(),
  COUNTY: z.string().optional().nullable(),
  PHONE: z.string().optional().nullable(),
  WEBSITE: z.string().optional().nullable(),
  SERVICES: z.string().optional().nullable(),
  HOURS: z.string().optional().nullable(),
  TYPE: z.string().optional().nullable(),
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
 * Fetch SC DPH clinic data from the public ArcGIS REST endpoint.
 */
export async function fetchScdphClinics(): Promise<NormalizedClinic[]> {
  // SC DHEC / DPH ArcGIS endpoint — public, no auth needed
  // This URL may need adjustment based on the actual DHEC service layer.
  const url = new URL(
    'https://services2.arcgis.com/XZg2efAbaieYAXmu/arcgis/rest/services/SC_Free_Clinics/FeatureServer/0/query'
  );
  url.searchParams.set('where', '1=1');
  url.searchParams.set('outFields', '*');
  url.searchParams.set('f', 'json');
  url.searchParams.set('resultRecordCount', '5000');
  url.searchParams.set('outSR', '4326');

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
    if (!a.NAME) continue;

    clinics.push({
      source: 'SC_DPH',
      source_id: a.OBJECTID,
      name: a.NAME,
      slug: slugify(a.NAME),
      description: a.TYPE || null,
      phone: normalizePhone(a.PHONE),
      email: null,
      website: normalizeUrl(a.WEBSITE),
      address_line1: a.ADDRESS?.trim() || null,
      address_line2: null,
      city: a.CITY?.trim() || null,
      state: a.STATE?.trim() || 'SC',
      zip: normalizeZip(a.ZIP),
      county: a.COUNTY?.trim() || null,
      latitude: g?.y ?? null,
      longitude: g?.x ?? null,
      services: toArray(a.SERVICES, ','),
      languages: ['English'],
      hours_json: a.HOURS ? { info: a.HOURS } : null,
      eligibility: null,
      accepts_uninsured: true,
      sliding_scale: false,
      cost: null,
      docs_needed: null,
      is_approved: true, // DPH data is trusted
    });
  }

  return clinics;
}
