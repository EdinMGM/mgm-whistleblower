export type ReportType = 'GENERAL' | 'SENSITIVE';
export type ReportStatus =
  | 'ZAPRIMLJENA' | 'U_PROCJENI' | 'POTREBNE_INFO' | 'U_OBRADI'
  | 'PROSLIJEDJENA' | 'ZAVRSENA' | 'ZATVORENA';

export interface CreateReportInput {
  reportType: ReportType;
  category: string;
  title?: string;
  description: string;
  incidentDate?: string;
  location?: string;
  personsInvolved?: string;
}

export interface CreatedReport {
  referenceNumber: string;
  secretKey: string;
  reportType: ReportType;
  category: string;
  createdAt: string;
}

export interface ReportMessage {
  id: string;
  authorType: 'REPORTER' | 'AUTHORIZED_PERSON';
  content: string;
  createdAt: string;
  hasAttachment: boolean;
}

export interface ReportDetail {
  referenceNumber: string;
  reportType: ReportType;
  category: string;
  title: string | null;
  description: string;
  status: ReportStatus;
  createdAt: string;
  lastActivityAt: string;
  messages: ReportMessage[];
}

export interface AdminInfo {
  id: string;
  username: string;
  role: 'ADMIN' | 'INVESTIGATOR';
  canAccessSensitive: boolean;
  isSuperAdmin: boolean;
}

export const STATUS_LABELS: Record<ReportStatus, string> = {
  ZAPRIMLJENA: 'Zaprimljena',
  U_PROCJENI: 'U procjeni',
  POTREBNE_INFO: 'Potrebne dodatne informacije',
  U_OBRADI: 'U obradi',
  PROSLIJEDJENA: 'Prosljeđena',
  ZAVRSENA: 'Završena',
  ZATVORENA: 'Zatvorena',
};
