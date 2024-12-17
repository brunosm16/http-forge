import type { CustomRequestSignals } from '@/enums';

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
  hooks?: HttpForgeHooks;
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
    httpForgeInput: RequestSource,
    defaultOptions?: HttpRequestConfig
  ) => ResponseHandlerMap;
};

export type HandlerExtensions = {
  extend: (defaultOptions?: HttpRequestConfig) => HttpMethodHandlers;
  haltRequest: () => CustomRequestSignals.HALT_REQUEST_SIGNAL;
};

export type HttpMethodHandlers = HandlerExtensions & KeyedResponseHandlerMap;

export type HttpForgeHooks = {
  fileTransferHook?: FileTransferHookFunction;
  preRequestHooks?: HttpPreRequestHookFunction[];
  preResponseHooks?: HttpPreResponseHookFunction[];
  preRetryHooks?: HttpPreRetryHookFunction[];
};

export type HttpPreRequestHookFunction = (
  options: HttpRequestOptions
) => Promise<void>;

export type HttpPreResponseHookFunction = (
  response: Response
) => Promise<Response>;

export type HttpPreRetryHookFunction = (
  input: RequestSource,
  retryAttempts: number,
  error: Error,
  options: HttpRequestConfig
) => Promise<CustomRequestSignals.HALT_REQUEST_SIGNAL> | Promise<void>;

export type FileTransferHookFunction = (
  fileTransferProgress: FileTransferProgress,
  chunk: Uint8Array
) => void;

export type FileTransferProgress = {
  bytesDownloaded: number;
  fileSize: number;
  percentage: number;
};

export type RetryPolicyConfig = {
  allowedRetryAfterStatusCodes?: number[];

  allowedRetryMethods?: string[];

  allowedRetryStatusCodes?: number[];

  retryAfterLimit?: number;

  retryLength?: number;
};
