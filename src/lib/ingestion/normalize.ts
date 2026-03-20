/**
 * Normalize a phone string to a consistent format.
 * Strips everything except digits, then formats as (XXX) XXX-XXXX.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw.trim() || null;
}

/**
 * Normalize a URL — ensure it starts with http(s)://.
 */
export function normalizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Split a delimited string into a trimmed, deduplicated array.
 */
export function toArray(
  raw: string | string[] | null | undefined,
  delimiter = ','
): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((s) => s.trim()).filter(Boolean);
  return raw
    .split(delimiter)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);
}

/**
 * Normalize ZIP to 5 digits.
 */
/**
 * Normalize ZIP to 5 digits.
 * Handles all US formats:
 *   "29201"       → "29201"  (SC)
 *   "02920"       → "02920"  (RI)
 *   "29201-0000"  → "29201"  (ZIP+4)
 *   "292010000"   → "29201"  (ZIP+4 no dash)
 *   29201         → "29201"  (numeric input)
 *   2920          → "02920"  (numeric, leading zero stripped by API)
 */
export function normalizeZip(
  raw: string | number | null | undefined
): string | null {
  if (raw == null) return null;
  const str = String(raw)
    .trim()
    .replace(/[^0-9]/g, '');
  if (str.length === 0) return null;
  if (str.length >= 5) return str.slice(0, 5);
  if (str.length >= 3) return str.padStart(5, '0');
  return null;
}

/**
 * Generate a URL-friendly slug from a clinic name.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

/**
 * Compute a simple hash for dedupe when no source ID exists.
 * Uses Web Crypto API (available in Node 18+).
 */
export async function computeHash(
  ...parts: (string | null | undefined)[]
): Promise<string> {
  const input = parts.map((p) => (p || '').trim().toLowerCase()).join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
