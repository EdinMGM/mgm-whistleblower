import { z } from 'zod';
import { REPORT_CATEGORIES } from './reports.types';

/**
 * Zod šema za kreiranje prijave.
 * Validira sve podatke koji dolaze od prijavitelja.
 */
export const createReportSchema = z.object({
  reportType: z.enum(['GENERAL', 'SENSITIVE'], {
    errorMap: () => ({ message: 'Vrsta prijave je obavezna' }),
  }),
  category: z.enum(REPORT_CATEGORIES as unknown as [string, ...string[]], {
    errorMap: () => ({ message: 'Kategorija je obavezna' }),
  }),
  title: z.string().max(200).optional(),
  description: z.string().min(10, 'Opis mora imati najmanje 10 karaktera').max(10000),
  incidentDate: z.string().optional(),
  location: z.string().max(500).optional(),
  personsInvolved: z.string().max(2000).optional(),
});

export type CreateReportBody = z.infer<typeof createReportSchema>;

/**
 * Šema za pristup postojećoj prijavi.
 * Tajni ključ se šalje u body, nikada u URL.
 */
export const accessReportSchema = z.object({
  referenceNumber: z.string().min(1, 'Referentni broj je obavezan'),
  secretKey: z.string().min(1, 'Pristupni ključ je obavezan'),
});

export type AccessReportBody = z.infer<typeof accessReportSchema>;

/**
 * Šema za slanje poruke od strane prijavitelja.
 */
export const reporterMessageSchema = z.object({
  referenceNumber: z.string().min(1),
  secretKey: z.string().min(1),
  content: z.string().min(1, 'Poruka ne može biti prazna').max(5000),
});

export type ReporterMessageBody = z.infer<typeof reporterMessageSchema>;
