import { apiFetch } from './client';

export type PrivateSalonInviteDTO = {
  id: string;
  sessionId: string;
  accepted: boolean;
  acceptedAt: string | null;
  createdAt: string;
  session: {
    id: string;
    name: string;
    salonKind: string;
    salonId: string;
    salonName: string;
    startedAt: string;
    expiresAt: string;
    status: string;
  };
};

export async function listPrivateSalonInvites(): Promise<PrivateSalonInviteDTO[]> {
  const res = await apiFetch('/private-salons');
  return res?.data ?? [];
}

export async function acceptPrivateSalonInvite(id: string): Promise<{
  sessionId: string;
  privateName: string;
  salonKind: string;
  salonId: string;
  salonName: string;
  expiresAt: string;
}> {
  const res = await apiFetch(`/private-salons/${id}/accept`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return res.data;
}
