import httpForge from '@/main';
import * as createTestServer from 'create-test-server';

import type { HttpRequestConfig, RequestSource } from '../types';

import {
  preRetryHook,
  preRetryHookError,
  preRetryHookReject,
} from '../fixtures/hooks';

describe('Retry logic', () => {
  const FIXED_JEST_TIMEOUT = 7000;

  jest.setTimeout(FIXED_JEST_TIMEOUT);

  describe('Retry Policy', () => {
    it('Should apply the default retry policy on request failure', async () => {
      const server = await createTestServer();

      const endpoint = `${server.url}/retry-test`;

      const retryLimit = 1;

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

    it(`Should retry requests for methods specified in allowedRetryMethods`, async () => {
      const server = await createTestServer();

      const endpoint = `${server.url}/retry-test`;

      const retryLimit = 1;

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

    it(`Should retry requests for methods not specified in allowedRetryMethods`, async () => {
      const server = await createTestServer();

      const endpoint = `${server.url}/retry-test`;

      const retryLimit = 1;

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

    it(`Should not retry requests when allowedRetryMethods is empty`, async () => {
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

    it(`Should retry requests for status codes specified in allowedRetryStatusCodes`, async () => {
      const server = await createTestServer();

      const endpoint = `${server.url}/retry-test`;

      const retryLimit = 1;

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

    it(`Should not retry requests for status codes not specified in allowedRetryStatusCodes`, async () => {
      const server = await createTestServer();

      const endpoint = `${server.url}/retry-test`;

      const retryLimit = 1;

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

    it(`Should not retry requests when allowedRetryStatusCodes is empty`, async () => {
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

    it('Should not retry requests after exceeding retryLength', async () => {
      const server = await createTestServer();

      const endpoint = `${server.url}/retry-test`;

      const retryLimit = 5;

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
            retryLength: 1,
          },
        })
        .text();

      expect(promise).rejects.toThrow();

      await server.close();
    });

    it('Should not retry requests when retryLength is zero', async () => {
      const server = await createTestServer();

      const endpoint = `${server.url}/retry-test`;

      const retryLimit = 5;

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
  });

  describe('Retry Policy - Hooks', () => {
    it('Should execute pre-retry-hook correctly', async () => {
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

    it('Should pass correct arguments to pre-retry-hook', async () => {
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

      const customPreRetryHook = async (
        requestSource: RequestSource,
        retryAttempts: number,
        error: Error,
        options: HttpRequestConfig
      ) => {
        expect(requestSource).toEqual(endpoint);
        expect(retryAttempts).toEqual(attempts);
        expect(error?.message).toEqual('Service Unavailable');
        expect(options).toBeTruthy();
      };

      await httpForge
        .get(endpoint, {
          hooks: {
            preRetryHooks: [customPreRetryHook],
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

      const promise = httpForge
        .get(endpoint, {
          hooks: {
            preRetryHooks: [preRetryHookError],
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

      const promise = httpForge
        .get(endpoint, {
          hooks: {
            preRetryHooks: [preRetryHookReject],
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

      const retryHookHaltRequest = async (
        requestSource: RequestSource,
        retryAttempts: number,
        error: Error,
        options: HttpRequestConfig
      ) => {
        return httpForge.haltRequest();
      };

      const promise = httpForge
        .get(endpoint, {
          hooks: {
            preRetryHooks: [retryHookHaltRequest],
          },
        })
        .text();

      expect(promise).rejects.toThrow();

      await server.close();
    });
  });
});
