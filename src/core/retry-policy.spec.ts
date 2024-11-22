import { HTTP_ALLOWED_RETRY_AFTER_STATUS_CODES } from '@/constants';

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
});
