import type {
  HttpInputType,
  HttpOptions,
  HttpResponsesTypes,
} from '@/types/http';

import {
  HTTP_FORGE_DEFAULT_RETRY_LENGTH,
  HTTP_FORGE_DEFAULT_TIMEOUT_LENGTH,
  HTTP_FORGE_FIXED_CREDENTIALS,
  HTTP_RESPONSES_TYPES,
  RETRY_BACKOFF_FACTOR,
  RETRY_METHODS,
  RETRY_STATUS_CODES,
} from '@/constants';
import { GenericHttpError } from '@/errors';
import { TimeoutError } from '@/errors/timeout-error';
import { delay, timeout } from '@/utils';

export class HttpForge {
  private httpInput: HttpInputType;

  private httpOptions: HttpOptions;

  private responses: Record<HttpResponsesTypes, Promise<Response>>;

  private retryAttempts: number = 0;

  constructor(httpInput: HttpInputType, httpOptions: HttpOptions) {
    this.httpInput = httpInput;

    this.initializeOptions(httpOptions);

    this.appendJSONBody();

    this.mapResponsesByType();
  }

  private appendJSONBody() {
    const { jsonBody } = this.httpOptions;

    if (jsonBody) {
      this.httpOptions.requestHeaders.set('Content-Type', 'application/json');
      this.httpOptions.body = JSON.stringify(jsonBody);
    }
  }

  private async exponentialBackoff(retryAttempts: number) {
    const backoff = RETRY_BACKOFF_FACTOR * 2 ** retryAttempts;
    return delay(backoff);
  }

  private async fetchWithRetry(
    fetch: () => Promise<Response>,
    responseType: HttpResponsesTypes,
    method: string
  ) {
    const retryFn = async () => {
      const response = await fetch();

      if (!response?.ok) {
        throw new GenericHttpError(response);
      }

      return response.clone()[responseType]();
    };

    return this.retry(retryFn, method);
  }

  private fetchWithTimeout() {
    const fetchFn = fetch(this.httpInput, this.httpOptions);
    return timeout(
      fetchFn,
      this.httpOptions.timeoutLength
    ) as Promise<Response>;
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
    const { status } = error;
    return RETRY_STATUS_CODES.includes(status);
  }

  private mapResponsesByType() {
    const responses = HTTP_RESPONSES_TYPES.reduce(
      (
        acc: Record<HttpResponsesTypes, Promise<Response>>,
        type: HttpResponsesTypes
      ) => {
        const { method } = this.httpOptions;

        const updatedAcc = {
          ...acc,
          [type]: this.fetchWithRetry(this.fetchWithTimeout, type, method),
        };

        return updatedAcc;
      },
      {} as Record<HttpResponsesTypes, Promise<Response>>
    );

    this.responses = responses;
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
        await this.exponentialBackoff(this.retryAttempts);

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

  public getResponse() {
    return this.responses;
  }
}
