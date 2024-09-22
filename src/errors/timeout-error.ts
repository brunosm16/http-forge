import { HTTP_STATUS_CODES } from '@/constants';

const fixedStatusCodeTimeout = String(HTTP_STATUS_CODES.STATUS_CODE_408);

export class TimeoutError extends Error {
  constructor(message?: string) {
    super(fixedStatusCodeTimeout);

    this.name = 'TimeoutError';
    this.message = message ?? 'Request timeout';
  }
}
