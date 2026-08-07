import { apiFetch } from './client';

export type ReportStatus = 'OPEN' | 'REVIEWING' | 'ACTIONED' | 'DISMISSED';
export type ReportReason = 'HARASSMENT' | 'SPAM' | 'FAKE' | 'INAPPROPRIATE_CONTENT' | 'MINOR' | 'OTHER';

export interface UserReportDTO {
  id: string;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export async function getMyReports(): Promise<UserReportDTO[]> {
  const res = (await apiFetch('/reports/mine?page=1&pageSize=50')) as { data: UserReportDTO[] };
  return res.data;
}
