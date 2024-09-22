export type HttpError = {
  errorMessage?: string;
  statusCode?: string;
};

export type HttpOptions = {
  [key: string]: unknown;
  body?: unknown;
  credentials?: string;
  headers?: Headers;
  jsonBody?: unknown;
  method: string;
  retryLength?: number;
  timeoutLength?: number;
};
