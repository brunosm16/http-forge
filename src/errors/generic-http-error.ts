import type { HttpError } from '@/types/http';

export class GenericHttpError extends Error {
  constructor(httpError?: HttpError) {
    const { errorMessage, statusCode } = httpError;

    super(statusCode);

    this.name = 'GenericHttpError';

    this.message = errorMessage ?? 'An http error occurred';
  }
}
