import type { HttpError } from '@/types/errors';

import { HTTP_STATUS_CODES } from '@/constants';

const fixedStatusCodeTimeout = String(HTTP_STATUS_CODES.STATUS_CODE_408);
const fallBackErrorMessage = 'Request Timeout';

export class TimeoutError extends Error {
  constructor(httpError: HttpError) {
    const { errorMessage } = httpError;

    super(fixedStatusCodeTimeout);

    this.name = 'TimeoutError';
    this.message = errorMessage ?? fallBackErrorMessage;
  }
}
