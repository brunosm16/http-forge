import type { HttpOptions } from '@/types/http';

export class HttpForge {
  private httpOptions: HttpOptions;

  private payload: unknown;

  constructor(payload: unknown, httpOptions: HttpOptions) {
    this.payload = payload;

    // TODO: Initialize httpOptions with fallback values
    this.httpOptions = httpOptions;
  }
}
