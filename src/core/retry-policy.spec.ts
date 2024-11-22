import {
  HTTP_ALLOWED_RETRY_AFTER_STATUS_CODES,
  HTTP_ALLOWED_RETRY_METHODS,
  HTTP_ALLOWED_RETRY_STATUS_CODES,
  HTTP_FORGE_DEFAULT_RETRY_LENGTH,
} from '@/constants';

import { buildRetryPolicyConfig } from './retry-policy';

describe('retry-policy', () => {
  it(`Should use fallback option for 'allowedRetryAfterStatusCodes'`, () => {
    const options = buildRetryPolicyConfig({});

    expect(options.allowedRetryAfterStatusCodes).toEqual(
      HTTP_ALLOWED_RETRY_AFTER_STATUS_CODES
    );
  });

  it(`Should set retry policy for 'allowedRetryAfterStatusCodes'`, () => {
    const retryAfterStatusCodes = [403, 500, 513];

    const options = buildRetryPolicyConfig({
      allowedRetryAfterStatusCodes: retryAfterStatusCodes,
    });

    expect(options.allowedRetryAfterStatusCodes).toEqual(retryAfterStatusCodes);
  });

  it(`Should use fallback option for 'allowedRetryMethods'`, () => {
    const options = buildRetryPolicyConfig({});

    expect(options.allowedRetryMethods).toEqual(HTTP_ALLOWED_RETRY_METHODS);
  });

  it(`Should set retry policy for 'allowedRetryMethods'`, () => {
    const retryMethods = ['patch', 'post', 'trace'];
    const options = buildRetryPolicyConfig({
      allowedRetryMethods: retryMethods,
    });

    expect(options.allowedRetryMethods).toEqual(retryMethods);
  });

  it(`Should use fallback option for 'allowedRetryStatusCodes'`, () => {
    const options = buildRetryPolicyConfig({});

    expect(options.allowedRetryStatusCodes).toEqual(
      HTTP_ALLOWED_RETRY_STATUS_CODES
    );
  });

  it(`Should set retry policy for 'allowedRetryStatusCodes'`, () => {
    const statusCodes = [403, 500, 513];

    const options = buildRetryPolicyConfig({
      allowedRetryStatusCodes: statusCodes,
    });

    expect(options.allowedRetryStatusCodes).toEqual(statusCodes);
  });

  it(`Should throw an error if retry-length is negative`, () => {
    expect(() =>
      buildRetryPolicyConfig({
        retryLength: -10,
      })
    ).toThrow(`'retry-length' should be a positive integer`);
  });

  it(`Should use fallback option for 'retry-length'`, () => {
    const options = buildRetryPolicyConfig({});

    expect(options.retryLength).toEqual(HTTP_FORGE_DEFAULT_RETRY_LENGTH);
  });

  it(`Should set retry policy for 'retry-length'`, () => {
    const options = buildRetryPolicyConfig({
      retryLength: 8,
    });

    expect(options.retryLength).toEqual(8);
  });
});
