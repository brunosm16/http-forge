export type HttpError = {
  errorMessage?: string;
  statusCode?: string;
};

export type HttpOptions = {
  [key: string]: unknown;
  credentials?: string;
  headers?: Headers;
  method: string;
  retryLength?: number;
  timeoutLength?: number;
};
