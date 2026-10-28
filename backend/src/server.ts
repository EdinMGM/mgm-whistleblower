import { createApp } from './app';
import { env } from './config/env';
import logger from './lib/logger';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'MGM Whistleblower server pokrenut');
});

// Graceful shutdown
function shutdown(signal: string): void {
  logger.info(`${signal} primljen — gašenje servera...`);
  server.close(() => {
    logger.info('Server uspješno ugašen');
    process.exit(0);
  });

  // Ako se ne ugasi u 10 sekundi, prisilno zatvori
  setTimeout(() => {
    logger.error('Prisilno gašenje nakon timeouta');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
