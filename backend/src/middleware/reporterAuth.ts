import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { verifySecretKey } from '../lib/crypto';
import { UnauthorizedError, RateLimitError } from '../lib/errors';
import logger from '../lib/logger';

/**
 * Interface za autentifikovanog prijavitelja.
 * Sadrži samo ID prijave — nikada tajni ključ ili druge osjetljive podatke.
 */
export interface ReporterContext {
  reportId: string;
  reportType: string;
}

/**
 * Middleware: provjerava pristup prijavitelja koristeći referentni broj + tajni ključ.
 *
 * Sigurnosne mjere:
 * - Tajni ključ se šalje u request body (POST), nikada u URL parametrima
 * - Ne otkriva se da li referentni broj postoji (ista greška za sve)
 * - Brute-force zaštita: nakon 5 neuspješnih pokušaja, zaključavanje na 15 minuta
 * - accessAttempts se resetuje nakon uspješnog pristupa
 */
export async function requireReporterAccess(
  req: Request & { reporter?: ReporterContext },
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { referenceNumber, secretKey } = req.body;

    if (!referenceNumber || !secretKey) {
      throw new UnauthorizedError('Referentni broj i pristupni ključ su obavezni');
    }

    const report = await prisma.report.findUnique({
      where: { referenceNumber },
      select: {
        id: true,
        reportType: true,
        secretKeyHash: true,
        accessAttempts: true,
        lockedUntil: true,
      },
    });

    // Uvijek vrati istu grešku — ne otkrivaj da li ref broj postoji
    const genericError = new UnauthorizedError('Neispravan referentni broj ili pristupni ključ');

    if (!report) {
      next(genericError);
      return;
    }

    // Provjeri zaključavanje
    if (report.lockedUntil && report.lockedUntil > new Date()) {
      next(new RateLimitError('Previše neuspješnih pokušaja. Pokušajte kasnije.'));
      return;
    }

    // Provjeri tajni ključ
    const isValid = await verifySecretKey(secretKey, report.secretKeyHash);

    if (!isValid) {
      // Povećaj broj pokušaja
      const attempts = report.accessAttempts + 1;
      const shouldLock = attempts >= 5;
      await prisma.report.update({
        where: { id: report.id },
        data: {
          accessAttempts: attempts,
          lockedUntil: shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      });

      logger.warn({ reportId: report.id, attempts }, 'Failed reporter access attempt');
      next(genericError);
      return;
    }

    // Uspješan pristup — resetuj brojač
    await prisma.report.update({
      where: { id: report.id },
      data: { accessAttempts: 0, lockedUntil: null, lastActivityAt: new Date() },
    });

    req.reporter = {
      reportId: report.id,
      reportType: report.reportType,
    };

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof RateLimitError) {
      next(err);
    } else {
      logger.error({ err }, 'Error in reporter auth');
      next(new UnauthorizedError('Neispravan referentni broj ili pristupni ključ'));
    }
  }
}
