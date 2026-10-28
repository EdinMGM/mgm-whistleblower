/**
 * Tipovi grešaka sa HTTP status kodovima.
 * Svaka greška ima jasno definisan status i poruku bez curenja osjetljivih podataka.
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Neovlašten pristup') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Nemate dozvolu za ovu akciju') {
    super(403, message, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resurs nije pronađen') {
    super(404, message, 'NOT_FOUND');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Previše pokušaja. Pokušajte kasnije.') {
    super(429, message, 'RATE_LIMIT_EXCEEDED');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}
