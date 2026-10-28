import pino from 'pino';
import { env } from '../config/env';

/**
 * Pino logger sa redactovanjem osjetljivih polja.
 * IP adrese prijavitelja se ne zapisuju — u skladu sa zahtjevom za anonimnošću.
 */
const logger = pino({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  transport: env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'req.headers["x-forwarded-for"]',
      'req.remoteAddress',
      '*.secretKey',
      '*.secret_key',
      '*.password',
      '*.passwordHash',
      '*.secretKeyHash',
    ],
    censor: '[REDACTED]',
  },
});

export default logger;
