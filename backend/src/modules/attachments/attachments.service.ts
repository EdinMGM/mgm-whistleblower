import fs from 'fs';
import path from 'path';
import { prisma } from '../../lib/prisma';
import { env, allowedMimeTypes, maxAttachmentSizeBytes } from '../../config/env';
import { AppError, NotFoundError, ForbiddenError } from '../../lib/errors';
import { v4 as uuidv4 } from 'uuid';
import logger from '../../lib/logger';

// Osiguraj da upload direktorij postoji
const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const attachmentsService = {
  /**
   * Sprema prilog na disk i zapisuje metapodatke u bazu.
   * Originalno ime se čuva u bazi, na disku se koristi UUID.
   * Validira MIME tip i veličinu.
   */
  async saveAttachment(
    reportId: string,
    file: Express.Multer.File,
    uploadedByType: 'REPORTER' | 'ADMIN',
    messageId?: string,
  ) {
    // Validacija veličine
    if (file.size > maxAttachmentSizeBytes) {
      throw new AppError(413, `Datoteka prelja maksimalnu dozvoljenu veličinu od ${env.MAX_ATTACHMENT_SIZE_MB} MB`);
    }

    // Validacija MIME tipa (ne oslanjaj se samo na ekstenziju)
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new AppError(415, `Tip datoteke "${file.mimetype}" nije dozvoljen`);
    }

    const storedFilename = `${uuidv4()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadDir, storedFilename);

    // Premjesti datoteku na trajnu lokaciju (multer već spremio u temp)
    fs.renameSync(file.path, filePath);

    const attachment = await prisma.attachment.create({
      data: {
        reportId,
        originalFilename: file.originalname,
        storedFilename,
        mimeType: file.mimetype,
        fileSize: BigInt(file.size),
        uploadedByType,
        messageId: messageId ?? null,
      },
    });

    logger.info({ attachmentId: attachment.id, reportId, mimeType: file.mimetype }, 'Attachment saved');
    return attachment;
  },

  /**
   * Dohvata putanju priloga za preuzimanje.
   * Provjerava dozvolu — samo ovlašteni admin ili prijavitelj te prijave.
   */
  async getAttachmentPath(attachmentId: string, reportId: string): Promise<{ path: string; originalFilename: string; mimeType: string }> {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment || attachment.reportId !== reportId) {
      throw new NotFoundError('Prilog nije pronađen');
    }

    const filePath = path.join(uploadDir, attachment.storedFilename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Datoteka ne postoji na disku');
    }

    return {
      path: filePath,
      originalFilename: attachment.originalFilename,
      mimeType: attachment.mimeType,
    };
  },

  /**
   * Briše prilog sa diska i iz baze (samo admin).
   */
  async deleteAttachment(attachmentId: string): Promise<void> {
    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) throw new NotFoundError('Prilog nije pronađen');

    const filePath = path.join(uploadDir, attachment.storedFilename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.attachment.delete({ where: { id: attachmentId } });
    logger.info({ attachmentId }, 'Attachment deleted');
  },
};
