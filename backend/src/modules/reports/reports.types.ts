import { ReportType, ReportStatus } from '@prisma/client';

/**
 * Kategorije prijava — definirane kao konstante radi lakše izmjene.
 * Za dodavanje/uklanjanje kategorije, mijenja se samo ovaj niz.
 */
export const REPORT_CATEGORIES = [
  'Kršenje etičkog kodeksa',
  'Korupcija i podmićivanje',
  'Sukob interesa',
  'Nepravilnosti u poslovanju',
  'Kršenje internih procedura',
  'Diskriminacija ili uznemiravanje',
  'Sigurnost na radnom mjestu',
  'Ostalo',
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

/**
 * Statusi prijava prikazani prijavitelju (na bosanskom).
 */
export const STATUS_LABELS: Record<ReportStatus, string> = {
  ZAPRIMLJENA: 'Zaprimljena',
  U_PROCJENI: 'U procjeni',
  POTREBNE_INFO: 'Potrebne dodatne informacije',
  U_OBRADI: 'U obradi',
  PROSLIJEDJENA: 'Prosljeđena',
  ZAVRSENA: 'Završena',
  ZATVORENA: 'Zatvorena',
};

/**
 * Podaci potrebni za kreiranje prijave.
 * Prijavitelj ne mora navesti nijedan identifikacijski podatak.
 */
export interface CreateReportInput {
  reportType: ReportType;
  category: string;
  title?: string;
  description: string;
  incidentDate?: string; // ISO datum ili period
  location?: string;
  personsInvolved?: string;
}

/**
 * Rezultat kreiranja prijave — sadrži podatke koje prijavitelj mora sačuvati.
 * Tajni ključ se vraća samo ovdje, jednom, i nikada se više ne prikazuje.
 */
export interface CreatedReport {
  referenceNumber: string;
  secretKey: string;
  reportType: ReportType;
  category: string;
  createdAt: Date;
}
