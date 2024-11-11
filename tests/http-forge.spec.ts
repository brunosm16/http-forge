import httpForge from '@/main';

import type { HttpForgeOptions } from './types/http';

import { configTestServer } from './fixtures/config-test-server';

describe('Http forge tests', () => {
  let serverTest: any = null;

  beforeAll(async () => {
    serverTest = await configTestServer();
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(async () => {
    await serverTest.close();
  });

  describe('HTTP Supported Methods', () => {
    it('Should return successfull response for DELETE method', async () => {
      const endpoint = `${serverTest.url}/success`;

      const result = await httpForge.delete(endpoint, {}).text();

      expect(result).toEqual('Hey this is a successful DELETE response');
    });

    it('Should return successful response for GET method', async () => {
      const endpoint = `${serverTest.url}/success`;

      const result = await httpForge.get(endpoint, {}).text();

      expect(result).toEqual('Hey this is a successful GET response');
    });

    it('Should return successful response for HEAD method', async () => {
      const endpoint = `${serverTest.url}/success`;

      const result = await httpForge.head(endpoint, {}).text();

      expect(result).toEqual('');
    });

    it('Should return successful response for PATCH method', async () => {
      const endpoint = `${serverTest.url}/success`;

      const result = await httpForge.patch(endpoint, {}).text();

      expect(result).toEqual('Hey this is a successful PATCH response');
    });

    it('Should return successful response for POST method', async () => {
      const endpoint = `${serverTest.url}/success`;

      const result = await httpForge.post(endpoint, {}).text();

      expect(result).toEqual('Hey this is a successful POST response');
    });

    it('Should return successful response for PUT method', async () => {
      const endpoint = `${serverTest.url}/success`;

      const result = await httpForge.put(endpoint, {}).text();

      expect(result).toEqual('Hey this is a successful PUT response');
    });
  });

  describe('HTTP Headers and Options', () => {
    it('Should append JSON body', async () => {
      const endpoint = `${serverTest.url}/json-test`;

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

    it('Should allow custom headers', async () => {
      const endpoint = `${serverTest.url}/headers-test`;

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
      const endpoint = `${serverTest.url}/error`;

      const response = httpForge
        .get(endpoint, {
          shouldHandleHttpErrors: false,
        })
        .text();

      expect(response).resolves.toBeDefined();
    });

    it('Should execute preRequestHook', async () => {
      const endpoint = `${serverTest.url}/json-test`;

      const jsonBody = {
        key: 'value',
        key2: 'value2',
      };

      async function mockAsyncCall() {
        await Promise.resolve();
      }

      const customPropertyHook = async (options: HttpForgeOptions) => {
        await mockAsyncCall();

        const reqBody = JSON.parse(options.body as string);

        reqBody.customProperty = true;

        // eslint-disable-next-line no-param-reassign
        options.body = JSON.stringify(reqBody);
      };

      const preRequestHooks = [customPropertyHook];

      const result = await httpForge
        .post(endpoint, {
          hooks: {
            preRequestHooks,
          },
          jsonBody,
        })
        .json();

      expect(result).toEqual({
        ...jsonBody,
        customProperty: true,
      });
    });

    it('Should thrown an error for wrong input with prefixURL', async () => {
      const endpoint = `/api/users`;

      let error = null;

      try {
        await httpForge.get(endpoint, { prefixURL: serverTest.url }).text();
      } catch (err) {
        error = err.message;
      }

      expect(error).toEqual(
        "'HttpForgeInput' cannot starts with '/' when using a prefixURL"
      );
    });

    it('Should make request with empty prefixURL', async () => {
      const endpoint = `${serverTest.url}/api/users`;

      const result = await httpForge.get(endpoint, { prefixURL: '' }).text();

      expect(result).toEqual('Mock users response');
    });

    it('Should make request with null prefixURL', async () => {
      const endpoint = `${serverTest.url}/api/users`;

      const result = await httpForge.get(endpoint, { prefixURL: null }).text();

      expect(result).toEqual('Mock users response');
    });

    it('Should make request with prefixURL', async () => {
      const endpoint = `api/users`;

      const result = await httpForge
        .get(endpoint, { prefixURL: serverTest.url })
        .text();

      expect(result).toEqual('Mock users response');
    });

    it('Should make request with prefixURL having subpaths with no ending path', async () => {
      const endpoint = `users`;

      const result = await httpForge
        .get(endpoint, { prefixURL: `${serverTest.url}/api` })
        .text();

      expect(result).toEqual('Mock users response');
    });

    it('Should make request with prefixURL having subpaths', async () => {
      const endpoint = `users`;

      const result = await httpForge
        .get(endpoint, { prefixURL: `${serverTest.url}/api/` })
        .text();

      expect(result).toEqual('Mock users response');
    });

    it('Should make request with prefixURL and empty endpoint', async () => {
      const result = await httpForge
        .get('', { prefixURL: `${serverTest.url}/` })
        .text();

      expect(result).toEqual('Root endpoint');
    });

    it('Should make request with prefixURL with no ending path and empty endpoint', async () => {
      const result = await httpForge
        .get('', { prefixURL: `${serverTest.url}` })
        .text();

      expect(result).toEqual('Root endpoint');
    });

    it('Should make request with queryParams and prefixURL as URL object', async () => {
      const prefixURL = new URL(`${serverTest.url}/?page=`);
      const page = 'http://mock-query-page/';

      const result = await httpForge.get(page, { prefixURL }).text();

      expect(result).toEqual('mock-query-page response');
    });

    it('Should make request with queryParams and page as URL object', async () => {
      const prefixURL = `${serverTest.url}/?page=`;
      const page = new URL('http://mock-query-page');

      const result = await httpForge.get(page, { prefixURL }).text();

      expect(result).toEqual('mock-query-page response');
    });

    it('Should make request with queryParams with both page and prefixURL as URL objects', async () => {
      const prefixURL = new URL(`${serverTest.url}/?page=`);
      const page = new URL('http://mock-query-page');

      const result = await httpForge.get(page, { prefixURL }).text();

      expect(result).toEqual('mock-query-page response');
    });

    it('Should accept requests without hooks', async () => {
      const endpoint = `${serverTest.url}/success`;

      const result = await httpForge
        .delete(endpoint, {
          hooks: {
            preRequestHooks: [],
            preResponseHooks: [],
          },
        })
        .text();

      expect(result).toEqual('Hey this is a successful DELETE response');
    });

    it('Should modify response with after-response-hook', async () => {
      const endpoint = `${serverTest.url}/success`;

      const customResponseHook = async (response: Response) => {
        const updatedResponse = new Response(
          'This is a mock response buffer for testing purposes',
          {
            headers: {
              'Content-Length': '48',
              'Content-Type': 'text/plain',
            },
            status: 200,
            statusText: 'OK',
          }
        );

        return updatedResponse;
      };

      const preResponseHooks = [customResponseHook];

      const result = await httpForge
        .get(endpoint, {
          hooks: {
            preResponseHooks,
          },
        })
        .text();

      expect(result).toEqual(
        'This is a mock response buffer for testing purposes'
      );
    });

    it('Should modify response with more than one after-response-hook', async () => {
      const endpoint = `${serverTest.url}/success`;

      const firstResponse = 'First response mock message';
      const secondResponse = 'Second response mock message';
      const expectedFinalResponse = `${firstResponse} - ${secondResponse}`;

      const customResponseHook = async (response: Response) => {
        const updatedResponse = new Response(firstResponse, {
          headers: {
            'Content-Length': '48',
            'Content-Type': 'text/plain',
          },
          status: 200,
          statusText: 'OK',
        });

        return updatedResponse;
      };

      const secondResponseHook = async (response: Response) => {
        const previousResponse = await response.text();
        const finalResponse = `${previousResponse} - ${secondResponse}`;

        const updatedResponse = new Response(finalResponse, {
          status: 200,
          statusText: 'OK',
        });

        return updatedResponse;
      };

      const preResponseHooks = [customResponseHook, secondResponseHook];

      const result = await httpForge
        .get(endpoint, {
          hooks: {
            preResponseHooks,
          },
        })
        .text();

      expect(result).toEqual(expectedFinalResponse);
    });

    it('Should modify response with after-response-hook when an error occurs', async () => {
      const endpoint = `${serverTest.url}/error`;

      const customResponseHook = async (response: Response) => {
        const { status } = response;
        const message = `Status before intercepting: ${status}`;

        const updatedResponse = new Response(message, {
          headers: {
            'Content-Length': '48',
            'Content-Type': 'text/plain',
          },
          status: 200,
          statusText: 'OK',
        });

        return updatedResponse;
      };

      const preResponseHooks = [customResponseHook];

      const result = await httpForge
        .get(endpoint, {
          hooks: {
            preResponseHooks,
          },
        })
        .text();

      expect(result).toEqual('Status before intercepting: 401');
    });

    it('Should throw an error on after-response-hook', async () => {
      const endpoint = `${serverTest.url}/error`;

      const customResponseHook = async (response: Response) => {
        throw new Error('Hook error');
      };

      const preResponseHooks = [customResponseHook];

      const result = httpForge
        .get(endpoint, {
          hooks: {
            preResponseHooks,
          },
        })
        .text();

      expect(result).rejects.toThrow();
    });

    it('Should allow search-params as text', async () => {
      const endpoint = `${serverTest.url}/search-params-test`;

      const searchParams = '?user=JonhDoe';

      const requestSearchParam = await httpForge
        .get(endpoint, {
          searchParams,
        })
        .text();

      expect(requestSearchParam).toEqual('?user=JonhDoe');
    });

    it('Should allow search-params as object', async () => {
      const endpoint = `${serverTest.url}/search-params-test`;

      const searchParams = {
        age: '22',
        user: 'Jonh Doe',
      };

      const requestSearchParam = await httpForge
        .get(endpoint, {
          searchParams,
        })
        .text();

      expect(requestSearchParam).toEqual('?age=22&user=Jonh+Doe');
    });

    it('Should allow URLSearchParams instance as search-params', async () => {
      const endpoint = `${serverTest.url}/search-params-test`;

      const searchParams = new URLSearchParams({
        email: 'jonhdoe@gmail.com',
        isAdmin: 'true',
      });

      const requestSearchParam = await httpForge
        .get(endpoint, {
          searchParams,
        })
        .text();

      expect(requestSearchParam).toEqual(
        '?email=jonhdoe%40gmail.com&isAdmin=true'
      );
    });

    it('Should abort request using abort-controller', async () => {
      const endpoint = `${serverTest.url}/success`;

      const abortController = new AbortController();

      const promise = httpForge.get(endpoint, {
        signal: abortController.signal,
      });

      abortController.abort();

      const result = promise.text();

      expect(result).rejects.toThrow('This operation was aborted');
    });

    it('Should no abort request after fetch was dispatched', async () => {
      const endpoint = `${serverTest.url}/success`;

      const abortController = new AbortController();

      const result = await httpForge
        .get(endpoint, {
          signal: abortController.signal,
        })
        .text();

      abortController.abort();

      expect(result).toEqual('Hey this is a successful GET response');
    });

    it('Should not allow a body with json-body property', async () => {
      const endpoint = `${serverTest.url}/json-test`;

      const jsonBody = {
        key: 'value',
        key2: 'value2',
      };

      let messageThrown = '';

      try {
        await httpForge
          .post(endpoint, {
            body: 'mock-body',
            jsonBody,
          })
          .json();
      } catch (err) {
        messageThrown = err?.message;
      }

      expect(messageThrown).toEqual(
        `The property 'body' cannot be used together with the 'jsonBody' property.`
      );
    });

    it('Should allow a body without json-body property', async () => {
      const endpoint = `${serverTest.url}/success`;

      const result = await httpForge
        .post(endpoint, {
          body: 'mock-body',
        })
        .text();

      expect(result).toEqual(`Hey this is a successful POST response`);
    });
  });
});
