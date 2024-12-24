import httpForge from '@/main';

import { configTestServer } from '../fixtures/config-test-server';

describe('Headers tests', () => {
  let server: any = null;

  beforeAll(async () => {
    server = await configTestServer();
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(async () => {
    await server.close();
    server = null;
  });

  it('Should append JSON body', async () => {
    const endpoint = `${server.url}/json-test`;

    const jsonBody = {
      key: 'value',
      key2: 'value2',
    };

    const result = await httpForge
      .post(endpoint, {
        jsonBody,
      })
      .json();

    expect(result).toEqual(jsonBody);
  });

  it('Should handle custom headers in the request', async () => {
    const endpoint = `${server.url}/headers-test`;

    const headers = {
      'x-custom-header': 'custom-header',
    };

    const result = await httpForge
      .get(endpoint, {
        headers,
      })
      .text();

    expect(result).toEqual(headers['x-custom-header']);
  });

  it('Should not handle HTTP errors', async () => {
    const endpoint = `${server.url}/error`;

    const response = httpForge
      .get(endpoint, {
        shouldHandleHttpErrors: false,
      })
      .text();

    expect(response).resolves.toBeDefined();
  });

  it('Should abort request with abort-controller', async () => {
    const endpoint = `${server.url}/success`;

    const abortController = new AbortController();

    const promise = httpForge.get(endpoint, {
      signal: abortController.signal,
    });

    abortController.abort();

    const result = promise.text();

    expect(result).rejects.toThrow('This operation was aborted');
  });

  it('Should not abort request after fetch was dispatched', async () => {
    const endpoint = `${server.url}/success`;

    const abortController = new AbortController();

    const result = await httpForge
      .get(endpoint, {
        signal: abortController.signal,
      })
      .text();

    abortController.abort();

    expect(result).toEqual('Hey this is a successful GET response');
  });

  it('Should not allow a body when using jsonBody header', async () => {
    const endpoint = `${server.url}/json-test`;

    let errorMessage: null | string = '';

    try {
      await httpForge
        .post(endpoint, {
          body: 'mock-body',
          jsonBody: {
            key: 'value',
            key2: 'value2',
          },
        })
        .json();
    } catch (err) {
      errorMessage = err?.message;
    }

    expect(errorMessage).toEqual(
      `The property 'body' cannot be used together with the 'jsonBody' property.`
    );
  });

  it('Should allow a body without jsonBody headers', async () => {
    const endpoint = `${server.url}/success`;

    const result = await httpForge
      .post(endpoint, {
        body: 'mock-body',
      })
      .text();

    expect(result).toEqual(`Hey this is a successful POST response`);
  });

  it('Should not execute timeout when promise is resolved', async () => {
    const endpoint = `${server.url}/success`;

    const startTime = new Date().getTime();

    await httpForge.get(endpoint, { timeoutLength: 8000 }).text();

    const elapsedTime = startTime - new Date().getTime();

    expect(elapsedTime).toEqual(0);
  });

  it('Should use custom json-parser', async () => {
    const endpoint = `${server.url}/json-test`;

    const jsonBody = {
      key: 'value',
      key2: 'value2',
    };

    const customKey = 'Custom Parse Key';

    const jsonParser = (data: string) => {
      return {
        ...JSON.parse(data),
        customKey,
      };
    };

    const result = await httpForge
      .post(endpoint, {
        jsonBody,
        jsonParser,
      })
      .json();

    expect(result).toEqual({
      ...jsonBody,
      customKey,
    });
  });
});
