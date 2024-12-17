import type {
  HttpMethodHandlers,
  HttpRequestConfig,
  RequestSource,
} from '@/types/http';

import { SUPPORTED_HTTP_VERBS } from '@/constants';
import { CustomRequestSignals } from '@/enums';
import { deepMerge } from '@/utils';

import { HttpForge } from './http-forge';

const buildHttpForge = (
  httpForgeInput: RequestSource,
  httpForgeOptions: HttpRequestConfig,
  method: keyof HttpMethodHandlers,
  defaultOptions?: HttpRequestConfig
) => {
  const normalizedMethod = method?.toUpperCase();

  const mergedOptions = deepMerge({}, defaultOptions, httpForgeOptions, {
    method: normalizedMethod,
  });

  return HttpForge.createHttpForge(
    httpForgeInput,
    mergedOptions as HttpRequestConfig
  );
};

export const constructHttpForgeMethods = (
  defaultOptions?: HttpRequestConfig
) => {
  const httpForgeByMethods = SUPPORTED_HTTP_VERBS.reduce((acc, method) => {
    const methodOption = method as keyof HttpMethodHandlers;

    return {
      ...acc,
      [methodOption]: (
        httpForgeInput: RequestSource,
        httpForgeOptions: HttpRequestConfig
      ) =>
        buildHttpForge(
          httpForgeInput,
          httpForgeOptions,
          method,
          defaultOptions
        ),
    };
  }, {} as HttpMethodHandlers);

  httpForgeByMethods.extend = (defaultsExtend: HttpRequestConfig = {}) => {
    const options = deepMerge(
      {},
      { ...defaultOptions, ...defaultsExtend }
    ) as HttpRequestConfig;

    return constructHttpForgeMethods(options);
  };

  httpForgeByMethods.haltRequest = () =>
    CustomRequestSignals.HALT_REQUEST_SIGNAL;

  return httpForgeByMethods;
};
