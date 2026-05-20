/**
 * Get the elements that appear in both arrays
 * @param array1
 * @param array2
 */
export const intersection = (array1: Array<string>, array2: Array<string>): Array<string> => {
  const result: Array<string> = [];
  const map = {};
  for (let i = 0, length = array2.length; i < length; ++i) {
    map[array2[i]] = true;
  }
  for (let i = 0, length = array1.length; i < length; ++i) {
    if (array1[i] in map) {
      result.push(array1[i]);
    }
  }
  return result;
};

/**
 * Heuristic: returns true if the string looks like a Bearer JWT token.
 * Checks: (1) starts with 'eyJ', (2) has exactly 3 dot-separated segments,
 * (3) first segment base64-decodes to a JSON object with 'typ' or 'alg'.
 */
export const looksLikeBearerToken = (password: string): boolean => {
  if (!password.startsWith('eyJ')) return false;
  const parts = password.split('.');
  if (parts.length !== 3) return false;
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf8'));
    return header !== null && typeof header === 'object' && ('typ' in header || 'alg' in header);
  } catch {
    return false;
  }
};
