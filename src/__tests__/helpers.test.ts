import { intersection, looksLikeBearerToken } from '../helpers';

describe('intersection()', () => {
  it('returns empty array when both inputs are empty', () => {
    expect(intersection([], [])).toEqual([]);
  });

  it('returns empty array when first input is empty', () => {
    expect(intersection([], ['a', 'b'])).toEqual([]);
  });

  it('returns empty array when second input is empty', () => {
    expect(intersection(['a', 'b'], [])).toEqual([]);
  });

  it('returns empty array when arrays are fully disjoint', () => {
    expect(intersection(['a', 'b'], ['c', 'd'])).toEqual([]);
  });

  it('returns intersection for partial overlap', () => {
    expect(intersection(['a', 'b', 'c'], ['b', 'c', 'd'])).toEqual(['b', 'c']);
  });

  it('returns all elements when arrays are fully overlapping', () => {
    expect(intersection(['a', 'b'], ['a', 'b'])).toEqual(['a', 'b']);
  });

  it('handles single-element arrays — match', () => {
    expect(intersection(['a'], ['a'])).toEqual(['a']);
  });

  it('handles single-element arrays — no match', () => {
    expect(intersection(['a'], ['b'])).toEqual([]);
  });
});

describe('looksLikeBearerToken()', () => {
  it('returns true for a valid JWT with typ and alg in header', () => {
    expect(looksLikeBearerToken('eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.payload.signature')).toBe(true);
  });

  it('returns false for a plain password without eyJ prefix', () => {
    expect(looksLikeBearerToken('myS3cretPassword!')).toBe(false);
  });

  it('returns false when the token has only 2 segments', () => {
    expect(looksLikeBearerToken('eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.payload')).toBe(false);
  });

  it('returns false when the token has 4 segments', () => {
    expect(looksLikeBearerToken('eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.a.b.c')).toBe(false);
  });

  it('returns false when base64 decodes but JSON.parse throws', () => {
    expect(looksLikeBearerToken('eyJNOT_VALID!!!.payload.sig')).toBe(false);
  });

  it('returns false when header JSON has neither typ nor alg', () => {
    expect(looksLikeBearerToken('eyJmb28iOiJiYXIifQ.payload.sig')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(looksLikeBearerToken('')).toBe(false);
  });
});
