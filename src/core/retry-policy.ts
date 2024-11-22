import type { RetryPolicyConfig } from '@/types/http';

import {
  HTTP_ALLOWED_RETRY_AFTER_STATUS_CODES,
  HTTP_ALLOWED_RETRY_METHODS,
} from '@/constants';

const resolveRetryAfterStatusCodes = (statusCodes: number[]): number[] => {
  if (!statusCodes) {
    return HTTP_ALLOWED_RETRY_AFTER_STATUS_CODES;
  }

  return Array.from(new Set(statusCodes));
};

const resolveAllowedRetryMethods = (methods: string[]): string[] => {
  if (!methods) {
    return HTTP_ALLOWED_RETRY_METHODS;
  }

  return Array.from(new Set(methods));
};

export const buildRetryPolicyConfig = (
  inputRetryPolicy: RetryPolicyConfig
): RetryPolicyConfig => {
  const allowedRetryAfterStatusCodes = resolveRetryAfterStatusCodes(
    inputRetryPolicy?.allowedRetryAfterStatusCodes
  );

  const allowedRetryMethods = resolveAllowedRetryMethods(
    inputRetryPolicy?.allowedRetryMethods
  );

  return {
    allowedRetryAfterStatusCodes,
    allowedRetryMethods,
  };
};
