import type { CustomRequestSignals } from '@/enums';

export type HttpError = {
  errorMessage?: string;
  statusCode?: string;
};

export type HttpForgeSearchParams =
  | Record<string, string>
  | URLSearchParams
  | string
  | string[][];

export type HttpForgeOptions = {
  [key: string]: unknown;
  abortController?: AbortController;
  hooks?: HttpForgeHooks;
  jsonBody?: unknown;
  jsonParser?: (data: string) => unknown;
  prefixURL?: HttpForgeInput | null;
  requestHeaders?: Headers;
  retryPolicy?: RetryPolicyConfig;
  searchParams?: HttpForgeSearchParams;
  shouldHandleHttpErrors?: boolean;
  signal?: AbortSignal;
  timeoutLength?: number;
} & RequestInit;

export type HttpForgeInput = URL | globalThis.Request | string;

export type HttpSupportedResponses =
  | 'arrayBuffer'
  | 'blob'
  | 'formData'
  | 'json'
  | 'text';

export type HttpSupportedMethods =
  | 'delete'
  | 'get'
  | 'head'
  | 'patch'
  | 'post'
  | 'put';

export type HttpForgeResponses = Record<
  HttpSupportedResponses,
  Promise<Response>
>;

export type HttpForgeResponseOptions = Record<
  HttpSupportedResponses,
  () => Promise<Response>
>;

export type HttpForgeMethods = {
  [key in HttpSupportedMethods]: (
    httpForgeInput: HttpForgeInput,
    defaultOptions?: HttpForgeOptions
  ) => HttpForgeResponseOptions;
} & {
  extend: (defaultOptions?: HttpForgeOptions) => HttpForgeMethods;
  haltRequest: () => CustomRequestSignals.HALT_REQUEST_SIGNAL;
};

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
  input: HttpForgeInput,
  retryAttempts: number,
  error: Error,
  options: HttpForgeOptions
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
