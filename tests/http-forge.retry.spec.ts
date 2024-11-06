import { HTTP_STATUS_CODES } from '@/constants';
import httpForge from '@/main';
import * as createTestServer from 'create-test-server';

describe('Retry logic', () => {
  const FIXED_JEST_TIMEOUT = 8000;

  jest.setTimeout(FIXED_JEST_TIMEOUT);

  it('Should retry request when it fails', async () => {
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
        retryLength: 2,
      })
      .text();

    expect(result).toEqual('Hey this is a successful GET response');

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
        retryLength: 2,
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
        retryLength: 0,
      })
      .text();

    expect(promise).rejects.toThrow();

    await server.close();
  });

  it.each([
    HTTP_STATUS_CODES.STATUS_CODE_408,
    HTTP_STATUS_CODES.STATUS_CODE_413,
    HTTP_STATUS_CODES.STATUS_CODE_429,
  ])(`Should retry request for valid status code %i`, async (statusCode) => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    const retryLimit = 3;

    let attempts = 0;

    server.get('/retry-test', async (req, res) => {
      attempts += 1;

      if (attempts < retryLimit) {
        res.status(statusCode).end();
      } else {
        res.end('Hey this is a successful GET response');
      }
    });

    const result = await httpForge
      .get(endpoint, {
        retryLength: 2,
      })
      .text();

    expect(result).toEqual('Hey this is a successful GET response');

    await server.close();
  });

  it.each(['get', 'put'])(
    `Should retry request for valid method %s`,
    async (method) => {
      const server = await createTestServer();

      const endpoint = `${server.url}/retry-test`;

      const retryLimit = 2;

      let attempts = 0;

      const normalizedMethod = method.toLowerCase();

      server[normalizedMethod]('/retry-test', async (req, res) => {
        attempts += 1;

        if (attempts < retryLimit) {
          res.status(503).end();
        } else {
          res.end(`Hey this is a successful ${normalizedMethod} response`);
        }
      });

      const result = await httpForge[method](endpoint, {
        retryLength: 2,
      }).text();

      expect(result).toEqual(
        `Hey this is a successful ${normalizedMethod} response`
      );

      await server.close();
    }
  );
});
