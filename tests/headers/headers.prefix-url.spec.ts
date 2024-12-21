import httpForge from '@/main';

import { configTestServer } from '../fixtures/config-test-server';

describe('PrefixURL Header Tests', () => {
  let serverTest: any = null;

  beforeAll(async () => {
    serverTest = await configTestServer();
  });

  afterAll(async () => {
    await serverTest.close();
  });

  it('Should accept empty prefixURL', async () => {
    const endpoint = `${serverTest.url}/api/users`;

    const result = await httpForge.get(endpoint, { prefixURL: '' }).text();

    expect(result).toEqual('Mock users response');
  });

  it('Should accept null prefixURL', async () => {
    const endpoint = `${serverTest.url}/api/users`;

    const result = await httpForge.get(endpoint, { prefixURL: null }).text();

    expect(result).toEqual('Mock users response');
  });

  it('Should accept prefixURL', async () => {
    const endpoint = `api/users`;

    const result = await httpForge
      .get(endpoint, { prefixURL: serverTest.url })
      .text();

    expect(result).toEqual('Mock users response');
  });

  it('Should accept prefixURL with subpaths', async () => {
    const endpoint = `users`;

    const result = await httpForge
      .get(endpoint, { prefixURL: `${serverTest.url}/api/` })
      .text();

    expect(result).toEqual('Mock users response');
  });

  it('Should accept prefixURL with subpaths and no ending path', async () => {
    const endpoint = `users`;

    const result = await httpForge
      .get(endpoint, { prefixURL: `${serverTest.url}/api` })
      .text();

    expect(result).toEqual('Mock users response');
  });

  it('Should accept prefixURL with empty endpoint', async () => {
    const result = await httpForge
      .get('', { prefixURL: `${serverTest.url}/` })
      .text();

    expect(result).toEqual('Root endpoint');
  });

  it('Should accept prefixURL without ending path and empty endpoint', async () => {
    const result = await httpForge
      .get('', { prefixURL: `${serverTest.url}` })
      .text();

    expect(result).toEqual('Root endpoint');
  });

  it('Should thrown an error for invalid endpoint with prefixURL', async () => {
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

  it('Should accept queryParams and prefixURL as URL object', async () => {
    const prefixURL = new URL(`${serverTest.url}/?page=`);
    const page = 'http://mock-query-page/';

    const result = await httpForge.get(page, { prefixURL }).text();

    expect(result).toEqual('mock-query-page response');
  });

  it('Should accept queryParams and page as URL object', async () => {
    const prefixURL = `${serverTest.url}/?page=`;
    const page = new URL('http://mock-query-page');

    const result = await httpForge.get(page, { prefixURL }).text();

    expect(result).toEqual('mock-query-page response');
  });

  it('Should accept queryParams with both page and prefixURL as URL objects', async () => {
    const prefixURL = new URL(`${serverTest.url}/?page=`);
    const page = new URL('http://mock-query-page');

    const result = await httpForge.get(page, { prefixURL }).text();

    expect(result).toEqual('mock-query-page response');
  });
});
