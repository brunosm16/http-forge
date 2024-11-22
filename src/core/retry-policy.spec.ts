import {
  HTTP_ALLOWED_RETRY_AFTER_STATUS_CODES,
  HTTP_ALLOWED_RETRY_METHODS,
  HTTP_ALLOWED_RETRY_STATUS_CODES,
} from '@/constants';

import { buildRetryPolicyConfig } from './retry-policy';

describe('retry-policy', () => {
  it(`Should use fallback option for 'allowedRetryAfterStatusCodes'`, async () => {
    const options = buildRetryPolicyConfig({});

    expect(options.allowedRetryAfterStatusCodes).toEqual(
      HTTP_ALLOWED_RETRY_AFTER_STATUS_CODES
    );
  });

  it(`Should set retry policy for 'allowedRetryAfterStatusCodes'`, async () => {
    const retryAfterStatusCodes = [403, 500, 513];

    const options = buildRetryPolicyConfig({
      allowedRetryAfterStatusCodes: retryAfterStatusCodes,
    });

    expect(options.allowedRetryAfterStatusCodes).toEqual(retryAfterStatusCodes);
  });

  it(`Should use fallback option for 'allowedRetryMethods'`, async () => {
    const options = buildRetryPolicyConfig({});

    expect(options.allowedRetryMethods).toEqual(HTTP_ALLOWED_RETRY_METHODS);
  });

  it(`Should set retry policy for 'allowedRetryMethods'`, async () => {
    const retryMethods = ['patch', 'post', 'trace'];
    const options = buildRetryPolicyConfig({
      allowedRetryMethods: retryMethods,
    });

    expect(options.allowedRetryMethods).toEqual(retryMethods);
  });

  it(`Should use fallback option for 'allowedRetryStatusCodes'`, async () => {
    const options = buildRetryPolicyConfig({});

    expect(options.allowedRetryStatusCodes).toEqual(
      HTTP_ALLOWED_RETRY_STATUS_CODES
    );
  });

  it(`Should set retry policy for 'allowedRetryStatusCodes'`, async () => {
    const statusCodes = [403, 500, 513];

    const options = buildRetryPolicyConfig({
      allowedRetryStatusCodes: statusCodes,
    });

    expect(options.allowedRetryStatusCodes).toEqual(statusCodes);
  });
});
