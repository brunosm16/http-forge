import httpForge from '@/main';

import { configTestServer } from '../fixtures/config-test-server';

describe('Headers Search Params Tests', () => {
  let serverTest: any = null;

  beforeAll(async () => {
    serverTest = await configTestServer();
  });

  afterAll(async () => {
    await serverTest.close();
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
});
