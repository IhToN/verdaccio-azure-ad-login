import { intersection } from '../helpers';

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
