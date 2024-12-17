import type { SupportedHTTPResponses, SupportedHTTPVerbs } from '@/types';

import { HTTP_STATUS_CODES } from './http-status-codes';

export const SUPPORTED_HTTP_VERBS = [
  'get',
  'post',
  'put',
  'patch',
  'head',
  'delete',
] as SupportedHTTPVerbs[];

export const SUPPORTED_HTTP_RESPONSES = [
  'json',
  'text',
  'formData',
  'blob',
  'arrayBuffer',
] as SupportedHTTPResponses[];

export const SUPPORTED_RETRY_VERBS = [
  'get',
  'put',
  'head',
  'delete',
] as string[];

export const SUPPORTED_RETRY_CODES = [
  HTTP_STATUS_CODES.STATUS_CODE_408,
  HTTP_STATUS_CODES.STATUS_CODE_413,
  HTTP_STATUS_CODES.STATUS_CODE_429,
  HTTP_STATUS_CODES.STATUS_CODE_500,
  HTTP_STATUS_CODES.STATUS_CODE_502,
  HTTP_STATUS_CODES.STATUS_CODE_503,
  HTTP_STATUS_CODES.STATUS_CODE_504,
] as number[];

export const SUPPORTED_RETRY_AFTER_VERBS = [
  HTTP_STATUS_CODES.STATUS_CODE_413,
  HTTP_STATUS_CODES.STATUS_CODE_429,
  HTTP_STATUS_CODES.STATUS_CODE_503,
] as number[];
