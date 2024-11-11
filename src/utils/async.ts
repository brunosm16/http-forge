import { TimeoutError } from '@/errors/timeout-error';

/* eslint-disable no-promise-executor-return */
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const timeout = (
  fn: Promise<Response>,
  timeoutLength: number,
  abortController?: AbortController
): Promise<Response> =>
  new Promise((resolve, reject) => {
    fn.then(resolve, reject);

    (async () => {
      await delay(timeoutLength);

      if (abortController) {
        setTimeout(() => abortController.abort(), 1);
      }

      reject(new TimeoutError());
    })();
  });
