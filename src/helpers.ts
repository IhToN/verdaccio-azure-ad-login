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
