import type {
  HttpForgeInput,
  HttpForgeOptions,
  HttpForgeResponseOptions,
  HttpForgeResponses,
  HttpSupportedResponses,
} from '@/types/http';

import {
  HTTP_ALLOWED_RETRY_STATUS_CODES,
  HTTP_FORGE_DEFAULT_CREDENTIALS,
  HTTP_FORGE_DEFAULT_METHOD,
  HTTP_FORGE_DEFAULT_RETRY_BACKOFF_FACTOR,
  HTTP_FORGE_DEFAULT_RETRY_LENGTH,
  HTTP_FORGE_DEFAULT_TIMEOUT_LENGTH,
  HTTP_SUPPORTED_RESPONSES,
} from '@/constants';
import { HttpError, TimeoutError } from '@/errors';
import { delay, timeout } from '@/utils';

export class HttpForge {
  private httpForgeInput: HttpForgeInput;

  private httpForgeOptions: HttpForgeOptions;

  private responses: HttpForgeResponses;

  private retryAttempts: number = 0;

  constructor(
    httpForgeInput: HttpForgeInput,
    httpForgeOptions: HttpForgeOptions
  ) {
    this.httpForgeInput = httpForgeInput;

    this.initializeOptions(httpForgeOptions);

    this.appendJSONBody();
  }

  private appendJSONBody() {
    const { jsonBody } = this.httpForgeOptions;

    if (jsonBody) {
      this.httpForgeOptions.requestHeaders.set(
        'Content-Type',
        'application/json'
      );
      this.httpForgeOptions.body = JSON.stringify(jsonBody);
    }
  }

  private async exponentialBackoff() {
    const backoff =
      HTTP_FORGE_DEFAULT_RETRY_BACKOFF_FACTOR * 2 ** this.retryAttempts;
    return delay(backoff);
  }

  private async fetch(type: keyof HttpSupportedResponses): Promise<Response> {
    try {
      const fetchFn = fetch(this.httpForgeInput, this.httpForgeOptions);

      const { timeoutLength } = this.httpForgeOptions;

      const response = await timeout(fetchFn, timeoutLength);

      if (!response?.ok) {
        throw new HttpError(response);
      }

      const clonedResponse = response.clone()[type];

      return clonedResponse();
    } catch (error) {
      if (this.shouldRetry(error)) {
        await this.exponentialBackoff();
        return this.fetch(type);
      }

      throw error;
    }
  }

  private initializeOptions(options: HttpForgeOptions) {
    const { headers, method, retryLength, timeoutLength } = options;

    const resolvedRetry = retryLength ?? HTTP_FORGE_DEFAULT_RETRY_LENGTH;

    const resolvedTimeout = timeoutLength ?? HTTP_FORGE_DEFAULT_TIMEOUT_LENGTH;

    const resolvedMethod = method ?? HTTP_FORGE_DEFAULT_METHOD;

    const resolvedHeaders = new Headers(headers ?? {});

    this.httpForgeOptions = {
      ...options,
      credentials: HTTP_FORGE_DEFAULT_CREDENTIALS,
      method: resolvedMethod,
      requestHeaders: resolvedHeaders,
      retryLength: resolvedRetry,
      timeoutLength: resolvedTimeout,
    };
  }

  private isRetryError(error: unknown): boolean {
    const isGenericHttpError = error instanceof HttpError;
    const isTimeoutError = error instanceof TimeoutError;

    return isGenericHttpError && !isTimeoutError;
  }

  private isRetryStatusCode(error: HttpError): boolean {
    const { status } = error;
    return HTTP_ALLOWED_RETRY_STATUS_CODES.includes(status);
  }

  private responseOptions() {
    const responses = HTTP_SUPPORTED_RESPONSES.reduce(
      (acc: HttpForgeResponseOptions, type: HttpSupportedResponses) => {
        const updatedAcc = {
          ...acc,
          [type]: () => this.fetch(type as keyof HttpSupportedResponses),
        };

        return updatedAcc;
      },
      {} as HttpForgeResponseOptions
    );

    return responses;
  }

  private shouldRetry(error: unknown): boolean {
    const isValidRetryAttempt =
      this.retryAttempts < this.httpForgeOptions.retryLength;

    return (
      isValidRetryAttempt &&
      this.isRetryError(error) &&
      this.isRetryStatusCode(error as HttpError)
    );
  }
}
