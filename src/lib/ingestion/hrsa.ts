import type { NormalizedClinic } from './upsert-engine';
import {
  normalizePhone,
  normalizeUrl,
  normalizeZip,
  slugify,
} from './normalize';

/**
 * Fetch HRSA clinics for a single state by FIPS code
 */
export async function fetchHrsaClinicsByState(
  fips: string
): Promise<NormalizedClinic[]> {
  const token = process.env.HRSA_API_KEY;

  if (!token) {
    throw new Error('HRSA_API_KEY is not configured');
  }

  const response = await fetch(
    'https://data.hrsa.gov/HDWAPI3_External/api/v1/GetHealthCentersByArea',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        StateFipsCode: fips,
        Token: token,
      }),
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!response.ok) {
    throw new Error(`HRSA API returned ${response.status}`);
  }

  const json = await response.json();
  const records = json?.HCC ?? [];

  const clinics: NormalizedClinic[] = [];

  for (const r of records) {
    const [latStr, lonStr] = (r.LAT_LON || '').split(' ');
    const lat = latStr ? Number(latStr) : null;
    const lon = lonStr ? Number(lonStr) : null;

    clinics.push({
      source: 'HRSA',
      source_id: `${fips}-${r.Row_ID}`,
      name: r.SITE_NM,
      slug: slugify(r.SITE_NM),
      description: null,
      phone: normalizePhone(r.SITE_PHONE_NUM),
      email: null,
      website: normalizeUrl(r.SITE_URL),
      address_line1: r.SITE_ADDRESS ?? null,
      address_line2: null,
      city: r.SITE_CITY ?? null,
      state: r.SITE_STATE_ABBR ?? null,
      zip: normalizeZip(r.SITE_ZIP_CD),
      county: null,
      latitude: lat,
      longitude: lon,
      services: [],
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
