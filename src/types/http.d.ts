export type HttpError = {
  errorMessage?: string;
  statusCode?: string;
};

export type HttpForgeOptions = {
  [key: string]: unknown;
  jsonBody?: unknown;
  requestHeaders?: Headers;
  retryLength?: number;
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
