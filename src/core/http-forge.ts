/* eslint-disable no-restricted-syntax */
import type {
  HttpForgeInput,
  HttpForgeOptions,
  HttpForgeResponseOptions,
  HttpRequestHooks,
  HttpSupportedResponses,
} from '@/types/http';

import {
  HTTP_ALLOWED_RETRY_AFTER_STATUS_CODES,
  HTTP_ALLOWED_RETRY_STATUS_CODES,
  HTTP_FORGE_DEFAULT_CREDENTIALS,
  HTTP_FORGE_DEFAULT_RETRY_AFTER_DELAY,
  HTTP_FORGE_DEFAULT_RETRY_BACKOFF_DELAY,
  HTTP_FORGE_DEFAULT_RETRY_BACKOFF_FACTOR,
  HTTP_FORGE_DEFAULT_RETRY_LENGTH,
  HTTP_FORGE_DEFAULT_TIMEOUT_LENGTH,
  HTTP_SUPPORTED_RESPONSES,
} from '@/constants';
import { HttpError, TimeoutError } from '@/errors';
import { delay, isTimeStamp, timeout } from '@/utils';

export class HttpForge {
  private httpForgeInput: HttpForgeInput;

  private httpForgeOptions: HttpForgeOptions;

  private retryAttempts: number = 0;

  constructor(
    httpForgeInput: HttpForgeInput,
    httpForgeOptions: HttpForgeOptions
  ) {
    this.initializeOptions(httpForgeOptions);

    this.httpForgeInput = this.initializeInput(httpForgeInput);

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

  private async delayRetry(error: any) {
    if (this.isRetryAfter(error)) {
      await this.retryAfter(error);
      return;
    }

    await this.exponentialBackoff();
  }

  private async executePreRequestHooks() {
    const { hooks } = this.httpForgeOptions;

    const preRequestHooks = hooks?.preRequestHooks;

    if (preRequestHooks?.length) {
      for await (const hook of preRequestHooks) {
        await hook(this.httpForgeOptions);
      }
    }
  }

  private async exponentialBackoff() {
    const backoff =
      HTTP_FORGE_DEFAULT_RETRY_BACKOFF_DELAY *
      HTTP_FORGE_DEFAULT_RETRY_BACKOFF_FACTOR ** this.retryAttempts;

    await delay(backoff);
  }

  private extractUrlFromHttpForgeInput(httpForgeInput: HttpForgeInput) {
    if (httpForgeInput instanceof URL) {
      return httpForgeInput.toString();
    }

    if (httpForgeInput instanceof Request) {
      return httpForgeInput.url;
    }

    return httpForgeInput;
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
        await this.delayRetry(error);
        return this.fetch(type);
      }

      if (this.httpForgeOptions.shouldHandleHttpErrors) {
        throw error;
      }

      return error;
    }
  }

  private getRetryAfterNumber(retryAfter: any) {
    const retryAfterNumber = Number(retryAfter);

    if (Number.isNaN(retryAfterNumber)) {
      throw new Error(`'Retry-After' header must be a number or a timestamp`);
    }

    const retryAfterDelay = retryAfter * HTTP_FORGE_DEFAULT_RETRY_AFTER_DELAY;

    return retryAfterDelay;
  }

  private getRetryAfterTimeStamp(retryAfterHeader: any) {
    return Date.parse(retryAfterHeader) - Date.now();
  }

  private initializeInput(httpForgeInput: HttpForgeInput) {
    const { prefixURL } = this.httpForgeOptions;

    const urlInput = this.extractUrlFromHttpForgeInput(httpForgeInput);

    if (!prefixURL) {
      return urlInput;
    }

    if (urlInput?.startsWith('/')) {
      throw new Error(
        `'HttpForgeInput' cannot starts with '/' when using a prefixURL`
      );
    }

    const normalizedInput = prefixURL + urlInput;

    return normalizedInput;
  }

  private initializeOptions(options: HttpForgeOptions) {
    const {
      headers,
      hooks,
      prefixURL,
      retryLength,
      shouldHandleHttpErrors = true,
      timeoutLength,
    } = options;

    const resolvedRetry = retryLength ?? HTTP_FORGE_DEFAULT_RETRY_LENGTH;

    const resolvedTimeout = timeoutLength ?? HTTP_FORGE_DEFAULT_TIMEOUT_LENGTH;

    const resolvedHeaders = new Headers(headers ?? {});

    const resolvedHooks = this.resolveHooks(hooks);

    const resolvedPrefixURL = this.resolvePrefixURL(prefixURL);

    this.httpForgeOptions = {
      ...options,
      credentials: HTTP_FORGE_DEFAULT_CREDENTIALS,
      hooks: resolvedHooks,
      prefixURL: resolvedPrefixURL,
      requestHeaders: resolvedHeaders,
      retryLength: resolvedRetry,
      shouldHandleHttpErrors,
      timeoutLength: resolvedTimeout,
    };
  }

  private isRetryAfter(error: unknown) {
    const anyError = error as any;
    const retryAfterHeader = anyError?.response?.headers?.get('Retry-After');
    const errorStatusCode = anyError?.response?.status;

    const hasRetryAfterStatusCode =
      HTTP_ALLOWED_RETRY_AFTER_STATUS_CODES.includes(errorStatusCode);

    return retryAfterHeader && hasRetryAfterStatusCode;
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

  private parseRetryAfter(error: any) {
    const anyError = error as any;
    const retryAfterHeader = anyError?.response?.headers?.get('Retry-After');

    if (isTimeStamp(retryAfterHeader)) {
      return this.getRetryAfterTimeStamp(retryAfterHeader);
    }

    return this.getRetryAfterNumber(retryAfterHeader);
  }

  private resolveHooks(hooks: HttpRequestHooks) {
    if (hooks) return hooks;

    const defaultHooks: HttpRequestHooks = {
      preRequestHooks: [],
    };

    return defaultHooks;
  }

  private resolvePrefixURL(prefix: HttpForgeInput | null) {
    if (!prefix) return null;

    const prefixString = this.extractUrlFromHttpForgeInput(prefix);

    if (!prefixString.endsWith('/')) {
      const normalizedPrefix = prefixString.concat('/');
      return normalizedPrefix;
    }

    return prefix;
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

  private async retryAfter(error: unknown) {
    const retryAfter = this.parseRetryAfter(error);
    await delay(retryAfter);
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
