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
  DEFAULT_DELAY_AFTER_MS,
  DEFAULT_HTTP_BACKOFF_DELAY_MS,
  DEFAULT_HTTP_CREDENTIALS,
  DEFAULT_HTTP_DELAY_FACTOR,
  DEFAULT_HTTP_TIMEOUT_MS,
  SUPPORTED_HTTP_RESPONSES,
} from '@/constants';
import { CustomRequestSignals } from '@/enums';
import { HttpError, TimeoutError } from '@/errors';
import { delay, isTimeStamp, timeout } from '@/utils';

import { buildRetryPolicyConfig } from './retry-policy';
import { makeReadTransferStream } from './streams';

export class HttpForge {
  private haltRequest: boolean = false;

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

  private async doRetry(
    error: Error,
    type: HttpSupportedResponses,
    shouldHandleHttpErrors: boolean
  ) {
    this.retryAttempts += 1;
    await this.exponentialBackoff();
    await this.executePreRetryHooks(
      this.httpForgeInput,
      this.retryAttempts,
      error,
      this.httpForgeOptions
    );

    if (this.haltRequest) {
      if (shouldHandleHttpErrors) {
        throw error;
      }
      return error;
    }

    return this.fetch(type);
  }

  private async doRetryAfter(
    error: Error,
    type: HttpSupportedResponses,
    shouldHandleHttpErrors: boolean
  ) {
    this.retryAttempts += 1;
    await this.applyRetryAfterDelay(error, this.httpForgeOptions?.retryPolicy);
    await this.executePreRetryHooks(
      this.httpForgeInput,
      this.retryAttempts,
      error,
      this.httpForgeOptions
    );

    if (this.haltRequest) {
      if (shouldHandleHttpErrors) {
        throw error;
      }
      return error;
    }

    return this.fetch(type);
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

    const { jsonParser } = this.httpForgeOptions;

    if (this.httpForgeOptions.jsonParser) {
      responseResult.json = async () => {
        return this.useJsonParser(responseResult, jsonParser);
      };
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
        const resultHook = await hook(input, retryAttempts, error, options);

        if (resultHook === CustomRequestSignals.HALT_REQUEST_SIGNAL) {
          this.haltRequest = true;
          return;
        }
      }
    }
  }

  private async exponentialBackoff() {
    const backoff =
      DEFAULT_HTTP_BACKOFF_DELAY_MS *
      DEFAULT_HTTP_DELAY_FACTOR ** this.retryAttempts;

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

  private async fetch(
    type: HttpSupportedResponses
  ): Promise<Error | Response | unknown> {
    try {
      await this.executePreRequestHooks();

      const fetchFn = fetch(this.httpForgeInput, this.httpForgeOptions);

      const { abortController, timeoutLength } = this.httpForgeOptions;

      const response = await timeout(fetchFn, timeoutLength, abortController);

      const responseHook = await this.executePreResponseHooks(response);

      if (!responseHook?.ok) {
        throw new HttpError(responseHook);
      }

      return await this.normalizeResponse(responseHook, type);
    } catch (error) {
      const { shouldHandleHttpErrors } = this.httpForgeOptions;

      if (this.shouldRetryAfter(error)) {
        return this.doRetryAfter(error, type, shouldHandleHttpErrors);
      }

      if (this.shouldRetry(error)) {
        return this.doRetry(error, type, shouldHandleHttpErrors);
      }

      if (shouldHandleHttpErrors) {
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

    const retryAfterDelay = retryAfter * DEFAULT_DELAY_AFTER_MS;

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

    const resolvedTimeout = timeoutLength ?? DEFAULT_HTTP_TIMEOUT_MS;

    const resolvedHeaders = new Headers(headers ?? {});

    const resolvedHooks = this.resolveHooks(hooks);

    const resolvedPrefixURL = this.resolvePrefixURL(prefixURL);

    this.httpForgeOptions = {
      ...options,
      credentials: DEFAULT_HTTP_CREDENTIALS,
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

  private async normalizeResponse(
    response: Response,
    type: HttpSupportedResponses
  ) {
    const { jsonParser } = this.httpForgeOptions;

    if (response.status === 204 && type === 'json') {
      return '';
    }

    if (type === 'json' && jsonParser) {
      return this.useJsonParser(response, jsonParser);
    }

    return response.clone()[type]();
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
    const responses = SUPPORTED_HTTP_RESPONSES.reduce(
      (acc: HttpForgeResponseOptions, type: HttpSupportedResponses) => {
        const updatedAcc = {
          ...acc,
          [type]: () => this.fetch(type),
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

  private async useJsonParser(
    response: Response,
    jsonParser: (data: string) => unknown
  ) {
    const textResponse = await response.text();
    return jsonParser(textResponse);
  }
}
