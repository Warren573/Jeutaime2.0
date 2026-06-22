import { apiFetch } from './client';

export async function sendSmile(toUserId: string): Promise<{ success: boolean }> {
  const res = await apiFetch('/interactions/smile', {
    method: 'POST',
    body: JSON.stringify({ toUserId }),
  });
  return res.data as { success: boolean };
}
