export class HttpError extends Error {
  public response: Response;

  public status: number;

  constructor(response: Response) {
    const { status, statusText } = response;

    super(statusText);

    this.name = 'HttpError';
    this.status = status;
    this.response = response;
  }
}
