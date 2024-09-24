import type { HttpInputType, HttpOptions } from '@/types/http';

import { HttpMethods } from '@/enums';
import { deepMerge } from '@/utils';

import { HttpForge } from './http-forge';

export class HttpForgeInstance {
  private readonly defaultOptions: HttpOptions;

  constructor(defaultOptions?: HttpOptions) {
    this.defaultOptions = defaultOptions;
  }

  private createHttpForgeInstance(
    httpInput: URL | globalThis.Request | string,
    httpOptions: HttpOptions
  ) {
    const mergedOptions = deepMerge(
      {},
      this.defaultOptions,
      httpOptions
    ) as HttpOptions;
    return new HttpForge(httpInput, mergedOptions);
  }

  private createHttpForgeInstanceByMethod(
    httpInput: HttpInputType,
    httpOptions: HttpOptions,
    method: HttpMethods
  ) {
    return this.createHttpForgeInstance(httpInput, {
      ...httpOptions,
      method,
    });
  }

  public delete(httpInput: HttpInputType, httpOptions: HttpOptions): HttpForge {
    return this.createHttpForgeInstanceByMethod(
      httpInput,
      httpOptions,
      HttpMethods.DELETE
    );
  }

  public get(httpInput: HttpInputType, httpOptions: HttpOptions): HttpForge {
    return this.createHttpForgeInstanceByMethod(
      httpInput,
      httpOptions,
      HttpMethods.GET
    );
  }

  public head(httpInput: HttpInputType, httpOptions: HttpOptions): HttpForge {
    return this.createHttpForgeInstanceByMethod(
      httpInput,
      httpOptions,
      HttpMethods.HEAD
    );
  }

  public patch(httpInput: HttpInputType, httpOptions: HttpOptions): HttpForge {
    return this.createHttpForgeInstanceByMethod(
      httpInput,
      httpOptions,
      HttpMethods.PATCH
    );
  }

  public post(httpInput: HttpInputType, httpOptions: HttpOptions): HttpForge {
    return this.createHttpForgeInstanceByMethod(
      httpInput,
      httpOptions,
      HttpMethods.POST
    );
  }

  public put(httpInput: HttpInputType, httpOptions: HttpOptions): HttpForge {
    return this.createHttpForgeInstanceByMethod(
      httpInput,
      httpOptions,
      HttpMethods.PUT
    );
  }

  public res(httpInput: HttpInputType, httpOptions: HttpOptions): HttpForge {
    return this.createHttpForgeInstance(httpInput, httpOptions);
  }
}
