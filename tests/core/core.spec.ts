import httpForge from '@/main';

import { configTestServer } from '../fixtures/config-test-server';

describe('Core Tests', () => {
  let server = null;

  beforeAll(async () => {
    server = await configTestServer();
  });

  afterAll(async () => {
    await server.close();
    server = null;
  });

  describe('Supported HTTP Verbs', () => {
    it('Should handle a successful DELETE request', async () => {
      const endpoint = `${server.url}/success`;

      const result = await httpForge.delete(endpoint).text();

      expect(result).toEqual('Hey this is a successful DELETE response');
    });

    it('Should handle a successful GET request', async () => {
      const endpoint = `${server.url}/success`;

      const result = await httpForge.get(endpoint).text();

      expect(result).toEqual('Hey this is a successful GET response');
    });

    it('Should handle a successful HEAD request', async () => {
      const endpoint = `${server.url}/success`;

      const result = await httpForge.head(endpoint).text();

      expect(result).toEqual('');
    });

    it('Should handle a successful PATCH request', async () => {
      const endpoint = `${server.url}/success`;

      const result = await httpForge.patch(endpoint).text();

      expect(result).toEqual('Hey this is a successful PATCH response');
    });

    it('Should handle a successful POST request', async () => {
      const endpoint = `${server.url}/success`;

      const result = await httpForge.post(endpoint).text();

      expect(result).toEqual('Hey this is a successful POST response');
    });

    it('Should handle successful PUT request', async () => {
      const endpoint = `${server.url}/success`;

      const result = await httpForge.put(endpoint).text();

      expect(result).toEqual('Hey this is a successful PUT response');
    });
  });

  describe('Error Handling', () => {
    it('Should handle a 200 response with empty JSON and return an appropriate error message', async () => {
      const endpoint = `${server.url}/empty-response`;
      let errorMessage: null | string = null;

      try {
        await httpForge.get(endpoint).json();
      } catch (err) {
        errorMessage = err?.message;
      }

      expect(errorMessage).toEqual('Unexpected end of JSON input');
    });

    it('Should handle a 204 response with empty JSON and return an appropriate error message', async () => {
      const endpoint = `${server.url}/no-content`;
      const result = await httpForge.get(endpoint).json();
      expect(result).toEqual('');
    });
  });
});
