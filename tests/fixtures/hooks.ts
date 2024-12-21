import type { HttpRequestConfig } from '@/types';

async function mockAsyncCall() {
  await Promise.resolve();
}

export const customPropertyHook = async (options: HttpRequestConfig) => {
  await mockAsyncCall();

  const reqBody = JSON.parse(options.body as string);

  reqBody.customProperty = true;

  // eslint-disable-next-line no-param-reassign
  options.body = JSON.stringify(reqBody);
};

// eslint-disable-next-line unused-imports/no-unused-vars
export const customResponseHook = async (response: Response) => {
  return new Response('This is a mock response buffer for testing purposes', {
    headers: {
      'Content-Length': '48',
      'Content-Type': 'text/plain',
      'X-Previous-Status': `${response.status}`,
    },
    status: 200,
    statusText: 'OK',
  });
};
