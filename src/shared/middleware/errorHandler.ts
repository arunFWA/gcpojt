import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';

/**
 * Terminal error-handling middleware. This is the ONLY place in the codebase
 * permitted to inspect an error's shape generically -- every route/service
 * upstream must already be throwing AppError subclasses.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  // Anything reaching here is a bug: a raw Error escaped the AppError contract.
  // Logged distinctly so the Evaluator's automated check and the Monitor's
  // run-log can both detect contract violations that slip past code review.
  // eslint-disable-next-line no-console
  console.error('[UNHANDLED_ERROR] Non-AppError reached the terminal handler:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
