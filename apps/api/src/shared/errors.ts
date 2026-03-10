export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(opts: { code: string; message: string; statusCode: number; details?: unknown }) {
    super(opts.message);
    this.code = opts.code;
    this.statusCode = opts.statusCode;
    this.details = opts.details;
  }
}

export const Errors = {
  unauthorized: (message = 'Unauthorized') => new AppError({ code: 'UNAUTHORIZED', message, statusCode: 401 }),
  forbidden: (message = 'Forbidden') => new AppError({ code: 'FORBIDDEN', message, statusCode: 403 }),
  badRequest: (message = 'Bad request', details?: unknown) =>
    new AppError({ code: 'BAD_REQUEST', message, statusCode: 400, details }),
  notFound: (message = 'Not found') => new AppError({ code: 'NOT_FOUND', message, statusCode: 404 }),
  conflict: (message = 'Conflict', details?: unknown) =>
    new AppError({ code: 'CONFLICT', message, statusCode: 409, details })
} as const;

