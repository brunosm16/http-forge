/* eslint-disable unused-imports/no-unused-vars */
import type { HttpRequestConfig, RequestSource } from '@/types';

const mockError = new Error('Mock Error');

async function mockAsyncCall() {
  await Promise.resolve();
}

export const customPropertyHook = async (requestConfig: HttpRequestConfig) => {
  await mockAsyncCall();

  const reqBody = JSON.parse(requestConfig.body as string);

  reqBody.customProperty = true;

  // eslint-disable-next-line no-param-reassign
  requestConfig.body = JSON.stringify(reqBody);
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

export const preRetryHook = async (
  requestSource: RequestSource,
  retryAttempts: number,
  error: Error,
  requestConfig: HttpRequestConfig
) => {
  // eslint-disable-next-line no-param-reassign
  requestConfig.headers = new Headers({
    customHeader: 'This is a custom header',
    error: error.message,
    requestSource: JSON.stringify(requestSource),
    retryAttempts: retryAttempts.toString(),
  });
};

export const preRetryHookError = async (
  requestSource: RequestSource,
  retryAttempts: number,
  error: Error,
  requestConfig: HttpRequestConfig
) => {
  throw mockError;
};

export const preRetryHookReject = async (
  requestSource: RequestSource,
  retryAttempts: number,
  error: Error,
  requestConfig: HttpRequestConfig
) => {
  Promise.reject(mockError);
};
