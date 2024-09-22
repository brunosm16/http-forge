import type { HttpInputType, HttpOptions } from '@/types/http';

import {
  HTTP_FORGE_DEFAULT_RETRY_LENGTH,
  HTTP_FORGE_DEFAULT_TIMEOUT_LENGTH,
  HTTP_FORGE_FIXED_CREDENTIALS,
  RETRY_BACKOFF_FACTOR,
  RETRY_METHODS,
  RETRY_STATUS_CODES,
} from '@/constants';
import { GenericHttpError } from '@/errors';
import { TimeoutError } from '@/errors/timeout-error';
import { delay, timeout } from '@/utils';

export class HttpForge {
  private httpInput: URL | globalThis.Request | string;

  private httpOptions: HttpOptions;

  private retryAttempts: number = 0;

  constructor(httpInput: HttpInputType, httpOptions: HttpOptions) {
    this.httpInput = httpInput;

    this.initializeOptions(httpOptions);

    this.appendJSONBody();
  }

  private appendJSONBody() {
    const { jsonBody } = this.httpOptions;

    if (jsonBody) {
      this.httpOptions.requestHeaders.set('Content-Type', 'application/json');
      this.httpOptions.body = JSON.stringify(jsonBody);
    }
  }

  private async doExponentialBackoff(retryAttempts: number) {
    const backoff = RETRY_BACKOFF_FACTOR * 2 ** retryAttempts;
    return delay(backoff);
  }

  private doFetchWithTimeout() {
    const fetchFn = fetch(this.httpInput, this.httpOptions);
    return timeout(fetchFn, this.httpOptions.timeoutLength);
  }

  private initializeOptions(inputOptions: HttpOptions) {
    const { headers, retryCount, timeoutLength } = inputOptions;

    const normalizedRetry = retryCount ?? HTTP_FORGE_DEFAULT_RETRY_LENGTH;
    const normalizedTimeout =
      timeoutLength ?? HTTP_FORGE_DEFAULT_TIMEOUT_LENGTH;

    const formattedHeaders = new Headers(headers ?? {});

    this.httpOptions = {
      ...inputOptions,
      credentials: HTTP_FORGE_FIXED_CREDENTIALS,
      requestHeaders: formattedHeaders,
      retryCount: normalizedRetry,
      timeoutLength: normalizedTimeout,
    };
  }

  private isRetryError(error: unknown): boolean {
    const isGenericHttpError = error instanceof GenericHttpError;
    const isTimeoutError = error instanceof TimeoutError;

    return isGenericHttpError && !isTimeoutError;
  }

  private isValidRetryStatusCode(error: GenericHttpError): boolean {
    const { statusCode } = error;
    return RETRY_STATUS_CODES.includes(statusCode as number);
  }

  private async retry(fn: () => Promise<Response>, method: string) {
    const normalizedMethod = method.toUpperCase();

    const isMethodAllowedToRetry = RETRY_METHODS.includes(normalizedMethod);

    if (!isMethodAllowedToRetry) {
      return fn;
    }

    try {
      return await fn();
    } catch (error) {
      const isAllowedToRetry = this.shouldRetry(
        error,
        this.retryAttempts,
        this.httpOptions.retryCount
      );

      if (isAllowedToRetry) {
        await this.doExponentialBackoff(this.retryAttempts);

        this.retryAttempts += 1;

        return this.retry(fn, method);
      }

      throw error;
    }
  }

  private shouldRetry(
    error: unknown,
    attempts: number,
    maxLimit: number
  ): boolean {
    const isValidRetryAttempt = attempts < maxLimit;

    return (
      isValidRetryAttempt &&
      this.isRetryError(error) &&
      this.isValidRetryStatusCode(error as GenericHttpError)
    );
  }
}
