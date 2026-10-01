import { describe, expect, it } from 'vitest';
import bcrypt from 'bcrypt';
import { hashPassword, verifyPassword } from '../src/services/password.js';
import { signAccessToken, verifyAccessToken, signPasswordChangeChallenge, verifyPasswordChangeChallenge } from '../src/services/token.js';
import { sanitizeLogMessage } from '../src/services/errorLogger.js';
import { spreadsheetSafe } from '../src/integrations/reportExport.js';
import { canonicalJson } from '../src/plugins/idempotency.js';

const secret = 'test-secret-that-is-longer-than-thirty-two-characters';

describe('password migration', () => {
  it('accepts and identifies a legacy bcrypt hash for rehash', async () => {
    const legacy = await bcrypt.hash('legacy-password', 4);
    await expect(verifyPassword(legacy, 'legacy-password')).resolves.toEqual({ valid: true, needsRehash: true });
  });

  it('creates Argon2id hashes for all new passwords', async () => {
    const hash = await hashPassword('a-new-secure-password');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    await expect(verifyPassword(hash, 'a-new-secure-password')).resolves.toEqual({ valid: true, needsRehash: false });
  });
});

describe('bounded JWT purposes', () => {
  it('validates issuer, audience, subject and access-token purpose', async () => {
    const token = await signAccessToken('user-id', secret, '5m', 'issuer', 'audience');
    await expect(verifyAccessToken(token, secret, 'issuer', 'audience')).resolves.toEqual({ sub: 'user-id' });
    await expect(verifyAccessToken(token, secret, 'wrong', 'audience')).rejects.toThrow();
  });

  it('does not accept a password-change challenge as an access token', async () => {
    const challenge = await signPasswordChangeChallenge('user-id', secret, 'issuer', 'audience');
    await expect(verifyPasswordChangeChallenge(challenge, secret, 'issuer', 'audience')).resolves.toBe('user-id');
    await expect(verifyAccessToken(challenge, secret, 'issuer', 'audience')).rejects.toThrow();
  });
});

describe('log redaction', () => {
  it('removes bearer tokens and credential-like values', () => {
    const message = 'authorization=abc password=hunter2 Bearer eyJabcdefghijabcdefghij.abcdefghijabcdefghij.abcdefghijabcdefghij';
    const sanitized = sanitizeLogMessage(message);
    expect(sanitized).not.toContain('hunter2');
    expect(sanitized).not.toContain('eyJabcdefghij');
    expect(sanitized).toContain('[redacted]');
  });
});

describe('mutation and export hardening', () => {
  it('canonicalizes object keys for stable idempotency hashes', () => {
    expect(canonicalJson({ b: 2, a: { d: 4, c: 3 } })).toBe(canonicalJson({ a: { c: 3, d: 4 }, b: 2 }));
  });

  it.each(['=1+1', '+cmd', '-2+3', '@formula'])('neutralizes spreadsheet formula input %s', (value) => {
    expect(spreadsheetSafe(value)).toBe(`'${value}`);
  });
});
