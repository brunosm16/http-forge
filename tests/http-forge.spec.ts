import type createTestServer from 'create-test-server';

import httpForge from '@/main';

import { configTestServer } from './fixtures/config-test-server';

type Server = {
  get: (url: string, response: (() => string) | string) => void;
} & createTestServer.TestServer;

describe('Http forge tests', () => {
  let serverTest: Server = null;

  beforeEach(async () => {
    serverTest = await configTestServer();
  });

  afterEach(async () => {
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
  });
});
