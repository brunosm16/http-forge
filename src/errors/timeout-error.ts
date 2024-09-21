import type { HttpError } from '@/types/http';

import { HTTP_STATUS_CODES } from '@/constants';

const fixedStatusCodeTimeout = String(HTTP_STATUS_CODES.STATUS_CODE_408);

export class TimeoutError extends Error {
  constructor(httpError?: HttpError) {
    const { errorMessage } = httpError;

    super(fixedStatusCodeTimeout);

    this.name = 'TimeoutError';
    this.message = errorMessage ?? 'Request timeout';
  }
}
