import type { RequestSource } from '@/types';

import { SUPPORTED_HTTP_VERBS } from '@/constants';
import { RequestSignals } from '@/enums';
import { deepMerge } from '@/utils';

import * as utils from '../utils';
import { HttpForge } from './http-forge';
import { httpForgeFactory } from './http-forge-factory';

jest.mock('./http-forge');
jest.mock('@/utils', () => ({
  deepMerge: jest.fn(),
}));

describe('httpForgeFactory', () => {
  const defaultConfig = { baseURL: 'http://example.com' };
  const requestSource = { url: '/test' } as RequestSource;
  const requestConfig = { headers: { 'Content-Type': 'application/json' } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create handlers for all supported HTTP verbs', () => {
    const httpForge = httpForgeFactory(defaultConfig);

    SUPPORTED_HTTP_VERBS.forEach((method) => {
      expect(httpForge).toHaveProperty(method);
    });
  });

  it('should call buildHttpForgeInstance with correct parameters', () => {
    const mockDeepMerge = jest.spyOn(utils, 'deepMerge');

    mockDeepMerge.mockImplementation(() => ({
      ...requestConfig,
      ...defaultConfig,
    }));

    const httpForge = httpForgeFactory(defaultConfig);
    const method = SUPPORTED_HTTP_VERBS[0];
    const methodHandler = httpForge[method];

    methodHandler(requestSource, requestConfig);

    expect(deepMerge).toHaveBeenCalledWith({}, defaultConfig, requestConfig, {
      method: method.toUpperCase(),
    });
    expect(HttpForge.createHttpForgeInstance).toHaveBeenCalledWith(
      requestSource,
      {
        ...defaultConfig,
        ...requestConfig,
      }
    );
  });

  it('should extend the default configuration', () => {
    const httpForge = httpForgeFactory(defaultConfig);
    const extendedConfig = { timeout: 1000 };
    const extendedHttpForge = httpForge.extend(extendedConfig);

    expect(deepMerge).toHaveBeenCalledWith(
      {},
      { ...defaultConfig, ...extendedConfig }
    );
    expect(extendedHttpForge).not.toBe(httpForge);
  });

  it('should return halt request signal', () => {
    const httpForge = httpForgeFactory(defaultConfig);
    const haltSignal = httpForge.haltRequest();

    expect(haltSignal).toBe(RequestSignals.HALT_REQUEST_SIGNAL);
  });
});
