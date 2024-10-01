import { TimeoutError } from '@/errors/timeout-error';

/* eslint-disable no-promise-executor-return */
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const timeout = (
  fn: Promise<Response>,
  timeoutLength: number
): Promise<Response> =>
  new Promise((resolve, reject) => {
    fn.then(resolve, reject);

    (async () => {
      await delay(timeoutLength);

      reject(new TimeoutError());
    })();
  });
