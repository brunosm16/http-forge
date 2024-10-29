import type {
  HttpForgeInput,
  HttpForgeOptions,
  HttpForgeResponseOptions,
  HttpSupportedResponses,
} from '@/types/http';

import {
  HTTP_ALLOWED_RETRY_STATUS_CODES,
  HTTP_FORGE_DEFAULT_CREDENTIALS,
  HTTP_FORGE_DEFAULT_RETRY_BACKOFF_DELAY,
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

  private retryAttempts: number = 0;

  constructor(
    httpForgeInput: HttpForgeInput,
    httpForgeOptions: HttpForgeOptions
  ) {
    this.httpForgeInput = httpForgeInput;

    this.initializeOptions(httpForgeOptions);

    this.appendJSONBody();
  }

  static createHttpForge(
    httpInput: HttpForgeInput,
    httpForgeOptions?: HttpForgeOptions
  ) {
    const httpForge = new HttpForge(httpInput, httpForgeOptions);
    return httpForge.responseOptions();
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

  private async executePreRequestHooks() {
    const { hooks } = this.httpForgeOptions;

    hooks.preRequestHooks.forEach(async (hook) => {
      await hook(this.httpForgeOptions);
    });
  }

  private async exponentialBackoff() {
    const backoff =
      HTTP_FORGE_DEFAULT_RETRY_BACKOFF_DELAY *
      HTTP_FORGE_DEFAULT_RETRY_BACKOFF_FACTOR ** this.retryAttempts;

    await delay(backoff);
  }

  private async fetch(type: keyof HttpSupportedResponses): Promise<Response> {
    try {
      await this.executePreRequestHooks();

      const fetchFn = fetch(this.httpForgeInput, this.httpForgeOptions);

      const { timeoutLength } = this.httpForgeOptions;

      const response = await timeout(fetchFn, timeoutLength);

      if (!response?.ok) {
        throw new HttpError(response);
      }

      return response.clone()[type]();
    } catch (error) {
      if (this.shouldRetry(error)) {
        this.retryAttempts += 1;
        await this.exponentialBackoff();
        return this.fetch(type);
      }

      if (this.httpForgeOptions.shouldHandleHttpErrors) {
        throw error;
      }

      return error;
    }
  }

  private initializeOptions(options: HttpForgeOptions) {
    const {
      headers,
      retryLength,
      shouldHandleHttpErrors = true,
      timeoutLength,
    } = options;

    const resolvedRetry = retryLength ?? HTTP_FORGE_DEFAULT_RETRY_LENGTH;

    const resolvedTimeout = timeoutLength ?? HTTP_FORGE_DEFAULT_TIMEOUT_LENGTH;

    const resolvedHeaders = new Headers(headers ?? {});

    this.httpForgeOptions = {
      ...options,
      credentials: HTTP_FORGE_DEFAULT_CREDENTIALS,
      requestHeaders: resolvedHeaders,
      retryLength: resolvedRetry,
      shouldHandleHttpErrors,
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
