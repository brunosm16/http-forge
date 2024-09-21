export type HttpError = {
  errorMessage?: string;
  statusCode?: string;
};

export type HttpOptions = {
  [key: string]: unknown;
  credentials: string;
  method: string;
  retryLength: number;
  timeoutLength: number;
};
