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

// Zod schema for each CSV row (all optional — CSV data is messy)
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
 * Parse a NAFC CSV string into normalized clinic records.
 */
export async function parseNafcCsv(csvText: string): Promise<CsvParseResult> {
  const parseResult = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\\s+/g, '_'),
  });

  const errors: string[] = [];
  const clinics: NormalizedClinic[] = [];

  // Report CSV-level parse errors
  for (const err of parseResult.errors) {
    errors.push(`Row ${err.row}: ${err.message}`);
  }

  for (let i = 0; i < parseResult.data.length; i++) {
    const raw = parseResult.data[i];
    const rowNum = i + 2; // +2 for 1-indexed + header row

    const parsed = nafcRowSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors = parsed.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      errors.push(`Row ${rowNum}: ${fieldErrors}`);
      continue;
    }

    const r = parsed.data;

    // Compute source_id from hash if no explicit ID in CSV
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

  return { clinics, errors, totalRows: parseResult.data.length };
}
