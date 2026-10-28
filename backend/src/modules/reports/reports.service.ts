import { ReportType } from '@prisma/client';
import { reportsRepository } from './reports.repository';
import { generateReferenceNumber, generateSecretKey, hashSecretKey } from '../../lib/crypto';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { emailQueue } from '../email/email.service';
import logger from '../../lib/logger';
import { CreateReportInput, CreatedReport } from './reports.types';

export const reportsService = {
  /**
   * Kreira novu prijavu.
   * 1. Generiše referentni broj (provjerava jedinstvenost)
   * 2. Generiše tajni ključ
   * 3. Hashira tajni ključ (argon2id)
   * 4. Sprema prijavu u bazu
   * 5. Stavlja email obavijest u red čekanja
   * Vraća referentni broj i PLAINTEXT tajni ključ (jedini put kad se vraća).
   */
  async createReport(input: CreateReportInput): Promise<CreatedReport> {
    // Generiši jedinstveni referentni broj (retry ako već postoji)
    let referenceNumber = generateReferenceNumber();
    let attempts = 0;
    while (await reportsRepository.findByReferenceNumber(referenceNumber)) {
      referenceNumber = generateReferenceNumber();
      attempts++;
      if (attempts > 10) {
        throw new Error('Neuspješno generisanje jedinstvenog referentnog broja');
      }
    }

    // Generiši i hashiraj tajni ključ
    const secretKey = generateSecretKey();
    const secretKeyHash = await hashSecretKey(secretKey);

    // Spremi prijavu
    const report = await reportsRepository.create(input, secretKeyHash, referenceNumber);

    // Stavi email obavijest u red (ne šalje odmah — queue procesira zasebno)
    const recipient = input.reportType === ReportType.SENSITIVE
      ? env.NOTIFICATION_EMAIL_LEGAL
      : env.NOTIFICATION_EMAIL_GENERAL;

    if (recipient) {
      await emailQueue.add({
        recipient,
        reportId: report.id,
        reportType: input.reportType,
        referenceNumber,
      });
    } else {
      logger.warn(
        { reportType: input.reportType },
        'Email obavijest nije poslana — adresa nije konfigurisana',
      );
    }

    logger.info({ reportId: report.id, reportType: input.reportType }, 'Prijava uspješno kreirana');

    return {
      referenceNumber,
      secretKey,
      reportType: input.reportType,
      category: input.category,
      createdAt: report.createdAt,
    };
  },

  /**
   * Dohvata prijavu sa porukama za komunikacijski prozor.
   * Ne uključuje interne bilješke.
   */
  async getReportForReporter(reportId: string) {
    const report = await reportsRepository.findWithMessages(reportId);
    if (!report) return null;

    return {
      referenceNumber: report.referenceNumber,
      reportType: report.reportType,
      category: report.category,
      title: report.title,
      description: report.description,
      status: report.status,
      createdAt: report.createdAt,
      lastActivityAt: report.lastActivityAt,
      messages: report.messages.map((m) => ({
        id: m.id,
        authorType: m.authorType,
        content: m.content,
        createdAt: m.createdAt,
        hasAttachment: !!m.attachment,
      })),
    };
  },
};
