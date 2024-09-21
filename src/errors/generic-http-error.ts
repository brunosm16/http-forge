import type { HttpError } from '@/types/errors';

export class GenericHttpError extends Error {
  constructor(httpError: HttpError) {
    const { errorMessage, statusCode } = httpError;

    super(statusCode);

    this.name = 'GenericHttpError';

    this.message = errorMessage;
  }
}
