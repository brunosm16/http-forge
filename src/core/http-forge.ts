/* eslint-disable no-restricted-syntax */
import type {
  HttpRequestConfig,
  RequestHooks,
  RequestSource,
  ResponseHandlerMap,
  SupportedHTTPResponses,
  TransferHook,
} from '@/types';

import {
  DEFAULT_HTTP_BACKOFF_DELAY_MS,
  DEFAULT_HTTP_CREDENTIALS,
  DEFAULT_HTTP_DELAY_FACTOR,
  DEFAULT_HTTP_TIMEOUT_MS,
  SUPPORTED_HTTP_RESPONSES,
} from '@/constants';
import { RequestSignals, RetryType } from '@/enums';
import { HttpError, TimeoutError } from '@/errors';
import { delay, timeout } from '@/utils';
import {
  appendPrefixToRequestSource,
  appendSearchParamsToURL,
} from '@/utils/url';

import { applyRetryAfterDelay, buildRetryPolicyConfig } from './retry-policy';
import { makeReadTransferStream } from './streams';

export class HttpForge {
  private haltRequest: boolean = false;

  private requestConfig: HttpRequestConfig;

  private requestSource: RequestSource;

  private retryAttempts: number = 0;

  constructor(requestSource: RequestSource, requestConfig: HttpRequestConfig) {
    this.prepareRequestConfig(requestConfig);

    this.initializeSignal();

    this.requestSource = this.prepareRequestSource(requestSource);

    this.appendJSONBody();
  }

  static createHttpForgeInstance(
    requestSource: RequestSource,
    requestConfig?: HttpRequestConfig
  ): ResponseHandlerMap {
    const httpForge = new HttpForge(requestSource, requestConfig);
    return httpForge.mapResponseHandlers();
  }

  private appendJSONBody() {
    const { body, jsonBody } = this.requestConfig;

    if (jsonBody && body) {
      throw new Error(
        `The property 'body' cannot be used together with the 'jsonBody' property.`
      );
    }

    if (jsonBody) {
      this.requestConfig.requestHeaders.set('Content-Type', 'application/json');
      this.requestConfig.body = JSON.stringify(jsonBody);
    }
  }

