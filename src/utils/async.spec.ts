import { TimeoutError } from '@/errors/timeout-error';

import { delay, timeout } from './async';

describe('async utilities', () => {
  describe('delay', () => {
    it('should delay execution for the specified time', async () => {
      const start = Date.now();
      await delay(100);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(100);
    });
  });

  describe('timeout', () => {
    it('should resolve the promise if it completes before the timeout', async () => {
      const response = new Response();
      const promise = Promise.resolve(response);
      const result = await timeout(promise, 1000);
      expect(result).toBe(response);
    });

    it('should reject with TimeoutError if the promise does not complete before the timeout', async () => {
      const promise = new Promise<Response>(() => {});
      await expect(timeout(promise, 100)).rejects.toThrow(TimeoutError);
    });
  });
});
