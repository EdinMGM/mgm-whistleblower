import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import logger from '../lib/logger';

/**
 * Centralni error handler middleware.
 * Mora biti registriran zadnji u Express middleware lancu.
 *
 * Ne otkriva interne detalje greške u produkciji.
 * Logira sve greške osim 4xx klijentskih grešaka (osim 429).
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validacione greške
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Podaci nisu ispravni',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // Naše aplikacijske greške
  if (err instanceof AppError) {
    if (err.statusCode >= 500 || err.statusCode === 429) {
      logger.error({ err, path: req.path }, 'Application error');
    }
    res.status(err.statusCode).json({
      error: err.code ?? 'ERROR',
      message: err.message,
    });
    return;
  }

  // Neočekivane greške — ne otkrivaj detalje u produkciji
  logger.error({ err, path: req.path }, 'Unexpected error');
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Došlo je do neočekivane greške. Pokušajte ponovo.',
  });
}
