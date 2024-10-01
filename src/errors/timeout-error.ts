import { HTTP_STATUS_CODES } from '@/constants';

const TIMEOUT_STATUS_CODE = String(HTTP_STATUS_CODES.STATUS_CODE_408);

export class TimeoutError extends Error {
  constructor(message?: string) {
    super(TIMEOUT_STATUS_CODE);

    this.name = 'TimeoutError';
    this.message = message ?? 'Request timeout';
  }
}
