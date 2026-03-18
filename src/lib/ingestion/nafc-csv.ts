import Papa from 'papaparse';
import { z } from 'zod';
import type { NormalizedClinic } from './upsert-engine';
import {
  normalizePhone,
  normalizeUrl,
  normalizeZip,
  toArray,
  slugify,
  computeHash,
} from './normalize';

// Zod schema for normalized row
const nafcRowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default('SC'),
  zip: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  website: z.string().optional().default(''),
  hours: z.string().optional().default(''),
  services: z.string().optional().default(''),
  eligibility: z.string().optional().default(''),
  languages: z.string().optional().default(''),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
});

type NafcRow = z.infer<typeof nafcRowSchema>;

export interface CsvParseResult {
  clinics: NormalizedClinic[];
  errors: string[];
  totalRows: number;
}

/**
 * Flexible header mapper — handles messy NAFC CSV formats
 */
function normalizeCsvRow(raw: Record<string, any>) {
  return {
    name:
      raw.name ||
      raw.clinic_name ||
      raw.organization_name ||
      raw.site_name ||
      raw.clinic ||
      raw.practice_name ||
      '',

    address:
      raw.address || raw.street || raw.address_line_1 || raw.address1 || '',

    city: raw.city || '',
    state: raw.state || 'SC',
    zip: raw.zip || raw.postal_code || raw.zip_code || '',

    phone:
      raw.phone ||
      raw.phone_number ||
      raw.main_phone ||
      raw.contact_phone ||
      '',

    website: raw.website || raw.url || raw.web_site || '',
    hours: raw.hours || raw.operating_hours || '',
    services: raw.services || raw.service_types || '',
    eligibility: raw.eligibility || '',
    languages: raw.languages || raw.language || '',

    latitude: raw.latitude,
    longitude: raw.longitude,
  };
}

/**
 * Parse a NAFC CSV string into normalized clinic records.
 */
export async function parseNafcCsv(csvText: string): Promise<CsvParseResult> {
  const parseResult = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  const errors: string[] = [];
  const clinics: NormalizedClinic[] = [];

  // Report CSV-level parse errors
  for (const err of parseResult.errors) {
    errors.push(`Row ${err.row}: ${err.message}`);
  }

  for (let i = 0; i < parseResult.data.length; i++) {
    const raw = parseResult.data[i];
    const rowNum = i + 2;

    // 🔥 Normalize messy headers before validation
    const normalizedRow = normalizeCsvRow(raw);

    const parsed = nafcRowSchema.safeParse(normalizedRow);

    if (!parsed.success) {
      const fieldErrors = parsed.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      errors.push(`Row ${rowNum}: ${fieldErrors}`);
      continue;
    }

    const r = parsed.data;

    const sourceId = await computeHash(r.name, r.address, r.zip);

    const lat = r.latitude != null && isFinite(r.latitude) ? r.latitude : null;

    const lon =
      r.longitude != null && isFinite(r.longitude) ? r.longitude : null;

    clinics.push({
      source: 'NAFC',
      source_id: sourceId,
      name: r.name.trim(),
      slug: slugify(r.name),
      description: null,
      phone: normalizePhone(r.phone),
      email: null,
      website: normalizeUrl(r.website),
      address_line1: r.address?.trim() || null,
      address_line2: null,
      city: r.city?.trim() || null,
      state: r.state?.trim() || 'SC',
      zip: normalizeZip(r.zip),
      county: null,
      latitude: lat,
      longitude: lon,
      services: toArray(r.services),
      languages: toArray(r.languages),
      hours_json: r.hours ? { info: r.hours } : null,
      eligibility: r.eligibility?.trim() || null,
      accepts_uninsured: true,
      sliding_scale: false,
      cost: null,
      docs_needed: null,
      is_approved: false, // NAFC requires manual approval
    });
  }

  return {
    clinics,
    errors,
    totalRows: parseResult.data.length,
  };
}
