import express from 'express';
import 'express-async-errors';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { env } from './config/env';
import logger from './lib/logger';
import { errorHandler } from './middleware/errorHandler';

/**
 * Kreira i konfiguriše Express aplikaciju.
 * Odvojeno od server.ts radi lakšeg testiranja.
 */
export function createApp(): express.Express {
  const app = express();

  // ── Security headers ──
  app.use(helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: null,
      },
    } : false,
    crossOriginEmbedderPolicy: false,
  }));

  // ── CORS (samo u razvoju) ──
  if (env.NODE_ENV === 'development') {
    app.use(cors({
      origin: true,
      credentials: true,
    }));
  }

  // ── Body parsing ──
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // ── Rate limiting: opšti ──
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuta
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'RATE_LIMIT_EXCEEDED', message: 'Previše zahtjeva. Pokušajte kasnije.' },
  }));

  // ── Trust proxy (za X-Forwarded-* headere iza reverse proxy-ja) ──
  // 1 = trust first proxy (npr. nginx ili Cloudflare)
  app.set('trust proxy', 1);

  // ── Health check ──
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── API rute ──
  // Lazy load ruta radi bržeg startupa i izbjegavanja cirkularnih zavisnosti
  const { reportsRouter } = require('./modules/reports/reports.routes');
  const { authRouter } = require('./modules/auth/auth.routes');
  const { adminRouter } = require('./modules/admin/admin.routes');

  app.use('/api/reports', reportsRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);

  // ── Static frontend (produkcija) ──
  // U produkciji, backend servira buildani React frontend
  if (env.NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, '..', 'public');
    app.use(express.static(frontendPath));

    // SPA fallback — sve nepoznate rute vraćaju index.html
    app.get('*', (_req, res) => {
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  }

  // ── Error handler (mora biti zadnji) ──
  app.use(errorHandler);

  logger.info({ env: env.NODE_ENV }, 'Express aplikacija konfigurisana');
  return app;
}
