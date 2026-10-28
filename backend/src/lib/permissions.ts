import { AdminRole, ReportType, ReportStatus } from '@prisma/client';

/**
 * Tip koji predstavlja admin korisnika izvučenog iz JWT tokena.
 * Sadrži samo podatke potrebne za provjeru dozvola.
 */
export interface AdminContext {
  id: string;
  username: string;
  role: AdminRole;
  canAccessSensitive: boolean;
  isSuperAdmin: boolean;
}

/**
 * Provjerava da li admin može vidjeti određenu prijavu.
 *
 * Pravila:
 * 1. SENSITIVE prijave zahtijevaju canAccessSensitive = true (eksplicitna dozvola)
 * 2. ADMIN vidi sve prijave koje mu dozvola dopušta (GENERAL uvijek, SENSITIVE samo sa flagom)
 * 3. INVESTIGATOR vidi samo prijave koje su mu dodijeljene
 *
 * Ključno: osoba na koju se prijava odnosi ne dobija pristup na osnovu titule.
 * canAccessSensitive se dodjeljuje isključivo eksplicitno.
 */
export function canViewReport(
  admin: AdminContext,
  reportType: ReportType,
  isAssigned: boolean,
): boolean {
  // SENSITIVE prijave — zahtijevaju eksplicitnu dozvolu
  if (reportType === ReportType.SENSITIVE && !admin.canAccessSensitive) {
    return false;
  }

  // ADMIN vidi sve prijave koje mu dozvola dopušta
  if (admin.role === AdminRole.ADMIN) {
    return true;
  }

  // INVESTIGATOR vidi samo dodijeljene prijave
  return isAssigned;
}

/**
 * Provjerava da li admin može vidjeti listu prijava određenog tipa.
 */
export function canListReports(admin: AdminContext, reportType: ReportType): boolean {
  if (reportType === ReportType.SENSITIVE) {
    return admin.canAccessSensitive;
  }
  return true;
}

/**
 * Provjerava da li admin može upravljati korisnicima (kreirati, mijenjati uloge).
 * Samo ADMIN uloga može upravljati korisnicima.
 */
export function canManageUsers(admin: AdminContext): boolean {
  return admin.role === AdminRole.ADMIN;
}

/**
 * Provjerava da li admin može mijenjati status prijave.
 */
export function canChangeStatus(
  admin: AdminContext,
  reportType: ReportType,
  isAssigned: boolean,
): boolean {
  return canViewReport(admin, reportType, isAssigned);
}

/**
 * Provjerava da li admin može dodijeliti prijavu drugom korisniku.
 * Samo ADMIN može dodjeljivati prijave.
 */
export function canAssignReport(admin: AdminContext, reportType: ReportType): boolean {
  if (admin.role !== AdminRole.ADMIN) return false;
  if (reportType === ReportType.SENSITIVE) return admin.canAccessSensitive;
  return true;
}
