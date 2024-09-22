import type { HttpOptions } from '@/types/http';

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
import { delay } from '@/utils';

export class HttpForge {
  private httpOptions: HttpOptions;

  private payload: unknown;

  private retryAttempts: number = 0;

  constructor(payload: unknown, httpOptions: HttpOptions) {
    this.payload = payload;

    this.initializeOptions(httpOptions);

    this.appendJSONBody();
  }

  private appendJSONBody() {
    const { jsonBody } = this.httpOptions;

    if (jsonBody) {
      this.httpOptions.headers.set('Content-Type', 'application/json');
      this.httpOptions.body = JSON.stringify(jsonBody);
    }
  }

  private async doExponentialBackoff(retryAttempts: number) {
    const backoff = RETRY_BACKOFF_FACTOR * 2 ** retryAttempts;
    return delay(backoff);
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
      headers: formattedHeaders,
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
