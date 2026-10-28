import { prisma } from '../../lib/prisma';
import { reportsRepository } from '../reports/reports.repository';
import { emailQueue } from '../email/email.service';
import { env } from '../../config/env';
import { ReportType } from '@prisma/client';
import logger from '../../lib/logger';

export const messagesService = {
  /**
   * Prijavitelj šalje poruku. Takođe stavlja email obavijest u red.
   */
  async sendReporterMessage(reportId: string, content: string) {
    const message = await prisma.message.create({
      data: {
        reportId,
        authorType: 'REPORTER',
        content,
      },
    });

    await reportsRepository.touchActivity(reportId);

    // Obavijesti ovlaštenu osobu o novoj poruci
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (report) {
      const recipient = report.reportType === ReportType.SENSITIVE
        ? env.NOTIFICATION_EMAIL_LEGAL
        : env.NOTIFICATION_EMAIL_GENERAL;

      if (recipient) {
        await emailQueue.add({
          recipient,
          reportId,
          reportType: report.reportType,
          referenceNumber: report.referenceNumber,
          eventType: 'NEW_MESSAGE',
        });
      }
    }

    logger.info({ reportId, messageId: message.id }, 'Reporter message sent');
    return message;
  },

  /**
   * Ovlaštena osoba (admin/investigator) šalje odgovor prijavitelju.
   */
  async sendAuthorizedReply(reportId: string, adminId: string, content: string) {
    const message = await prisma.message.create({
      data: {
        reportId,
        authorType: 'AUTHORIZED_PERSON',
        content,
      },
    });

    await prisma.report.update({
      where: { id: reportId },
      data: {
        lastActivityAt: new Date(),
        lastResponseAt: new Date(),
      },
    });

    logger.info({ reportId, messageId: message.id, adminId }, 'Authorized reply sent');
    return message;
  },

  /**
   * Dohvata sve poruke za prijavu (za admin panel).
   */
  async getMessagesForReport(reportId: string) {
    return prisma.message.findMany({
      where: { reportId },
      orderBy: { createdAt: 'asc' },
      include: { attachment: true },
    });
  },
};
