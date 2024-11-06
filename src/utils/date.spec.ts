import { isTimeStamp } from './date';

describe('.date', () => {
  describe('.isTimeStamp', () => {
    it('should return true to valid timestamp', () => {
      const timestamp = new Date(Date.now()).toUTCString();

      const isValidTimeStamp = isTimeStamp(timestamp);

      expect(isValidTimeStamp).toBe(true);
    });

    it('should return false to invalid timestamp', () => {
      const timestamp = 1;

      const isValidTimeStamp = isTimeStamp(timestamp);

      expect(isValidTimeStamp).toBe(false);
    });
  });
});
