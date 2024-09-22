import type { HttpResponsesTypes } from '@/types/http';

import { HTTP_STATUS_CODES } from './http-status-codes';

export const REQUEST_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'HEAD',
  'DELETE',
];

export const HTTP_RESPONSES_TYPES = [
  'json',
  'text',
  'formData',
  'blob',
  'arrayBuffer',
] as HttpResponsesTypes[];

export const RETRY_METHODS = [
  'GET',
  'PUT',
  'HEAD',
  'DELETE',
  'OPTIONS',
  'TRACE',
];

export const RETRY_STATUS_CODES = [
  HTTP_STATUS_CODES.STATUS_CODE_408,
  HTTP_STATUS_CODES.STATUS_CODE_413,
  HTTP_STATUS_CODES.STATUS_CODE_429,
  HTTP_STATUS_CODES.STATUS_CODE_500,
  HTTP_STATUS_CODES.STATUS_CODE_502,
  HTTP_STATUS_CODES.STATUS_CODE_503,
  HTTP_STATUS_CODES.STATUS_CODE_504,
] as number[];

export const RETRY_BACKOFF_FACTOR = 0.3;
