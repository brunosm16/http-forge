import type { TransferStatus, TransferredData } from '@/types';

import httpForge from '@/main';

import { configTestServer } from '../fixtures/config-test-server';
import { customPropertyHook, customResponseHook } from '../fixtures/hooks';

describe('Hooks Tests', () => {
  let server: any = null;

  beforeAll(async () => {
    server = await configTestServer();
  });

  afterAll(async () => {
    await server.close();
    server = null;
  });

  describe('PreRequestHooks', () => {
    it('Should execute preRequestHook', async () => {
      const endpoint = `${server.url}/json-test`;

      const jsonBody = {
        key: 'value',
        key2: 'value2',
      };

      const result = await httpForge
        .post(endpoint, {
          hooks: {
            preRequestHooks: [customPropertyHook],
          },
          jsonBody,
        })
        .json();

      expect(result).toEqual({
        ...jsonBody,
        customProperty: true,
      });
    });

    it('Should accept request without hook', async () => {
      const endpoint = `${server.url}/success`;

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
  });

  describe('PreResponseHooks', () => {
    it('Should execute preResponseHook', async () => {
      const endpoint = `${server.url}/success`;

      const result = await httpForge
        .get(endpoint, {
          hooks: {
            preResponseHooks: [customResponseHook],
          },
        })
        .text();

      expect(result).toEqual(
        'This is a mock response buffer for testing purposes'
      );
    });

    it('Should execute multiply preResponse hooks', async () => {
      const endpoint = `${server.url}/success`;

      const firstResponse = 'First response mock message';
      const secondResponse = 'Second response mock message';
      const finalResponse = `${firstResponse} - ${secondResponse}`;

      const firstResponseHook = async (response: Response) => {
        const updatedResponse = new Response(firstResponse, {
          headers: {
            'Content-Length': '48',
            'Content-Type': 'text/plain',
            'X-Previous-Status': `${response.status}`,
          },
          status: 200,
          statusText: 'OK',
        });

        return updatedResponse;
      };

      const secondResponseHook = async (response: Response) => {
        const previousResponse = await response.text();

        return new Response(`${previousResponse} - ${secondResponse}`, {
          status: 200,
          statusText: 'OK',
        });
      };

      const result = await httpForge
        .get(endpoint, {
          hooks: {
            preResponseHooks: [firstResponseHook, secondResponseHook],
          },
        })
        .text();

      expect(result).toEqual(finalResponse);
    });

    it('Should execute preResponseHook when an error occurs', async () => {
      const endpoint = `${server.url}/error`;

      const customPreResponseHook = async (response: Response) => {
        const message = `Status before intercepting: ${response.status}`;

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

      const result = await httpForge
        .get(endpoint, {
          hooks: {
            preResponseHooks: [customPreResponseHook],
          },
        })
        .text();

      expect(result).toEqual('Status before intercepting: 401');
    });

    it('Should throw error from preResponse hook', async () => {
      const endpoint = `${server.url}/error`;

      // eslint-disable-next-line unused-imports/no-unused-vars
      const customErrorHook = async (response: Response) => {
        throw new Error('Hook error');
      };

      const result = httpForge
        .get(endpoint, {
          hooks: {
            preResponseHooks: [customErrorHook],
          },
        })
        .text();

      expect(result).rejects.toThrow();
    });

    it('Should use custom json-parser in preResponse hook', async () => {
      const endpoint = `${server.url}/success`;

      const customJsonHook = async (response: Response) => {
        const jsonString =
          '{"username":"jonhdoe", "email":"jonhdoe@email.com","age":25}';

        return new Response(jsonString, {
          headers: {
            'Content-Length': '48',
            'Content-Type': 'text/plain',
            'X-Previous-Status': `${response.status}`,
          },
          status: 200,
          statusText: 'OK',
        });
      };

      const result = await httpForge
        .get(endpoint, {
          hooks: {
            preResponseHooks: [customJsonHook],
          },
          jsonParser: (data: string) => {
            return {
              ...JSON.parse(data),
              customKey: 'Custom Parse Key',
            };
          },
        })
        .json();

      expect(result).toEqual({
        age: 25,
        customKey: 'Custom Parse Key',
        email: 'jonhdoe@email.com',
        username: 'jonhdoe',
      });
    });
  });

  describe('TransferHook', () => {
    it('Should provide progress information', async () => {
      const transferredData: TransferredData = [];

      const fileTransferHook = (
        fileTransferProgress: TransferStatus,
        chunk: Uint8Array
      ) => {
        transferredData.push({
          fileTransferProgress,
          transferredValue: String.fromCharCode(...chunk),
        });
      };

      const endpoint = `${server.url}/file-transfer`;

      await httpForge
        .get(endpoint, {
          hooks: {
            transferHook: fileTransferHook,
          },
        })
        .text();

      const initialPercentage =
        transferredData[0]?.fileTransferProgress?.percentage;

      const midArrayLength = transferredData.length / 2;

      const midPercentage =
        transferredData[midArrayLength]?.fileTransferProgress?.percentage;

      const finalPercentage =
        transferredData[transferredData.length - 1]?.fileTransferProgress
          ?.percentage;

      expect(initialPercentage).toEqual(0);
      expect(midPercentage).toBeGreaterThan(0);
      expect(finalPercentage).toEqual(1);
    });

    it('Should not provide progress information if file-size not informed', async () => {
      const transferredData: TransferredData = [];

      const fileTransferHook = (
        fileTransferProgress: TransferStatus,
        chunk: Uint8Array
      ) => {
        transferredData.push({
          fileTransferProgress,
          transferredValue: String.fromCharCode(...chunk),
        });
      };

      const endpoint = `${server.url}/file-transfer-no-size`;

      await httpForge
        .get(endpoint, {
          hooks: {
            transferHook: fileTransferHook,
          },
        })
        .text();

      const initialPercentage =
        transferredData[0]?.fileTransferProgress?.percentage;

      const midArrayLength = transferredData.length / 2;

      const midPercentage =
        transferredData[midArrayLength]?.fileTransferProgress?.percentage;

      const finalPercentage =
        transferredData[transferredData.length - 1]?.fileTransferProgress
          ?.percentage;

      expect(initialPercentage).toEqual(0);
      expect(midPercentage).toEqual(0);
      expect(finalPercentage).toEqual(0);
    });
  });
});
