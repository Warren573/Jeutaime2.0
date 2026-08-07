import { apiFetch } from './client';

export interface BlockedUserDTO {
  userId: string;
  blockedAt: string;
  pseudo: string;
  gender: string | null;
  city: string | null;
  avatarConfig: Record<string, unknown> | null;
}

export async function getBlockedUsers(): Promise<BlockedUserDTO[]> {
  const res = (await apiFetch('/profiles/me/blocks')) as { data: BlockedUserDTO[] };
  return res.data;
}

export async function unblockUser(userId: string): Promise<void> {
  await apiFetch(`/profiles/${userId}/block`, { method: 'DELETE' });
}
