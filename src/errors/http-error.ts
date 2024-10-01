export class HttpError extends Error {
  public status: number;

  constructor(response: Response) {
    const { status, statusText } = response;

    super(statusText);

    this.name = 'HttpError';
    this.status = status;
  }
}
