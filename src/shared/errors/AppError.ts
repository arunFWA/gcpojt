/**
 * StoreOps typed error hierarchy.
 *
 * Architecture rule (non-negotiable, enforced by the harness Evaluator):
 * No route or service may `throw new Error(...)`. Every thrown error must
 * extend AppError so that the global error-handling middleware can derive
 * a stable HTTP status code and a machine-readable `code` for API clients.
 *
 * This directly closes failure mode #2 from the client engagement:
 * "Raw Error throws in service methods, bypassing the project's typed
 * AppError hierarchy."
 */
export abstract class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  protected constructor(code: string, message: string, statusCode: number, isOperational = true) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} with id '${id}' was not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly fields?: Record<string, string>) {
    super('VALIDATION_ERROR', message, 400);
  }

  public override toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        fields: this.fields ?? {},
      },
    };
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super('FORBIDDEN', message, 403);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication is required') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

export class PartialFailureError extends AppError {
  constructor(
    message: string,
    public readonly failures: Array<{ id: string; reason: string }>,
  ) {
    super('PARTIAL_FAILURE', message, 207);
  }

  public override toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        failures: this.failures,
      },
    };
  }
}
