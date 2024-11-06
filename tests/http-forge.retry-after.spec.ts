import httpForge from '@/main';
import * as createTestServer from 'create-test-server';

describe('Retry after logic', () => {
  const FIXED_JEST_TIMEOUT = 8000;

  jest.setTimeout(FIXED_JEST_TIMEOUT);

  it('Should not retry when retry-after header it is not provided', async () => {
    const server = await createTestServer();

    const endpoint = `${server.url}/retry-test`;

    let attempts = 0;
    const retryLimit = 5;

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

  it('Should retry when retry-after header it is provided', async () => {
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

    const result = await httpForge
      .get(endpoint, {
        retryLength: 0,
      })
      .text();

    expect(result).toEqual('Successful request');

    await server.close();
  });
});
