import type { HttpError } from '@/errors';
import type { RetryPolicyConfig } from '@/types';

import {
  DEFAULT_DELAY_AFTER_MS,
  DEFAULT_HTTP_RETRY_ATTEMPTS,
  SUPPORTED_RETRY_AFTER_VERBS,
  SUPPORTED_RETRY_CODES,
  SUPPORTED_RETRY_VERBS,
} from '@/constants';
import { delay, isTimeStamp } from '@/utils';

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

export const getRetryAfterTimeStamp = (retryAfterHeader: string) => {
  return Date.parse(retryAfterHeader) - Date.now();
};

export const getRetryAfterNumber = (retryAfter: string) => {
  const retryAfterNumber = Number(retryAfter);

  if (Number.isNaN(retryAfterNumber)) {
    throw new Error(`'Retry-After' header must be a number or a timestamp`);
  }

  const retryAfterDelay = Number(retryAfter) * DEFAULT_DELAY_AFTER_MS;

  return retryAfterDelay;
};

export const parseRetryAfter = (error: unknown) => {
  const anyError = error as HttpError;
  const retryAfterHeader = anyError?.response?.headers?.get('Retry-After');

  if (isTimeStamp(retryAfterHeader)) {
    return getRetryAfterTimeStamp(retryAfterHeader);
  }

  return getRetryAfterNumber(retryAfterHeader);
};

export const applyRetryAfterDelay = async (
  error: unknown,
  retryPolicy: RetryPolicyConfig
) => {
  const retryAfter = parseRetryAfter(error);

  if (retryAfter > retryPolicy?.retryAfterLimit) {
    return;
  }

  await delay(retryAfter);
};
