import { prisma } from '../../lib/prisma';
import { reportsRepository } from '../reports/reports.repository';
import { messagesService } from '../messages/messages.service';
import { canViewReport, canAssignReport, canManageUsers, AdminContext } from '../../lib/permissions';
import { ReportType, ReportStatus } from '@prisma/client';
import { NotFoundError, ForbiddenError, AppError } from '../../lib/errors';
import { hashPassword } from '../../lib/crypto';
import { z } from 'zod';

export const adminService = {
  /**
   * Lista prijava za admin panel sa filtriranjem i paginacijom.
   */
  async listReports(admin: AdminContext, params: {
    reportType?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const reportType = params.reportType as ReportType | undefined;

    // SUPER_ADMIN vidi sve
    if (admin.isSuperAdmin) {
      return reportsRepository.listForAdmin({
        reportType, status: params.status, search: params.search,
        adminId: admin.id, isAdmin: true, canAccessSensitive: true,
        page: params.page ?? 1, pageSize: params.pageSize ?? 20,
      });
    }

    // ADMIN bez flaga: samo GENERAL; ADMIN sa flagom: samo SENSITIVE
    const effType = reportType ?? (admin.canAccessSensitive ? 'SENSITIVE' : 'GENERAL');
    if (effType === 'SENSITIVE' && !admin.canAccessSensitive) return { reports: [], total: 0 };
    if (effType === 'GENERAL' && admin.canAccessSensitive) return { reports: [], total: 0 };

    return reportsRepository.listForAdmin({
      reportType: effType as ReportType, status: params.status, search: params.search,
      adminId: admin.id, isAdmin: admin.role === 'ADMIN', canAccessSensitive: admin.canAccessSensitive,
      page: params.page ?? 1, pageSize: params.pageSize ?? 20,
    });
  },

  /**
   * Dohvata detalje prijave za admin panel.
   * Provjerava dozvolu pristupa.
   */
  async getReportDetail(admin: AdminContext, reportId: string) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { attachment: true },
        },
        attachments: { orderBy: { createdAt: 'asc' } },
        internalNotes: {
          orderBy: { createdAt: 'asc' },
          include: { admin: { select: { username: true } } },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: { admin: { select: { username: true } } },
        },
        assignments: {
          include: { admin: { select: { id: true, username: true, role: true } } },
        },
      },
    });

    if (!report) throw new NotFoundError('Prijava nije pronađena');

    // Provjeri dozvolu
    const isAssigned = report.assignments.some((a) => a.adminId === admin.id);
    if (!canViewReport(admin, report.reportType, isAssigned)) {
      throw new ForbiddenError('Nemate dozvolu za pristup ovoj prijavi');
    }

    // Zapiši aktivnost pregleda
    await prisma.activityLog.create({
      data: {
        adminId: admin.id,
        action: 'REPORT_VIEWED',
        reportId: report.id,
        reportType: report.reportType,
        details: `Pregled prijave ${report.referenceNumber}`,
      },
    });

    return report;
  },

  /**
   * Mijenja status prijave.
   */
  async changeStatus(admin: AdminContext, reportId: string, newStatus: ReportStatus) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundError('Prijava nije pronađena');

    const isAssigned = await reportsRepository.isAssignedTo(reportId, admin.id);
    if (!canViewReport(admin, report.reportType, isAssigned)) {
      throw new ForbiddenError('Nemate dozvolu za mijenjanje statusa ove prijave');
    }

    const updated = await reportsRepository.changeStatus(reportId, newStatus, admin.id);

    await prisma.activityLog.create({
      data: {
        adminId: admin.id,
        action: 'STATUS_CHANGED',
        reportId,
        reportType: report.reportType,
        details: `Status promijenjen u ${newStatus}`,
      },
    });

    return updated;
  },

  /**
   * Šalje odgovor prijavitelju.
   */
  async replyToReporter(admin: AdminContext, reportId: string, content: string) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundError('Prijava nije pronađena');

    const isAssigned = await reportsRepository.isAssignedTo(reportId, admin.id);
    if (!canViewReport(admin, report.reportType, isAssigned)) {
      throw new ForbiddenError('Nemate dozvolu za odgovaranje na ovu prijavu');
    }

    const message = await messagesService.sendAuthorizedReply(reportId, admin.id, content);

    await prisma.activityLog.create({
      data: {
        adminId: admin.id,
        action: 'REPLY_SENT',
        reportId,
        reportType: report.reportType,
        details: `Odgovor poslan za prijavu ${report.referenceNumber}`,
      },
    });

    return message;
  },

  /**
   * Dodaje internu bilješku (nije vidljiva prijavitelju).
   */
  async addInternalNote(admin: AdminContext, reportId: string, content: string) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundError('Prijava nije pronađena');

    const isAssigned = await reportsRepository.isAssignedTo(reportId, admin.id);
    if (!canViewReport(admin, report.reportType, isAssigned)) {
      throw new ForbiddenError('Nemate dozvolu za dodavanje bilješke ovoj prijavi');
    }

    const note = await prisma.internalNote.create({
      data: { reportId, adminId: admin.id, content },
    });

    return note;
  },

  /**
   * Dodjeljuje prijavu admin/investigator-u.
   */
  async assignReport(admin: AdminContext, reportId: string, targetAdminId: string) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundError('Prijava nije pronađena');

    if (!canAssignReport(admin, report.reportType)) {
      throw new ForbiddenError('Nemate dozvolu za dodjelu ove prijave');
    }

    // Provjeri da li ciljni admin može primiti ovu prijavu
    const targetAdmin = await prisma.adminUser.findUnique({ where: { id: targetAdminId } });
    if (!targetAdmin || !targetAdmin.isActive) {
      throw new NotFoundError('Ciljni korisnik nije pronađen ili je deaktiviran');
    }

    if (report.reportType === ReportType.SENSITIVE && !targetAdmin.canAccessSensitive) {
      throw new ForbiddenError('Ciljni korisnik nema dozvolu za SENSITIVE prijave');
    }

    await reportsRepository.assign(reportId, targetAdminId, admin.id);

    await prisma.activityLog.create({
      data: {
        adminId: admin.id,
        action: 'REPORT_ASSIGNED',
        reportId,
        reportType: report.reportType,
        details: `Prijava dodijeljena korisniku ${targetAdmin.username}`,
      },
    });
  },

  /**
   * Lista admin korisnike (samo ADMIN uloga).
   */
  async listAdmins(admin: AdminContext) {
    if (!canManageUsers(admin)) throw new ForbiddenError('Samo ADMIN može upravljati korisnicima');

    return prisma.adminUser.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        canAccessSensitive: true,
        isSuperAdmin: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  /**
   * Kreira novog admin korisnika (samo ADMIN uloga).
   */
  async createAdmin(admin: AdminContext, data: { username: string; password: string; role: 'ADMIN' | 'INVESTIGATOR'; canAccessSensitive: boolean; isSuperAdmin: boolean }) {
    if (!canManageUsers(admin)) throw new ForbiddenError('Samo ADMIN može upravljati korisnicima');

    const existing = await prisma.adminUser.findUnique({ where: { username: data.username } });
    if (existing) throw new AppError(409, 'Korisničko ime već postoji');

    const passwordHash = await hashPassword(data.password);

    const newAdmin = await prisma.adminUser.create({
      data: {
        username: data.username,
        passwordHash,
        role: data.role,
        canAccessSensitive: data.canAccessSensitive,
        isSuperAdmin: data.isSuperAdmin,
      },
      select: { id: true, username: true, role: true, canAccessSensitive: true, isSuperAdmin: true, isActive: true, createdAt: true },
    });

    await prisma.activityLog.create({
      data: {
        adminId: admin.id,
        action: 'ADMIN_CREATED',
        details: `Kreiran korisnik ${data.username} (${data.role})`,
      },
    });

    return newAdmin;
  },

  /**
   * Dohvata audit log (historija aktivnosti).
   */
  async getActivityLog(admin: AdminContext, params: { reportId?: string; page?: number; pageSize?: number }) {
    const where: any = {};
    if (params.reportId) where.reportId = params.reportId;

    // INVESTIGATOR vidi samo aktivnosti na dodijeljenim prijavama
    if (admin.role !== 'ADMIN') {
      where.report = {
        assignments: { some: { adminId: admin.id } },
      };
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: ((params.page ?? 1) - 1) * (params.pageSize ?? 50),
        take: params.pageSize ?? 50,
        include: {
          admin: { select: { username: true } },
        },
      }),
      prisma.activityLog.count({ where }),
    ]);

    return { logs, total };
  },
};
