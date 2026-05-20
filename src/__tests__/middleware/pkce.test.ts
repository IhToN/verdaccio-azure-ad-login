import { createHash } from 'crypto';
import { generateCodeVerifier, generateCodeChallenge } from '../../middleware/pkce';

describe('generateCodeVerifier', () => {
  it('returns a string of exactly 43 characters', () => {
    expect(generateCodeVerifier()).toHaveLength(43);
  });

  it('returns only URL-safe base64url characters', () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it('returns a different value on each call', () => {
    const a = generateCodeVerifier();
    const b = generateCodeVerifier();
    expect(a).not.toBe(b);
  });
});

describe('generateCodeChallenge', () => {
  it('returns the SHA-256 base64url hash of the verifier', () => {
    const verifier = generateCodeVerifier();
    const expected = createHash('sha256').update(verifier).digest('base64url');
    expect(generateCodeChallenge(verifier)).toBe(expected);
  });

  it('returns only URL-safe base64url characters', () => {
    const challenge = generateCodeChallenge(generateCodeVerifier());
    expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it('returns a different value from the verifier', () => {
    const verifier = generateCodeVerifier();
    expect(generateCodeChallenge(verifier)).not.toBe(verifier);
  });

  it('is deterministic for the same input', () => {
    const verifier = 'dGhpcyBpcyBhIHRlc3QgdmVyaWZpZXIgZm9yIHRlc3Rpbmc';
    expect(generateCodeChallenge(verifier)).toBe(generateCodeChallenge(verifier));
  });
});
