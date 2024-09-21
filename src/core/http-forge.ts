import type { HttpOptions } from '@/types/http';

import {
  HTTP_FORGE_DEFAULT_RETRY_LENGTH,
  HTTP_FORGE_DEFAULT_TIMEOUT_LENGTH,
  HTTP_FORGE_FIXED_CREDENTIALS,
} from '@/constants';

export class HttpForge {
  private httpOptions: HttpOptions;

  private payload: unknown;

  private retryLength: number = 0;

  constructor(payload: unknown, httpOptions: HttpOptions) {
    this.payload = payload;

    this.initializeOptions(httpOptions);
  }

  private initializeOptions(inputOptions: HttpOptions) {
    const { headers, retryLength, timeoutLength } = inputOptions;

    const normalizedRetry = retryLength ?? HTTP_FORGE_DEFAULT_RETRY_LENGTH;
    const normalizedTimeout =
      timeoutLength ?? HTTP_FORGE_DEFAULT_TIMEOUT_LENGTH;

    const formattedHeaders = new Headers(headers ?? {});

    this.httpOptions = {
      ...inputOptions,
      credentials: HTTP_FORGE_FIXED_CREDENTIALS,
      headers: formattedHeaders,
      retryLength: normalizedRetry,
      timeoutLength: normalizedTimeout,
    };
  }
}
