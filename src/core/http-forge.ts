import type {
  HttpForgeInput,
  HttpForgeOptions,
  HttpForgeResponses,
} from '@/types/http';

import {
  HTTP_ALLOWED_RETRY_STATUS_CODES,
  HTTP_FORGE_DEFAULT_CREDENTIALS,
  HTTP_FORGE_DEFAULT_METHOD,
  HTTP_FORGE_DEFAULT_RETRY_LENGTH,
  HTTP_FORGE_DEFAULT_TIMEOUT_LENGTH,
} from '@/constants';
import { HttpError, TimeoutError } from '@/errors';

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

  private shouldRetry(
    error: unknown,
    attempts: number,
    maxLimit: number
  ): boolean {
    const isValidRetryAttempt = attempts < maxLimit;

    return (
      isValidRetryAttempt &&
      this.isRetryError(error) &&
      this.isRetryStatusCode(error as HttpError)
    );
  }

  public getResponse() {
    return this.responses;
  }
}
