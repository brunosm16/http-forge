import type { HttpError } from '@/errors';

import {
  DEFAULT_HTTP_RETRY_ATTEMPTS,
  SUPPORTED_RETRY_AFTER_VERBS,
  SUPPORTED_RETRY_CODES,
  SUPPORTED_RETRY_VERBS,
} from '@/constants';

import {
  buildRetryPolicyConfig,
  getRetryAfterNumber,
  getRetryAfterTimeStamp,
  parseRetryAfter,
} from './retry-policy';

describe('retry-policy', () => {
  it(`Should use fallback option for 'allowedRetryAfterStatusCodes'`, () => {
    const options = buildRetryPolicyConfig({});

    expect(options.allowedRetryAfterStatusCodes).toEqual(
      SUPPORTED_RETRY_AFTER_VERBS
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

    expect(options.allowedRetryMethods).toEqual(SUPPORTED_RETRY_VERBS);
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

    expect(options.allowedRetryStatusCodes).toEqual(SUPPORTED_RETRY_CODES);
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

    expect(options.retryLength).toEqual(DEFAULT_HTTP_RETRY_ATTEMPTS);
  });

  it(`Should set retry policy for 'retry-length'`, () => {
    const options = buildRetryPolicyConfig({
      retryLength: 8,
    });

    expect(options.retryLength).toEqual(8);
  });
});

describe('retry-policy - utility methods', () => {
  jest.mock('@/utils', () => ({
    delay: jest.fn(),
    isTimeStamp: jest.fn(),
  }));

  it('Should parse Retry-After header as timestamp', () => {
    const error = {
      response: {
        headers: {
          get: jest.fn().mockReturnValue('Wed, 21 Oct 2015 07:28:00 GMT'),
        },
      },
    } as unknown as HttpError;

    const retryAfter = parseRetryAfter(error);
    expect(retryAfter).toBe(
      getRetryAfterTimeStamp('Wed, 21 Oct 2015 07:28:00 GMT')
    );
  });

  it('Should parse Retry-After header as number', () => {
    const error = {
      response: {
        headers: {
          get: jest.fn().mockReturnValue('120'),
        },
      },
    } as unknown as HttpError;

    const retryAfter = parseRetryAfter(error);
    expect(retryAfter).toBe(getRetryAfterNumber('120'));
  });

  it('Should throw error for invalid Retry-After header', () => {
    const error = {
      response: {
        headers: {
          get: jest.fn().mockReturnValue('invalid'),
        },
      },
    } as unknown as HttpError;

    expect(() => parseRetryAfter(error)).toThrow(
      `'Retry-After' header must be a number or a timestamp`
    );
  });
});
