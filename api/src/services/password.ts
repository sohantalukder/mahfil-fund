import bcrypt from 'bcrypt';
import { Algorithm, hash, verify } from '@node-rs/argon2';

const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$.{53}$/;
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
const ARGON_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 3,
  parallelism: 1,
  outputLen: 32,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON_OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (passwordHash.startsWith('$argon2id$')) {
    return { valid: await verify(passwordHash, password), needsRehash: false };
  }
  if (BCRYPT_HASH.test(passwordHash)) {
    const valid = await bcrypt.compare(password, passwordHash);
    return { valid, needsRehash: valid };
  }
  return { valid: false, needsRehash: false };
}
