export class HttpError extends Error {
  public statusCode: number;
  constructor(statusCode: number, message: string, cause?: unknown) {
    super(message, { cause });
    this.statusCode = statusCode;
    this.name = 'HttpError';
  }

  public static fromError(error: unknown, defaultError: (cause?: unknown) => HttpError): HttpError {
    if (error instanceof HttpError) {
      return error;
    }
    return defaultError(error);
  }
}
