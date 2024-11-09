import type {
  HttpSupportedMethods,
  HttpSupportedResponses,
} from '@/types/http';

import { HTTP_STATUS_CODES } from './http-status-codes.constants';

export const HTTP_SUPPORTED_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'head',
  'delete',
] as HttpSupportedMethods[];

export const HTTP_SUPPORTED_RESPONSES = [
  'json',
  'text',
  'formData',
  'blob',
  'arrayBuffer',
] as HttpSupportedResponses[];

export const HTTP_ALLOWED_RETRY_METHODS = [
  'get',
  'put',
  'head',
  'delete',
] as string[];

export const HTTP_ALLOWED_RETRY_STATUS_CODES = [
  HTTP_STATUS_CODES.STATUS_CODE_408,
  HTTP_STATUS_CODES.STATUS_CODE_413,
  HTTP_STATUS_CODES.STATUS_CODE_429,
  HTTP_STATUS_CODES.STATUS_CODE_500,
  HTTP_STATUS_CODES.STATUS_CODE_502,
  HTTP_STATUS_CODES.STATUS_CODE_503,
  HTTP_STATUS_CODES.STATUS_CODE_504,
] as number[];

export const HTTP_ALLOWED_RETRY_AFTER_STATUS_CODES = [
  HTTP_STATUS_CODES.STATUS_CODE_413,
  HTTP_STATUS_CODES.STATUS_CODE_429,
  HTTP_STATUS_CODES.STATUS_CODE_503,
] as number[];
