/* eslint-disable no-restricted-syntax */
import type {
  FileTransferHookFunction,
  HttpForgeHooks,
  HttpForgeInput,
  HttpForgeOptions,
  HttpForgeResponseOptions,
  HttpForgeSearchParams,
  HttpSupportedResponses,
  RetryPolicyConfig,
} from '@/types/http';

import {
  HTTP_FORGE_DEFAULT_CREDENTIALS,
  HTTP_FORGE_DEFAULT_RETRY_AFTER_DELAY,
  HTTP_FORGE_DEFAULT_RETRY_BACKOFF_DELAY,
  HTTP_FORGE_DEFAULT_RETRY_BACKOFF_FACTOR,
  HTTP_FORGE_DEFAULT_TIMEOUT_LENGTH,
  HTTP_SUPPORTED_RESPONSES,
} from '@/constants';
import { HttpError, TimeoutError } from '@/errors';
import { delay, isTimeStamp, timeout } from '@/utils';

import { buildRetryPolicyConfig } from './retry-policy';
import { makeReadTransferStream } from './streams';

export class HttpForge {
  private httpForgeInput: HttpForgeInput;

  private httpForgeOptions: HttpForgeOptions;

  private retryAttempts: number = 0;

  constructor(
    httpForgeInput: HttpForgeInput,
    httpForgeOptions: HttpForgeOptions
  ) {
    this.initializeOptions(httpForgeOptions);

    this.initializeSignal();

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
    const { body, jsonBody } = this.httpForgeOptions;

    if (jsonBody && body) {
      throw new Error(
        `The property 'body' cannot be used together with the 'jsonBody' property.`
      );
    }

    if (jsonBody) {
      this.httpForgeOptions.requestHeaders.set(
        'Content-Type',
        'application/json'
      );
      this.httpForgeOptions.body = JSON.stringify(jsonBody);
    }
  }

  private appendPrefixToInput(httpForgeInput: HttpForgeInput) {
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

    const { searchParams } = this.httpForgeOptions;

    if (searchParams) {
      return this.appendSearchParamsToInput(searchParams, normalizedInput);
    }

    return normalizedInput;
  }

  private appendSearchParamsToInput(
    searchParams: HttpForgeSearchParams,
    httpInput: string
  ) {
    const resolvedSearchParams = this.resolveSearchParams(searchParams);

    const url = new URL(httpInput);

    url.search = resolvedSearchParams.toString();

    return url.toString();
  }

  private async applyRetryAfterDelay(
    error: unknown,
    retryPolicy: RetryPolicyConfig
  ) {
    const retryAfter = this.parseRetryAfter(error);

    if (retryAfter > retryPolicy?.retryAfterLimit) {
      return;
    }

    await delay(retryAfter);
  }

  private errorHasRetryAfter(error: unknown) {
    const anyError = error as HttpError;
    const retryAfterHeader = anyError?.response?.headers?.get('Retry-After');
    const errorStatusCode = anyError?.response?.status;

    const { allowedRetryAfterStatusCodes } = this.httpForgeOptions.retryPolicy;

    const hasRetryAfterStatusCode =
      allowedRetryAfterStatusCodes.includes(errorStatusCode);

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

    const { fileTransferHook, preResponseHooks } = hooks;

    if (!preResponseHooks?.length) {
      if (fileTransferHook) {
        return this.streamFileTransfer(response, fileTransferHook);
      }

      return response;
    }

    let responseResult = response;

    for await (const hook of preResponseHooks) {
      const hookResponse = await hook(responseResult.clone());

      if (hookResponse instanceof Response) {
        responseResult = hookResponse;
      }
    }

    if (fileTransferHook) {
      return this.streamFileTransfer(responseResult, fileTransferHook);
    }

    return responseResult;
  }

