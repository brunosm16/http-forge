export type HttpError = {
  errorMessage?: string;
  statusCode?: string;
};

export type HttpOptions = {
  [key: string]: unknown;
  jsonBody?: unknown;
  requestHeaders?: Headers;
  retryCount?: number;
  timeoutLength?: number;
} & RequestInit;

export type HttpInputType = URL | globalThis.Request | string;

export type HttpResponsesTypes =
  | 'arrayBuffer'
  | 'blob'
  | 'formData'
  | 'json'
  | 'text';
