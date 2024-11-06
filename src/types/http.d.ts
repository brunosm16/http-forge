export type HttpError = {
  errorMessage?: string;
  statusCode?: string;
};

export type HttpForgeOptions = {
  [key: string]: unknown;
  hooks?: HttpForgeHooks;
  jsonBody?: unknown;
  prefixURL?: HttpForgeInput | null;
  requestHeaders?: Headers;
  retryLength?: number;
  shouldHandleHttpErrors?: boolean;
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
  preRequestHooks: HttpRequestHookFunction[];
};

export type HttpRequestHookFunction = (
  options: HttpRequestOptions
) => Promise<void>;
