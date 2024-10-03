import { HTTP_ALLOWED_RETRY_STATUS_CODES } from '@/constants';
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

    const result = await httpForge.get(endpoint, {}).text();

    expect(result).toEqual('Hey this is a successful GET response');
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
        retryLength: 3,
      })
      .text();

    expect(promise).rejects.toThrow('Service Unavailable');
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

    expect(promise).rejects.toThrow('Service Unavailable');
  });

  it.each(HTTP_ALLOWED_RETRY_STATUS_CODES)(
    `Should retry request for valid status code %i`,
    async (statusCode) => {
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

      const result = await httpForge.get(endpoint, {}).text();

      expect(result).toEqual('Hey this is a successful GET response');
    }
  );
});
