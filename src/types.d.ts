import type { RequestSignals } from '@/enums';

export type HttpError = {
  errorMessage?: string;
  statusCode?: string;
};

export type HttpSearchParams =
  | Record<string, string>
  | URLSearchParams
  | string
  | string[][];

export type HttpRequestConfig = {
  [key: string]: unknown;
  abortController?: AbortController;
  hooks?: RequestHooks;
  jsonBody?: unknown;
  jsonParser?: (data: string) => unknown;
  prefixURL?: RequestSource | null;
  requestHeaders?: Headers;
  retryPolicy?: RetryPolicyConfig;
  searchParams?: HttpSearchParams;
  shouldHandleHttpErrors?: boolean;
  signal?: AbortSignal;
  timeoutLength?: number;
} & RequestInit;

export type RequestSource = URL | globalThis.Request | string;

export type SupportedHTTPResponses =
  | 'arrayBuffer'
  | 'blob'
  | 'formData'
  | 'json'
  | 'text';

export type SupportedHTTPVerbs =
  | 'delete'
  | 'get'
  | 'head'
  | 'patch'
  | 'post'
  | 'put';

export type HttpResponseRecord = Record<
  SupportedHTTPResponses,
  Promise<Response>
>;

export type ResponseHandlerMap = Record<
  SupportedHTTPResponses,
  () => Promise<Response>
>;

export type KeyedResponseHandlerMap = {
  [key in SupportedHTTPVerbs]: (
    requestSource: RequestSource,
    defaultRequestConfig?: HttpRequestConfig
  ) => ResponseHandlerMap;
};

export type HandlerExtensions = {
  extend: (defaultRequestConfig?: HttpRequestConfig) => HttpMethodHandlers;
  haltRequest: () => RequestSignals.HALT_REQUEST_SIGNAL;
};

export type HttpMethodHandlers = HandlerExtensions & KeyedResponseHandlerMap;

export type RequestHooks = {
  preRequestHooks?: PreRequestHook[];
  preResponseHooks?: PreResponseHook[];
  preRetryHooks?: PreRetryHook[];
  transferHook?: TransferHook;
};

export type PreRequestHook = (
  requestConfig: HttpRequestConfig
) => Promise<void>;

export type PreResponseHook = (response: Response) => Promise<Response>;

export type PreRetryHook = (
  requestSource: RequestSource,
  retryAttempts: number,
  error: Error,
  requestConfig: HttpRequestConfig
) => Promise<RequestSignals.HALT_REQUEST_SIGNAL> | Promise<void>;

export type TransferHook = (
  transferStatus: TransferStatus,
  chunk: Uint8Array
) => void;

export type TransferStatus = {
  bytesDownloaded: number;
  fileSize: number;
  percentage: number;
};

export type TransferredData = Array<{
  fileTransferProgress: TransferStatus;
  transferredValue: string;
}>;

export type RetryPolicyConfig = {
  allowedRetryAfterStatusCodes?: number[];

  allowedRetryMethods?: string[];

  allowedRetryStatusCodes?: number[];

  retryAfterLimit?: number;

  retryLength?: number;
};
