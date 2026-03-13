import { randomBytes } from 'crypto';

/**
 * Generates a cryptographically secure 16-digit numeric invite code.
 * Returns both the display format (4-4-4-4) and normalized (digits only).
 */
export function generateInviteCode(): { display: string; normalized: string } {
  // Generate 8 random bytes = 64 bits, convert to BigInt, take mod 10^16 for 16 digits
  const bytes = randomBytes(8);
  const bigVal = bytes.readBigUInt64BE(0);
  const mod = BigInt('10000000000000000'); // 10^16
  const raw = (bigVal % mod).toString().padStart(16, '0');

  const normalized = raw;
  const display = `${raw.slice(0, 4)} ${raw.slice(4, 8)} ${raw.slice(8, 12)} ${raw.slice(12, 16)}`;

  return { display, normalized };
}

export function normalizeInviteCode(raw: string): string {
  return raw.replace(/\s+/g, '').replace(/[^0-9]/g, '');
}