  private async executePreRetryHooks(
    input: HttpForgeInput,
    retryAttempts: number,
    error: Error,
    options: HttpForgeOptions
  ): Promise<void> {
    const { preRetryHooks } = options.hooks;

    if (preRetryHooks?.length) {
      for await (const hook of preRetryHooks) {
        await hook(input, retryAttempts, error, options);
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

      const { abortController, timeoutLength } = this.httpForgeOptions;

      const response = await timeout(fetchFn, timeoutLength, abortController);

      const responseHook = await this.executePreResponseHooks(response);

      if (!responseHook?.ok) {
        throw new HttpError(responseHook);
      }

      return responseHook.clone()[type]();
    } catch (error) {
      if (this.shouldRetryAfter(error)) {
        this.retryAttempts += 1;
        await this.applyRetryAfterDelay(
          error,
          this.httpForgeOptions?.retryPolicy
        );
        await this.executePreRetryHooks(
          this.httpForgeInput,
          this.retryAttempts,
          error,
          this.httpForgeOptions
        );
        return this.fetch(type);
      }

      if (this.shouldRetry(error)) {
        this.retryAttempts += 1;
        await this.exponentialBackoff();
        await this.executePreRetryHooks(
          this.httpForgeInput,
          this.retryAttempts,
          error,
          this.httpForgeOptions
        );
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

  private initializeAbortController() {
    const abortController = new AbortController();
    this.httpForgeOptions.abortController = abortController;
  }

  private initializeInput(httpForgeInput: HttpForgeInput) {
    const prefixedURL = this.appendPrefixToInput(httpForgeInput);

    const { searchParams } = this.httpForgeOptions;

    if (searchParams) {
      return this.appendSearchParamsToInput(searchParams, prefixedURL);
    }

    return prefixedURL;
  }

  private initializeOptions(options: HttpForgeOptions) {
    const {
      headers,
      hooks,
      prefixURL,
      retryPolicy,
      searchParams,
      shouldHandleHttpErrors = true,
      signal,
      timeoutLength,
    } = options;

    const resolvedRetry = buildRetryPolicyConfig(retryPolicy);

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
      retryPolicy: resolvedRetry,
      searchParams,
      shouldHandleHttpErrors,
      signal,
      timeoutLength: resolvedTimeout,
    };
  }

  private initializeSignal() {
    const { signal } = this.httpForgeOptions;

    if (!signal) {
      return;
    }

    this.initializeAbortController();

    const { abortController } = this.httpForgeOptions;

    const optionSignal = signal;

    optionSignal.addEventListener('abort', () => {
      abortController?.abort();
    });

    this.httpForgeOptions.signal = abortController.signal;
  }

  private isRetryError(error: unknown): boolean {
    const isGenericHttpError = error instanceof HttpError;
    const isTimeoutError = error instanceof TimeoutError;

    return isGenericHttpError && !isTimeoutError;
  }

  private isRetryMethod(method: string) {
    const { allowedRetryMethods } = this.httpForgeOptions.retryPolicy;

    return allowedRetryMethods.includes(method?.toLowerCase());
  }

  private isRetryStatusCode(error: HttpError): boolean {
    const { allowedRetryStatusCodes } = this.httpForgeOptions.retryPolicy;
    const status = error?.response?.status;
    return allowedRetryStatusCodes.includes(status);
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
      preRetryHooks: [],
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

  private resolveSearchParams(searchParams: HttpForgeSearchParams) {
    if (!searchParams) {
      return null;
    }

    return new URLSearchParams(searchParams);
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
    const { retryLength } = this.httpForgeOptions.retryPolicy;

    const isValidRetryAttempt = this.retryAttempts < retryLength;

    const isValidRetryError = this.isRetryError(error);
    const isValidRetryStatusCode = this.isRetryStatusCode(error as HttpError);
    const isValidRetryMethod = this.isRetryMethod(
      this.httpForgeOptions?.method
    );

    return (
      isValidRetryAttempt &&
      isValidRetryError &&
      isValidRetryStatusCode &&
      isValidRetryMethod
    );
  }

  private shouldRetryAfter(error: unknown): boolean {
    const isValidRetryError = this.isRetryError(error);
    const isValidRetryAfter = this.errorHasRetryAfter(error);
    const isValidRetryMethod = this.isRetryMethod(
      this.httpForgeOptions?.method
    );
    return isValidRetryError && isValidRetryAfter && isValidRetryMethod;
  }

  private streamFileTransfer(
    response: Response,
    fileTransferHook: FileTransferHookFunction
  ) {
    const readTransferStream = makeReadTransferStream(
      response,
      fileTransferHook
    );

    return new Response(readTransferStream);
  }
}
