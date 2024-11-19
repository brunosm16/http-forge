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
  prefixURL?: HttpForgeInput | null;
  requestHeaders?: Headers;
  retryLength?: number;
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
};

export type HttpForgeHooks = {
  fileTransferHook?: FileTransferHookFunction;
  preRequestHooks?: HttpPreRequestHookFunction[];
  preResponseHooks?: HttpPreResponseHookFunction[];
};

export type HttpPreRequestHookFunction = (
  options: HttpRequestOptions
) => Promise<void>;

export type HttpPreResponseHookFunction = (
  response: Response
) => Promise<Response>;

export type FileTransferHookFunction = (
  fileTransferProgress: FileTransferProgress,
  chunk: Uint8Array
) => Promise<void>;

export type FileTransferProgress = {
  bytesDownloaded: number;
  percentage: number;
  totalFileSize: number;
};
