import { apiFetch } from './client';

export type SupportTicketKind = 'BUG' | 'SUPPORT';
export type SupportTicketStatus = 'OPEN' | 'REVIEWING' | 'CLOSED';

export interface SupportTicketDTO {
  id: string;
  kind: SupportTicketKind;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  createdAt: string;
}

export async function createSupportTicket(payload: {
  kind: SupportTicketKind;
  subject: string;
  message: string;
}): Promise<SupportTicketDTO> {
  const res = (await apiFetch('/support/tickets', {
    method: 'POST',
    body: JSON.stringify(payload),
  })) as { data: SupportTicketDTO };
  return res.data;
}

export async function listMySupportTickets(): Promise<SupportTicketDTO[]> {
  const res = (await apiFetch('/support/tickets/mine')) as { data: SupportTicketDTO[] };
  return res.data ?? [];
}
