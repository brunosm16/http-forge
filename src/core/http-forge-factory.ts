import type {
  HttpMethodHandlers,
  HttpRequestConfig,
  RequestSource,
} from '@/types';

import { SUPPORTED_HTTP_VERBS } from '@/constants';
import { RequestSignals } from '@/enums';
import { deepMerge } from '@/utils';

import { HttpForge } from './http-forge';

const buildHttpForgeInstance = (
  requestSource: RequestSource,
  requestConfig: HttpRequestConfig,
  method: keyof HttpMethodHandlers,
  defaultConfig?: HttpRequestConfig
) => {
  const normalizedMethod = method?.toUpperCase();

  const mergedConfig = deepMerge({}, defaultConfig, requestConfig, {
    method: normalizedMethod,
  });

  return HttpForge.createHttpForgeInstance(
    requestSource,
    mergedConfig as HttpRequestConfig
  );
};

export const httpForgeFactory = (defaultConfig?: HttpRequestConfig) => {
  const httpForgeByHandlers = SUPPORTED_HTTP_VERBS.reduce((acc, method) => {
    const methodHandler = method as keyof HttpMethodHandlers;

    return {
      ...acc,
      [methodHandler]: (
        requestSource: RequestSource,
        requestConfig: HttpRequestConfig
      ) =>
        buildHttpForgeInstance(
          requestSource,
          requestConfig,
          method,
          defaultConfig
        ),
    };
  }, {} as HttpMethodHandlers);

  httpForgeByHandlers.extend = (extendConfig: HttpRequestConfig = {}) => {
    const requestConfig = deepMerge(
      {},
      { ...defaultConfig, ...extendConfig }
    ) as HttpRequestConfig;

    return httpForgeFactory(requestConfig);
  };

  httpForgeByHandlers.haltRequest = () => RequestSignals.HALT_REQUEST_SIGNAL;

  return httpForgeByHandlers;
};
