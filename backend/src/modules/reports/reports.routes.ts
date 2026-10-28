import { Router, Request, Response } from 'express';
import { createReportSchema, accessReportSchema } from './reports.schemas';
import { reportsService } from './reports.service';
import { requireReporterAccess } from '../../middleware/reporterAuth';
import { messagesService } from '../messages/messages.service';
import { reporterMessageSchema } from './reports.schemas';
import { AppError } from '../../lib/errors';

interface ReporterRequest extends Request {
  reporter?: { reportId: string; reportType: string };
}

const router = Router();

/**
 * POST /api/reports
 * Kreira novu prijavu. Prijavitelj ne mora navesti identifikacijske podatke.
 * Vraća referentni broj i tajni ključ (jedini put).
 */
router.post('/', async (req: Request, res: Response) => {
  const input = createReportSchema.parse(req.body);
  const result = await reportsService.createReport(input);

  res.status(201).json(result);
});

/**
 * POST /api/reports/access
 * Pristup postojećoj prijavi koristeći referentni broj + tajni ključ.
 * Tajni ključ se šalje u body, nikada u URL.
 */
router.post('/access', requireReporterAccess, async (req: ReporterRequest, res: Response) => {
  const report = await reportsService.getReportForReporter(req.reporter!.reportId);
  if (!report) {
    throw new AppError(404, 'Prijava nije pronađena');
  }
  res.json(report);
});

/**
 * POST /api/reports/messages
 * Prijavitelj šalje novu poruku u komunikacijskom prozoru.
 */
router.post('/messages', requireReporterAccess, async (req: ReporterRequest, res: Response) => {
  const body = reporterMessageSchema.parse(req.body);
  const message = await messagesService.sendReporterMessage(
    req.reporter!.reportId,
    body.content,
  );

  res.status(201).json(message);
});

/**
 * GET /api/reports/categories
 * Vraća listu dostupnih kategorija (za frontend dropdown).
 */
router.get('/categories', (_req: Request, res: Response) => {
  const { REPORT_CATEGORIES } = require('./reports.types');
  res.json({ categories: REPORT_CATEGORIES });
});

export const reportsRouter = router;
