import { deepMerge, isObject } from './object';

describe('Object utils tests', () => {
  describe('isObject', () => {
    it('should return true for objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: 'value' })).toBe(true);
    });

    it('should return false for non-objects', () => {
      expect(isObject(null)).toBe(false);
      expect(isObject(undefined)).toBe(false);
      expect(isObject(42)).toBe(false);
      expect(isObject('string')).toBe(false);
    });
  });

  describe('deepMerge', () => {
    it('should merge two objects', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 3, c: 4 };
      const result = deepMerge(obj1, obj2);
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should merge nested objects', () => {
      const obj1 = { a: { b: 1 } };
      const obj2 = { a: { c: 2 } };
      const result = deepMerge(obj1, obj2);
      expect(result).toEqual({ a: { b: 1, c: 2 } });
    });

    it('should handle non-object inputs', () => {
      const obj = { a: 1 };
      const nonObj = 42;
      const result = deepMerge(obj, nonObj);
      expect(result).toEqual({ a: 1 });
    });

    it('should handle empty inputs', () => {
      const result = deepMerge();
      expect(result).toEqual({});
    });
  });
});
