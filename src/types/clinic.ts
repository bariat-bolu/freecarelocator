export interface Clinic {
  id: string;
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
  hours_json: HoursJson | null;
  eligibility: string | null;
  accepts_uninsured: boolean;
  sliding_scale: boolean;
  cost: string | null;
  docs_needed: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  // Computed by PostGIS (only present in proximity searches)
  dist_miles?: number;
}

export interface HoursJson {
  [day: string]: string; // e.g. { "Monday": "8:00 AM - 5:00 PM" }
}

// Filter state used across components
export interface SearchFilters {
  query: string;
  radius: number;
  services: string[];
  languages: string[];
}

// Known service and language options for filter UI
export const SERVICE_OPTIONS = [
  'Primary Care',
  'Dental',
  'Vision',
  'Mental Health',
  'Pharmacy',
  'Pediatrics',
  "Women's Health",
  'Substance Abuse',
  'Lab / Imaging',
  'Telehealth',
] as const;

export const LANGUAGE_OPTIONS = [
  'English',
  'Spanish',
  'Vietnamese',
  'Chinese',
  'Korean',
  'French',
  'Arabic',
  'ASL',
] as const;
// ── API response type ───────────────────────────────────────────────────

export interface SearchResponse {
  results: Clinic[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
    has_more: boolean;
  };
  geo: {
    lat: number;
    lon: number;
    radius_miles: number;
  } | null;
}
