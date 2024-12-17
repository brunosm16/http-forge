import type { RetryPolicyConfig } from '@/types';

import {
  DEFAULT_HTTP_RETRY_ATTEMPTS,
  SUPPORTED_RETRY_AFTER_VERBS,
  SUPPORTED_RETRY_CODES,
  SUPPORTED_RETRY_VERBS,
} from '@/constants';

const resolveRetryAfterStatusCodes = (statusCodes: number[]): number[] => {
  if (!statusCodes) {
    return SUPPORTED_RETRY_AFTER_VERBS;
  }

  return Array.from(new Set(statusCodes));
};

const resolveAllowedRetryMethods = (methods: string[]): string[] => {
  if (!methods) {
    return SUPPORTED_RETRY_VERBS;
  }

  return Array.from(new Set(methods));
};

const resolveRetryStatusCodes = (statusCodes: number[]): number[] => {
  if (!statusCodes) {
    return SUPPORTED_RETRY_CODES;
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
