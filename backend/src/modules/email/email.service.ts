import nodemailer from 'nodemailer';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { ReportType, EmailStatus } from '@prisma/client';
import logger from '../../lib/logger';

/**
 * Kreira SMTP transporter ako su SMTP postavke konfigurisane.
 * U razvoju, ako SMTP nije konfigurisan, emailovi se samo logiraju.
 */
function createTransporter() {
  if (!env.SMTP_HOST) {
    logger.warn('SMTP_HOST nije konfigurisan — emailovi će biti samo logirani');
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    } : undefined,
  });
}

/**
 * Formatira email sadržaj za obavijest o novoj prijavi.
 * Ne uključuje osjetljiv sadržaj prijave — samo referentni broj i osnovne info.
 */
function buildNewReportEmail(referenceNumber: string, reportType: ReportType): { subject: string; body: string } {
  const typeLabel = reportType === ReportType.SENSITIVE
    ? 'Prijava o direktoru / Compliance Officeru'
    : 'Prijava neusklađenosti u organizaciji';

  return {
    subject: `[MGM Farm] Nova prijava — ${referenceNumber}`,
    body: `Poštovani,\n\nZaprimljena je nova prijava.\n\nReferentni broj: ${referenceNumber}\nVrsta prijave: ${typeLabel}\nDatum zaprimanja: ${new Date().toLocaleString('bs-BA')}\n\nDetalji prijave su dostupni kroz zaštićeni administratorski interfejs.\n\nOva poruka je automatska. Molimo ne odgovarajte na nju.\n\nMGM Farm d.o.o.`,
  };
}

function buildNewMessageEmail(referenceNumber: string): { subject: string; body: string } {
  return {
    subject: `[MGM Farm] Nova poruka — ${referenceNumber}`,
    body: `Poštovani,\n\nPrijavitelj je poslao novu poruku u komunikacijskom prozoru.\n\nReferentni broj: ${referenceNumber}\n\nPristupite komunikacijskom prozoru kroz administratorski interfejs.\n\nMGM Farm d.o.o.`,
  };
}

/**
 * Email queue — dodaje obavijesti u bazu i pokušava slati.
 * Ako slanje ne uspije, prijava nije izgubljena — email ostaje u redu za ponovni pokušaj.
 */
export const emailQueue = {
  /**
   * Dodaje email u red čekanja i pokušava poslati.
   */
  async add(params: {
    recipient: string;
    reportId: string;
    reportType: ReportType;
    referenceNumber: string;
    eventType?: string;
  }): Promise<void> {
    const { subject, body } = params.eventType === 'NEW_MESSAGE'
      ? buildNewMessageEmail(params.referenceNumber)
      : buildNewReportEmail(params.referenceNumber, params.reportType);

    // Spremi u bazu (PENDING)
    const entry = await prisma.emailQueue.create({
      data: {
        recipient: params.recipient,
        subject,
        body,
        reportId: params.reportId,
        reportType: params.reportType,
        status: EmailStatus.PENDING,
      },
    });

    // Pokušaj poslati odmah
    await this.processEntry(entry.id);
  },

  /**
   * Procesira jedan email iz reda.
   * Ako ne uspije, povećava broj pokušaja i sprema grešku.
   */
  async processEntry(emailId: string): Promise<void> {
    const transporter = createTransporter();

    if (!transporter) {
      // U razvoju — samo logiraj i označi kao "poslano" da ne blokira red
      if (env.NODE_ENV === 'development') {
        const entry = await prisma.emailQueue.findUnique({ where: { id: emailId } });
        if (entry) {
          logger.info({ emailId, recipient: entry.recipient, subject: entry.subject }, 'DEV: Email (not sent, SMTP not configured)');
          await prisma.emailQueue.update({
            where: { id: emailId },
            data: { status: EmailStatus.SENT, sentAt: new Date(), attempts: 1 },
          });
        }
      }
      return;
    }

    const entry = await prisma.emailQueue.findUnique({ where: { id: emailId } });
    if (!entry || entry.status === EmailStatus.SENT) return;

    try {
      await transporter.sendMail({
        from: env.SMTP_FROM,
        to: entry.recipient,
        subject: entry.subject,
        text: entry.body,
      });

      await prisma.emailQueue.update({
        where: { id: emailId },
        data: { status: EmailStatus.SENT, sentAt: new Date(), attempts: entry.attempts + 1, lastError: null },
      });

      logger.info({ emailId, recipient: entry.recipient }, 'Email sent successfully');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ emailId, err: errorMsg }, 'Email sending failed');

      await prisma.emailQueue.update({
        where: { id: emailId },
        data: {
          attempts: entry.attempts + 1,
          lastError: errorMsg,
          status: entry.attempts + 1 >= 5 ? EmailStatus.FAILED : EmailStatus.PENDING,
        },
      });
    }
  },

  /**
   * Ponovo pokušava poslati sve neuspjele emailove (za cron/admin akciju).
   */
  async retryFailed(): Promise<number> {
    const failed = await prisma.emailQueue.findMany({
      where: { status: EmailStatus.PENDING },
    });

    let count = 0;
    for (const entry of failed) {
      await this.processEntry(entry.id);
      count++;
    }

    return count;
  },
};
