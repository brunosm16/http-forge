import httpForge from '@/main';
import * as createTestServer from 'create-test-server';

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
});
