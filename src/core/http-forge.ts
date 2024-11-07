/* eslint-disable no-restricted-syntax */
import type {
  HttpForgeHooks,
  HttpForgeInput,
  HttpForgeOptions,
  HttpForgeResponseOptions,
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

  private async applyRetryAfterDelay(error: unknown) {
    const retryAfter = this.parseRetryAfter(error);
    await delay(retryAfter);
  }

  private errorHasRetryAfter(error: unknown) {
    const anyError = error as HttpError;
    const retryAfterHeader = anyError?.response?.headers?.get('Retry-After');
    const errorStatusCode = anyError?.response?.status;

    const hasRetryAfterStatusCode =
      HTTP_ALLOWED_RETRY_AFTER_STATUS_CODES.includes(errorStatusCode);

    return retryAfterHeader && hasRetryAfterStatusCode;
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

  private async executePreResponseHooks(response: Response) {
    const { hooks } = this.httpForgeOptions;

    const preResponseHooks = hooks?.preResponseHooks;

    if (!preResponseHooks?.length) {
      return response;
    }

    let responseResult = response;

    for await (const hook of preResponseHooks) {
      const hookResponse = await hook(responseResult.clone());

      if (hookResponse instanceof Response) {
        responseResult = hookResponse;
      }
    }

    return responseResult;
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

      const responseHook = await this.executePreResponseHooks(response);

      if (!responseHook?.ok) {
        throw new HttpError(response);
      }

      return responseHook.clone()[type]();
    } catch (error) {
      if (this.shouldRetry(error)) {
        this.retryAttempts += 1;
        await this.exponentialBackoff();
        return this.fetch(type);
      }

      if (this.shouldRetryAfter(error)) {
        await this.applyRetryAfterDelay(error);
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

  private isRetryError(error: unknown): boolean {
    const isGenericHttpError = error instanceof HttpError;
    const isTimeoutError = error instanceof TimeoutError;

    return isGenericHttpError && !isTimeoutError;
  }

  private isRetryStatusCode(error: HttpError): boolean {
    const status = error?.response?.status;
    return HTTP_ALLOWED_RETRY_STATUS_CODES.includes(status);
  }

  private parseRetryAfter(error: unknown) {
    const anyError = error as HttpError;
    const retryAfterHeader = anyError?.response?.headers?.get('Retry-After');

    if (isTimeStamp(retryAfterHeader)) {
      return this.getRetryAfterTimeStamp(retryAfterHeader);
    }

    return this.getRetryAfterNumber(retryAfterHeader);
  }

  private resolveHooks(hooks: HttpForgeHooks) {
    if (hooks) return hooks;

    const defaultHooks: HttpForgeHooks = {
      preRequestHooks: [],
      preResponseHooks: [],
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

  private shouldRetry(error: unknown): boolean {
    const isValidRetryAttempt =
      this.retryAttempts < this.httpForgeOptions.retryLength;

    const isValidRetryError = this.isRetryError(error);
    const isValidRetryStatusCode = this.isRetryStatusCode(error as HttpError);

    return isValidRetryAttempt && isValidRetryError && isValidRetryStatusCode;
  }

  private shouldRetryAfter(error: unknown): boolean {
    const isValidRetryError = this.isRetryError(error);
    const isValidRetryAfter = this.errorHasRetryAfter(error);

    return isValidRetryError && isValidRetryAfter;
  }
}
