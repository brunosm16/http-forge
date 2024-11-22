import type { RetryPolicyConfig } from '@/types/http';

import { HTTP_ALLOWED_RETRY_AFTER_STATUS_CODES } from '@/constants';

const resolveRetryAfterStatusCodes = (statusCodes: number[]): number[] => {
  if (!statusCodes) {
    return HTTP_ALLOWED_RETRY_AFTER_STATUS_CODES;
  }

  return Array.from(new Set(statusCodes));
};

export const buildRetryPolicyConfig = (
  inputRetryPolicy: RetryPolicyConfig
): RetryPolicyConfig => {
  const allowedRetryAfterStatusCodes = resolveRetryAfterStatusCodes(
    inputRetryPolicy?.allowedRetryAfterStatusCodes
  );

  return {
    allowedRetryAfterStatusCodes,
  };
};
