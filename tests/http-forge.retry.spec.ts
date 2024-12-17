import httpForge from '@/main';
import * as createTestServer from 'create-test-server';

import type { HttpRequestConfig, RequestSource } from './types';

describe('Retry logic', () => {
  const FIXED_JEST_TIMEOUT = 7000;

  jest.setTimeout(FIXED_JEST_TIMEOUT);

  it('Should retry request with default policy when it fails', async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    const retryLimit = 3;

    let attempts = 0;

    server.get('/retry-test', async (req, res) => {
      attempts += 1;

      if (attempts < retryLimit) {
        res.status(503).end();
      } else {
        res.end('Hey this is a successful GET response');
      }
    });

    const result = await httpForge.get(endpoint).text();

    expect(result).toEqual('Hey this is a successful GET response');

    await server.close();
  });

  it(`Should retry request for 'allowedRetryMethods'`, async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    const retryLimit = 3;

    let attempts = 0;

    server.get('/retry-test', async (req, res) => {
      attempts += 1;

      if (attempts < retryLimit) {
        res.status(503).end();
      } else {
        res.end('Hey this is a successful GET response');
      }
    });

    const result = await httpForge
      .get(endpoint, {
        retryPolicy: {
          allowedRetryMethods: ['get'],
        },
      })
      .text();

    expect(result).toEqual('Hey this is a successful GET response');

    await server.close();
  });

  it(`Should not retry request for method not included in 'allowedRetryMethods'`, async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    const retryLimit = 3;

    let attempts = 0;

    server.get('/retry-test', async (req, res) => {
      attempts += 1;

      if (attempts < retryLimit) {
        res.status(503).end();
      } else {
        res.end('Hey this is a successful GET response');
      }
    });

    const promise = httpForge
      .get(endpoint, {
        retryPolicy: {
          allowedRetryMethods: ['post'],
        },
      })
      .text();

    expect(promise).rejects.toThrow();

    await server.close();
  });

  it(`Should retry request for 'allowedRetryStatusCodes'`, async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    const retryLimit = 3;

    let attempts = 0;

    server.get('/retry-test', async (req, res) => {
      attempts += 1;

      if (attempts < retryLimit) {
        res.status(505).end();
      } else {
        res.end('Hey this is a successful GET response');
      }
    });

    const result = await httpForge
      .get(endpoint, {
        retryPolicy: {
          allowedRetryStatusCodes: [505],
        },
      })
      .text();

    expect(result).toEqual('Hey this is a successful GET response');

    await server.close();
  });

  it(`Should not retry request for statusCode not included in 'allowedRetryStatusCodes'`, async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    const retryLimit = 3;

    let attempts = 0;

    server.get('/retry-test', async (req, res) => {
      attempts += 1;

      if (attempts < retryLimit) {
        res.status(508).end();
      } else {
        res.end('Hey this is a successful GET response');
      }
    });

    const promise = httpForge
      .get(endpoint, {
        retryPolicy: {
          allowedRetryStatusCodes: [401],
        },
      })
      .text();

    expect(promise).rejects.toThrow();

    await server.close();
  });

  it('Should not retry request when errors are larger than retryLength', async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    const retryLimit = 10;

    let attempts = 0;

    server.get('/retry-test', async (req, res) => {
      attempts += 1;

      if (attempts < retryLimit) {
        res.status(503).end();
      } else {
        res.end('Hey this is a successful GET response');
      }
    });

    const promise = httpForge
      .get(endpoint, {
        retryPolicy: {
          retryLength: 2,
        },
      })
      .text();

    expect(promise).rejects.toThrow();

    await server.close();
  });

  it('Should not retry when retryLength is zero', async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    const retryLimit = 10;

    let attempts = 0;

    server.get('/retry-test', async (req, res) => {
      attempts += 1;

      if (attempts < retryLimit) {
        res.status(503).end();
      } else {
        res.end('Hey this is a successful GET response');
      }
    });

    const promise = httpForge
      .get(endpoint, {
        retryPolicy: {
          retryLength: 0,
        },
      })
      .text();

    expect(promise).rejects.toThrow();

    await server.close();
  });

  it(`Should no retry when allowedRetryStatusCodes it's empty`, async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    const retryLimit = 3;

    let attempts = 0;

    server.get('/retry-test', async (req, res) => {
      attempts += 1;

      if (attempts < retryLimit) {
        res.status(503).end();
      } else {
        res.end('Hey this is a successful GET response');
      }
    });

    const promise = httpForge
      .get(endpoint, {
        retryPolicy: {
          allowedRetryStatusCodes: [],
        },
      })
      .text();

    expect(promise).rejects.toThrow();

    await server.close();
  });

  it(`Should no retry when allowedRetryMethods it's empty`, async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    const retryLimit = 3;

    let attempts = 0;

    server.get('/retry-test', async (req, res) => {
      attempts += 1;

      if (attempts < retryLimit) {
        res.status(503).end();
      } else {
        res.end('Hey this is a successful GET response');
      }
    });

    const promise = httpForge
      .get(endpoint, {
        retryPolicy: {
          allowedRetryMethods: [],
        },
      })
      .text();

    expect(promise).rejects.toThrow();

    await server.close();
  });

  it('Should correctly use pre-retry-hook', async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    let attempts = 0;

    server.get('/retry-test', async (req, res) => {
      if (attempts > 1) {
        res.end(req.headers.customheader);
      } else {
        attempts += 1;
        res.status(503).end();
      }
    });

    const preRetryHook = async (
      input: RequestSource,
      retryAttempts: number,
      error: Error,
      options: HttpRequestConfig
    ) => {
      // eslint-disable-next-line no-param-reassign
      options.headers = new Headers({
        customHeader: 'This is a custom header',
      });
    };

    const result = await httpForge
      .get(endpoint, {
        hooks: {
          preRetryHooks: [preRetryHook],
        },
      })
      .text();

    expect(result).toEqual('This is a custom header');

    await server.close();
  });

  it('Should call pre-retry-hook with correct args', async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    let attempts = 0;

    server.get('/retry-test', async (req, res) => {
      if (attempts > 1) {
        res.end('Successful get');
      } else {
        attempts += 1;
        res.status(503).end();
      }
    });

    const preRetryHook = async (
      input: RequestSource,
      retryAttempts: number,
      error: Error,
      options: HttpRequestConfig
    ) => {
      expect(input).toEqual(endpoint);
      expect(retryAttempts).toEqual(attempts);
      expect(error?.message).toEqual('Service Unavailable');
      expect(options).toBeTruthy();
    };

    await httpForge
      .get(endpoint, {
        hooks: {
          preRetryHooks: [preRetryHook],
        },
      })
      .text();

    await server.close();
  });

  it('Should catch pre-retry-hook errors', async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    let attempts = 0;

    server.get('/retry-test', async (req, res) => {
      if (attempts > 1) {
        res.end('Successful get');
      } else {
        attempts += 1;
        res.status(503).end();
      }
    });

    const mockError = new Error('Mock Error');

    const preRetryHook = async (
      input: RequestSource,
      retryAttempts: number,
      error: Error,
      options: HttpRequestConfig
    ) => {
      throw mockError;
    };

    const promise = httpForge
      .get(endpoint, {
        hooks: {
          preRetryHooks: [preRetryHook],
        },
      })
      .text();

    expect(promise).rejects.toThrow();

    await server.close();
  });

  it('Should catch pre-retry-hook reject', async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    let attempts = 0;

    server.get('/retry-test', async (req, res) => {
      if (attempts > 1) {
        res.end('Successful get');
      } else {
        attempts += 1;
        res.status(503).end();
      }
    });

    const mockError = new Error('Mock Error');

    const preRetryHook = async (
      input: RequestSource,
      retryAttempts: number,
      error: Error,
      options: HttpRequestConfig
    ) => {
      Promise.reject(mockError);
    };

    const promise = httpForge
      .get(endpoint, {
        hooks: {
          preRetryHooks: [preRetryHook],
        },
      })
      .text();

    expect(promise).rejects.toThrow();

    await server.close();
  });

  it('Should halt request in pre-retry-hook', async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    let attempts = 0;

    server.get('/retry-test', async (req, res) => {
      if (attempts > 2) {
        res.end('Testing');
      } else {
        attempts += 1;
        res.status(503).end();
      }
    });

    const preRetryHook = async (
      input: RequestSource,
      retryAttempts: number,
      error: Error,
      options: HttpRequestConfig
    ) => {
      return httpForge.haltRequest();
    };

    const promise = httpForge
      .get(endpoint, {
        hooks: {
          preRetryHooks: [preRetryHook],
        },
      })
      .text();

    expect(promise).rejects.toThrow();

    await server.close();
  });
});
