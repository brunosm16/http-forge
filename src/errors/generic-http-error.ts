import type { HttpError } from '@/types/http';

export class GenericHttpError extends Error {
  public statusCode: number | string;

  constructor(httpError?: HttpError) {
    const { errorMessage, statusCode } = httpError;

    super(statusCode);

    this.name = 'GenericHttpError';
    this.message = errorMessage ?? 'An http error occurred';
    this.statusCode = statusCode;
  }
}