  private async doRetry(
    error: Error,
    type: SupportedHTTPResponses,
    shouldHandleHttpErrors: boolean,
    retryType: RetryType
  ) {
    this.retryAttempts += 1;

    await this.getRetryDelayFn(retryType, error);

    await this.executePreRetryHooks(
      this.requestSource,
      this.retryAttempts,
      error,
      this.requestConfig
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

    const { allowedRetryAfterStatusCodes } = this.requestConfig.retryPolicy;

    const hasRetryAfterStatusCode =
      allowedRetryAfterStatusCodes.includes(errorStatusCode);

    return retryAfterHeader && hasRetryAfterStatusCode;
  }

  private async executePreRequestHooks() {
    const { hooks } = this.requestConfig;

    const preRequestHooks = hooks?.preRequestHooks;

    if (preRequestHooks?.length) {
      for await (const hook of preRequestHooks) {
        await hook(this.requestConfig);
      }
    }
  }

  private async executePreResponseHooks(response: Response) {
    const { hooks } = this.requestConfig;

    const { preResponseHooks, transferHook: fileTransferHook } = hooks;

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

    const { jsonParser } = this.requestConfig;

    if (this.requestConfig.jsonParser) {
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
    requestSource: RequestSource,
    retryAttempts: number,
    error: Error,
    requestConfig: HttpRequestConfig
  ): Promise<void> {
    const { preRetryHooks } = requestConfig.hooks;

    if (preRetryHooks?.length) {
      for await (const hook of preRetryHooks) {
        const resultHook = await hook(
          requestSource,
          retryAttempts,
          error,
          requestConfig
        );

        if (resultHook === RequestSignals.HALT_REQUEST_SIGNAL) {
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

  private extractURLFromRequestSource(requestSource: RequestSource) {
    if (requestSource instanceof URL) {
      return requestSource.toString();
    }

    if (requestSource instanceof Request) {
      return requestSource.url;
    }

    return requestSource;
  }

  private async fetch(
    type: SupportedHTTPResponses
  ): Promise<Error | Response | unknown> {
    try {
      await this.executePreRequestHooks();

      const fetchFn = fetch(this.requestSource, this.requestConfig);

      const { abortController, timeoutLength } = this.requestConfig;

      const response = await timeout(fetchFn, timeoutLength, abortController);

      const responseHook = await this.executePreResponseHooks(response);

      if (!responseHook?.ok) {
        throw new HttpError(responseHook);
      }

      return await this.normalizeResponse(responseHook, type);
    } catch (error) {
      const { shouldHandleHttpErrors } = this.requestConfig;

      if (this.shouldRetryAfter(error)) {
        return this.doRetry(
          error,
          type,
          shouldHandleHttpErrors,
          RetryType.RETRY_AFTER
        );
      }

      if (this.shouldRetry(error)) {
        return this.doRetry(
          error,
          type,
          shouldHandleHttpErrors,
          RetryType.RETRY
        );
      }

      if (shouldHandleHttpErrors) {
        throw error;
      }

      return error;
    }
  }

  private async getRetryDelayFn(retryType: RetryType, error: Error) {
    if (retryType === RetryType.RETRY) {
      return this.exponentialBackoff();
    }

    return applyRetryAfterDelay(error, this.requestConfig.retryPolicy);
  }

  private initializeAbortController() {
    const abortController = new AbortController();
    this.requestConfig.abortController = abortController;
  }

  private initializeSignal() {
    const { signal } = this.requestConfig;

    if (!signal) {
      return;
    }

    this.initializeAbortController();

    const { abortController } = this.requestConfig;

    const requestConfigSinal = signal;

    requestConfigSinal.addEventListener('abort', () => {
      abortController?.abort();
    });

    this.requestConfig.signal = abortController.signal;
  }

  private isRetryError(error: unknown): boolean {
    const isGenericHttpError = error instanceof HttpError;
    const isTimeoutError = error instanceof TimeoutError;

    return isGenericHttpError && !isTimeoutError;
  }

  private isRetryMethod(method: string) {
    const { allowedRetryMethods } = this.requestConfig.retryPolicy;

    return allowedRetryMethods.includes(method?.toLowerCase());
  }

  private isRetryStatusCode(error: HttpError): boolean {
    const { allowedRetryStatusCodes } = this.requestConfig.retryPolicy;
    const status = error?.response?.status;
    return allowedRetryStatusCodes.includes(status);
  }

  private mapResponseHandlers(): ResponseHandlerMap {
    const responses = SUPPORTED_HTTP_RESPONSES.reduce(
      (acc: ResponseHandlerMap, type: SupportedHTTPResponses) => {
        const updatedAcc = {
          ...acc,
          [type]: () => this.fetch(type),
        };

        return updatedAcc;
      },
      {} as ResponseHandlerMap
    );

    return responses;
  }

  private async normalizeResponse(
    response: Response,
    type: SupportedHTTPResponses
  ) {
    const { jsonParser } = this.requestConfig;

    if (response.status === 204 && type === 'json') {
      return '';
    }

    if (type === 'json' && jsonParser) {
      return this.useJsonParser(response, jsonParser);
    }

    return response.clone()[type]();
  }

  private prepareRequestConfig(configOptions: HttpRequestConfig) {
    const {
      headers,
      hooks,
      prefixURL,
      retryPolicy,
      searchParams,
      shouldHandleHttpErrors = true,
      signal,
      timeoutLength,
    } = configOptions;

    const resolvedRetry = buildRetryPolicyConfig(retryPolicy);

    const resolvedTimeout = timeoutLength ?? DEFAULT_HTTP_TIMEOUT_MS;

    const resolvedHeaders = new Headers(headers ?? {});

    const resolvedHooks = this.resolveHooks(hooks);

    const resolvedPrefixURL = this.resolvePrefixURL(prefixURL);

    this.requestConfig = {
      ...configOptions,
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

  private prepareRequestSource(requestSource: RequestSource) {
    const { prefixURL, searchParams } = this.requestConfig;

    const prefixedURL = appendPrefixToRequestSource(requestSource, prefixURL);

    if (searchParams) {
      return appendSearchParamsToURL(searchParams, prefixedURL);
    }

    return prefixedURL;
  }

  private resolveHooks(hooks: RequestHooks) {
    if (hooks) return hooks;

    const defaultHooks: RequestHooks = {
      preRequestHooks: [],
      preResponseHooks: [],
      preRetryHooks: [],
    };

    return defaultHooks;
  }

  private resolvePrefixURL(prefix: RequestSource | null) {
    if (!prefix) return null;

    const prefixString = this.extractURLFromRequestSource(prefix);

    if (!prefixString.endsWith('/')) {
      const normalizedPrefix = prefixString.concat('/');
      return normalizedPrefix;
    }

    return prefix;
  }

  private shouldRetry(error: unknown): boolean {
    const { retryLength } = this.requestConfig.retryPolicy;

    const isValidRetryAttempt = this.retryAttempts < retryLength;

    const isValidRetryError = this.isRetryError(error);
    const isValidRetryStatusCode = this.isRetryStatusCode(error as HttpError);
    const isValidRetryMethod = this.isRetryMethod(this.requestConfig?.method);

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
    const isValidRetryMethod = this.isRetryMethod(this.requestConfig?.method);
    return isValidRetryError && isValidRetryAfter && isValidRetryMethod;
  }

  private streamFileTransfer(
    response: Response,
    fileTransferHook: TransferHook
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
