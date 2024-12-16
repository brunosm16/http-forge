import type {
  HttpForgeInput,
  HttpForgeMethods,
  HttpForgeOptions,
} from '@/types/http';

import { SUPPORTED_HTTP_VERBS } from '@/constants';
import { CustomRequestSignals } from '@/enums';
import { deepMerge } from '@/utils';

import { HttpForge } from './http-forge';

const buildHttpForge = (
  httpForgeInput: HttpForgeInput,
  httpForgeOptions: HttpForgeOptions,
  method: keyof HttpForgeMethods,
  defaultOptions?: HttpForgeOptions
) => {
  const normalizedMethod = method?.toUpperCase();

  const mergedOptions = deepMerge({}, defaultOptions, httpForgeOptions, {
    method: normalizedMethod,
  });

  return HttpForge.createHttpForge(
    httpForgeInput,
    mergedOptions as HttpForgeOptions
  );
};

export const constructHttpForgeMethods = (
  defaultOptions?: HttpForgeOptions
) => {
  const httpForgeByMethods = SUPPORTED_HTTP_VERBS.reduce((acc, method) => {
    const methodOption = method as keyof HttpForgeMethods;

    return {
      ...acc,
      [methodOption]: (
        httpForgeInput: HttpForgeInput,
        httpForgeOptions: HttpForgeOptions
      ) =>
        buildHttpForge(
          httpForgeInput,
          httpForgeOptions,
          method,
          defaultOptions
        ),
    };
  }, {} as HttpForgeMethods);

  httpForgeByMethods.extend = (defaultsExtend: HttpForgeOptions = {}) => {
    const options = deepMerge(
      {},
      { ...defaultOptions, ...defaultsExtend }
    ) as HttpForgeOptions;

    return constructHttpForgeMethods(options);
  };

  httpForgeByMethods.haltRequest = () =>
    CustomRequestSignals.HALT_REQUEST_SIGNAL;

  return httpForgeByMethods;
};
