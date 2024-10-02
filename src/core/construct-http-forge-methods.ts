import type {
  HttpForgeInput,
  HttpForgeMethods,
  HttpForgeOptions,
} from '@/types/http';

import { HTTP_SUPPORTED_METHODS } from '@/constants';
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
  defaultOptions: HttpForgeOptions = {}
) => {
  const httpForgeByMethods = HTTP_SUPPORTED_METHODS.reduce((acc, method) => {
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

  httpForgeByMethods.extend = (defaultsExtend: HttpForgeOptions = {}) =>
    constructHttpForgeMethods(defaultsExtend);

  return httpForgeByMethods;
};
