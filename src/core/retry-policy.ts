import type { RetryPolicyConfig } from '@/types/http';

import {
  DEFAULT_HTTP_RETRY_ATTEMPTS,
  HTTP_ALLOWED_RETRY_AFTER_STATUS_CODES,
  HTTP_ALLOWED_RETRY_METHODS,
  HTTP_ALLOWED_RETRY_STATUS_CODES,
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

const resolveRetryStatusCodes = (statusCodes: number[]): number[] => {
  if (!statusCodes) {
    return HTTP_ALLOWED_RETRY_STATUS_CODES;
  }

  return Array.from(new Set(statusCodes));
};

const resolveRetryLength = (retryLength: number): number => {
  if (retryLength < 0) {
    throw new Error(`'retry-length' should be a positive integer`);
  }

  if (!retryLength) {
    return DEFAULT_HTTP_RETRY_ATTEMPTS;
  }

  return retryLength;
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

  const allowedRetryStatusCodes = resolveRetryStatusCodes(
    inputRetryPolicy?.allowedRetryStatusCodes
  );

  const retryLength = resolveRetryLength(inputRetryPolicy?.retryLength);

  return {
    allowedRetryAfterStatusCodes,
    allowedRetryMethods,
    allowedRetryStatusCodes,
    retryAfterLimit: inputRetryPolicy?.retryAfterLimit,
    retryLength,
  };
};
