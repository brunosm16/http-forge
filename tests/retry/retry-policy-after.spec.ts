import httpForge from '@/main';
import * as createTestServer from 'create-test-server';

import type { HttpRequestConfig, RequestSource } from '../types';

describe('Retry Policy - After', () => {
  const FIXED_JEST_TIMEOUT = 7000;

  jest.setTimeout(FIXED_JEST_TIMEOUT);

  it(`Should retry-after requests for status codes specified in allowedRetryAfterStatusCodes`, async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    let attempts = 0;
    const retryLimit = 2;

    server.get('/retry-test', async (req, res) => {
      attempts += 1;

      if (attempts < retryLimit) {
        res.writeHead(520, {
          'Retry-After': 0.25,
        });

        res.end('Unknown Error');
      } else {
        res.end('Hey this is a successful GET response');
      }
    });

    const result = await httpForge
      .get(endpoint, {
        retryPolicy: {
          allowedRetryAfterStatusCodes: [520],
        },
      })
      .text();

    expect(result).toEqual('Hey this is a successful GET response');
    await server.close();
  });

  it(`Should not retry-after requests for status codes not specified in allowedRetryAfterStatusCodes`, async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    let attempts = 0;
    const retryLimit = 2;

    server.get('/retry-test', async (req, res) => {
      attempts += 1;

      if (attempts < retryLimit) {
        res.writeHead(520, {
          'Retry-After': 0.25,
        });

        res.end('Unknown Error');
      } else {
        res.end('Hey this is a successful GET response');
      }
    });

    const promise = httpForge
      .get(endpoint, {
        retryPolicy: {
          allowedRetryAfterStatusCodes: [419],
        },
      })
      .text();

    expect(promise).rejects.toThrow();
    await server.close();
  });

  it(`Should not retry requests when allowedRetryAfterStatusCodes is empty`, async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    let attempts = 0;
    const retryLimit = 5;

    server.get('/retry-test', async (req, res) => {
      attempts += 1;

      if (attempts < retryLimit) {
        res.writeHead(520, {
          'Retry-After': 0.25,
        });

        res.end('Unknown Error');
      } else {
        res.end('Hey this is a successful GET response');
      }
    });

    const promise = httpForge
      .get(endpoint, {
        retryPolicy: {
          allowedRetryAfterStatusCodes: [],
        },
      })
      .text();

    expect(promise).rejects.toThrow();
    await server.close();
  });

  it(`Should retry-after requests for methods specified in allowedRetryMethods`, async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    let attempts = 0;
    const retryLimit = 2;

    server.get('/retry-test', async (req, res) => {
      attempts += 1;

      if (attempts < retryLimit) {
        res.writeHead(520, {
          'Retry-After': 0.25,
        });

        res.end('Unknown Error');
      } else {
        res.end('Hey this is a successful GET response');
      }
    });

    const result = await httpForge
      .get(endpoint, {
        retryPolicy: {
          allowedRetryAfterStatusCodes: [520],
          allowedRetryMethods: ['get'],
        },
      })
      .text();

    expect(result).toEqual('Hey this is a successful GET response');
    await server.close();
  });

  it(`Should not retry-after requests for methods not specified in allowedRetryMethods`, async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    let attempts = 0;
    const retryLimit = 5;

    server.get('/retry-test', async (req, res) => {
      attempts += 1;

      if (attempts < retryLimit) {
        res.writeHead(520, {
          'Retry-After': 0.25,
        });

        res.end('Unknown Error');
      } else {
        res.end('Hey this is a successful GET response');
      }
    });

    const promise = httpForge
      .get(endpoint, {
        retryPolicy: {
          allowedRetryAfterStatusCodes: [520],
          allowedRetryMethods: ['post'],
        },
      })
      .text();

    expect(promise).rejects.toThrow();
    await server.close();
  });

  it(`Should not retry-after requests when allowedRetryMethods is empty`, async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    let attempts = 0;
    const retryLimit = 5;

    server.get('/retry-test', async (req, res) => {
      attempts += 1;

      if (attempts < retryLimit) {
        res.writeHead(520, {
          'Retry-After': 0.25,
        });

        res.end('Unknown Error');
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

  it('Should retry when retry-after header it is provided as timestamp', async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    let attempts = 0;
    const retryLimit = 2;

    const retryDelay = 2 * 1000;

    server.get('/retry-test', async (req, res) => {
      attempts += 1;

      if (attempts < retryLimit) {
        const timeStamp = Date.now() + retryDelay;

        res.writeHead(429, {
          'Retry-After': new Date(timeStamp).toUTCString(),
        });

        res.end('Too Many Requests');
      } else {
        res.end('Successful request');
      }
    });

    const result = await httpForge.get(endpoint).text();

    expect(result).toEqual('Successful request');

    await server.close();
  });

  it('Should retry on retry-after header with default policy', async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    let attempts = 0;
    const retryLimit = 2;

    server.get('/retry-test', async (req, res) => {
      attempts += 1;

      if (attempts < retryLimit) {
        res.writeHead(429, {
          'Retry-After': 2,
        });

        res.end('Too Many Requests');
      } else {
        res.end('Successful request');
      }
    });

    const result = await httpForge.get(endpoint).text();

    expect(result).toEqual('Successful request');

    await server.close();
  });

  it(`Should halt request in pre-retry-hook`, async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    let attempts = 0;
    const retryLimit = 5;

    server.get('/retry-test', async (req, res) => {
      attempts += 1;

      if (attempts < retryLimit) {
        res.writeHead(520, {
          'Retry-After': 0.25,
        });

        res.end('Unknown Error');
      } else {
        res.end('Hey this is a successful GET response');
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
