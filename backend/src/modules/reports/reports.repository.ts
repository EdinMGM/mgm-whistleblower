import { Prisma, Report, ReportType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { CreateReportInput } from './reports.types';

/**
 * Računa rokove za prijavu na osnovu datuma kreiranja.
 * firstResponseDeadline = created_at + FIRST_RESPONSE_DAYS
 * statusUpdateDeadline = created_at + STATUS_UPDATE_DAYS
 */
function calculateDeadlines(createdAt: Date) {
  return {
    firstResponseDeadline: new Date(createdAt.getTime() + env.FIRST_RESPONSE_DAYS * 24 * 60 * 60 * 1000),
    statusUpdateDeadline: new Date(createdAt.getTime() + env.STATUS_UPDATE_DAYS * 24 * 60 * 60 * 1000),
  };
}

export const reportsRepository = {
  /**
   * Kreira novu prijavu sa svim povezanim podacima u jednoj transakciji.
   * Tajni ključ se već hashiran prosljeđuje — plaintext se nikada ne pohranjuje.
   */
  async create(
    input: CreateReportInput,
    secretKeyHash: string,
    referenceNumber: string,
  ): Promise<Report> {
    const now = new Date();
    const deadlines = calculateDeadlines(now);

    return prisma.report.create({
      data: {
        referenceNumber,
        secretKeyHash,
        reportType: input.reportType,
        category: input.category,
        title: input.title,
        description: input.description,
        incidentDate: input.incidentDate ? new Date(input.incidentDate) : null,
        location: input.location,
        personsInvolved: input.personsInvolved,
        firstResponseDeadline: deadlines.firstResponseDeadline,
        statusUpdateDeadline: deadlines.statusUpdateDeadline,
        lastActivityAt: now,
      },
    });
  },

  /**
   * Dohvata prijavu po referentnom broju (bez tajnog ključa).
   */
  async findByReferenceNumber(referenceNumber: string): Promise<Report | null> {
    return prisma.report.findUnique({
      where: { referenceNumber },
    });
  },

  async findById(id: string): Promise<Report | null> {
    return prisma.report.findUnique({ where: { id } });
  },

  /**
   * Dohvata prijavu sa porukama za prikaz u komunikacijskom prozoru.
   * Ne uključuje interne bilješke — one su vidljive samo adminima.
   */
  async findWithMessages(id: string) {
    return prisma.report.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            attachment: true,
          },
        },
        attachments: {
          where: { messageId: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  },

  /**
   * Lista prijave za admin panel sa filtriranjem.
   * INVESTIGATOR dobija samo dodijeljene prijave.
   */
  async listForAdmin(params: {
    reportType?: ReportType;
    status?: string;
    search?: string;
    adminId: string;
    isAdmin: boolean;
    canAccessSensitive: boolean;
    page: number;
    pageSize: number;
  }) {
    const where: Prisma.ReportWhereInput = {};

    // Filtriranje po tipu prijave
    if (params.reportType) {
      where.reportType = params.reportType;
    } else {
      // Ako admin nema pristup SENSITIVE prijavama, isključi ih
      if (!params.canAccessSensitive) {
        where.reportType = ReportType.GENERAL;
      }
    }

    // SENSITIVE prijave su vidljive samo sa dozvolom
    if (where.reportType === ReportType.SENSITIVE && !params.canAccessSensitive) {
      return { reports: [], total: 0 };
    }

    // Filtriranje po statusu
    if (params.status) {
      where.status = params.status as Report['status'];
    }

    // Pretraga po referentnom broju ili naslovu
    if (params.search) {
      where.OR = [
        { referenceNumber: { contains: params.search, mode: 'insensitive' } },
        { title: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // INVESTIGATOR vidi samo dodijeljene prijave
    if (!params.isAdmin) {
      where.assignments = {
        some: { adminId: params.adminId },
      };
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: {
          id: true,
          referenceNumber: true,
          reportType: true,
          category: true,
          title: true,
          status: true,
          createdAt: true,
          firstResponseDeadline: true,
          statusUpdateDeadline: true,
          lastActivityAt: true,
          lastResponseAt: true,
        },
      }),
      prisma.report.count({ where }),
    ]);

    return { reports, total };
  },

  /**
   * Ažurira status prijave i zapisuje u status_history.
   */
  async changeStatus(reportId: string, newStatus: Report['status'], adminId: string) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) return null;

    return prisma.$transaction([
      prisma.report.update({
        where: { id: reportId },
        data: {
          status: newStatus,
          lastActivityAt: new Date(),
          lastResponseAt: newStatus === 'ZAVRSENA' || newStatus === 'ZATVORENA' ? new Date() : report.lastResponseAt,
        },
      }),
      prisma.statusHistory.create({
        data: {
          reportId,
          oldStatus: report.status,
          newStatus,
          adminId,
        },
      }),
    ]);
  },

  /**
   * Ažurira vrijeme posljednje aktivnosti (npr. pri slanju poruke).
   */
  async touchActivity(reportId: string): Promise<void> {
    await prisma.report.update({
      where: { id: reportId },
      data: { lastActivityAt: new Date() },
    });
  },

  /**
   * Provjerava da li je prijava dodijeljena određenom adminu.
   */
  async isAssignedTo(reportId: string, adminId: string): Promise<boolean> {
    const assignment = await prisma.reportAssignment.findUnique({
      where: {
        reportId_adminId: { reportId, adminId },
      },
    });
    return assignment !== null;
  },

  /**
   * Dodjeljuje prijavu adminu.
   */
  async assign(reportId: string, adminId: string, assignedById: string): Promise<void> {
    await prisma.reportAssignment.upsert({
      where: { reportId_adminId: { reportId, adminId } },
      create: { reportId, adminId, assignedById },
      update: {},
    });
  },
};
