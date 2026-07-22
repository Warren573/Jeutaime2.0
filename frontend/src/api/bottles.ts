import { apiFetch } from "./client";

export interface CreateBottlePayload {
  message: string;
  targetGender: "HOMME" | "FEMME" | "AUTRE";
  ageMin: number;
  ageMax: number;
}

export interface BottleDTO {
  id: string;
  senderId: string;
  message: string;
  senderCity: string;
  targetGender: string;
  ageMin: number;
  ageMax: number;
  status: "FLOATING" | "ACCEPTED" | "EXPIRED";
  acceptedById: string | null;
  acceptedAt: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface InboxBottleDTO {
  id: string;
  message: string;
  senderCity: string;
  targetGender: string;
  status: "FLOATING" | "ACCEPTED" | "EXPIRED";
  createdAt: string;
  expiresAt: string;
}

export interface BottleMessageDTO {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

// ============================================================
// POST /api/bottles/create
// ============================================================
export async function createBottle(
  payload: CreateBottlePayload,
): Promise<BottleDTO> {
  console.log('[API] createBottle START', { payload });
  const startTime = Date.now();
  try {
    const res = (await apiFetch("/bottles/create", {
      method: "POST",
      body: JSON.stringify(payload),
    })) as { data: BottleDTO };
    const duration = Date.now() - startTime;
    console.log('[API] createBottle SUCCESS', { duration, result: res.data });
    return res.data;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[API] createBottle FAILED', { duration, error });
    throw error;
  }
}

// ============================================================
// GET /api/bottles/inbox
// ============================================================
export async function getInbox(): Promise<InboxBottleDTO[]> {
  const res = (await apiFetch("/bottles/inbox")) as {
    data: { bottles: InboxBottleDTO[] };
  };
  return res.data.bottles;
}

// ============================================================
// POST /api/bottles/:id/accept
// ============================================================
export async function acceptBottle(bottleId: string): Promise<BottleDTO> {
  const res = (await apiFetch(`/bottles/${bottleId}/accept`, {
    method: "POST",
    body: JSON.stringify({}),
  })) as { data: BottleDTO };
  return res.data;
}

// ============================================================
// POST /api/bottles/:id/refuse
// ============================================================
export async function refuseBottle(
  bottleId: string,
): Promise<{ success: boolean }> {
  const res = (await apiFetch(`/bottles/${bottleId}/refuse`, {
    method: "POST",
    body: JSON.stringify({}),
  })) as { data: { success: boolean } };
  return res.data;
}

// ============================================================
// GET /api/bottles/:id/messages
// ============================================================
export async function getBottleMessages(
  bottleId: string,
): Promise<BottleMessageDTO[]> {
  const res = (await apiFetch(`/bottles/${bottleId}/messages`)) as {
    data: { messages: BottleMessageDTO[] };
  };
  return res.data.messages;
}

// ============================================================
// POST /api/bottles/:id/messages
// ============================================================
export async function postBottleMessage(
  bottleId: string,
  content: string,
): Promise<BottleMessageDTO> {
  const res = (await apiFetch(`/bottles/${bottleId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  })) as { data: BottleMessageDTO };
  return res.data;
}

// ============================================================
// GET /api/bottles/unread-count
// ============================================================
export async function getUnreadCount(): Promise<number> {
  const res = (await apiFetch("/bottles/unread-count")) as {
    data: { count: number };
  };
  return res.data.count;
}

// ============================================================
// POST /api/bottles/:id/read
// ============================================================
export async function markBottleAsRead(
  bottleId: string,
): Promise<{ id: string; status: string }> {
  const res = (await apiFetch(`/bottles/${bottleId}/read`, {
    method: "POST",
    body: JSON.stringify({}),
  })) as { data: { id: string; status: string } };
  return res.data;
}

// ============================================================
// POST /api/bottles/:id/reveal/request
// ============================================================
export async function requestReveal(
  bottleId: string,
): Promise<{
  id: string;
  status: "PENDING" | "ACCEPTED" | "REFUSED";
}> {
  const res = (await apiFetch(`/bottles/${bottleId}/reveal/request`, {
    method: "POST",
    body: JSON.stringify({}),
  })) as { data: any };
  return res.data;
}

// ============================================================
// POST /api/bottles/:id/reveal/accept
// ============================================================
export async function acceptReveal(
  bottleId: string,
): Promise<{ id: string; status: string; revealedAt: string | null; matchId?: string | null }> {
  const res = (await apiFetch(`/bottles/${bottleId}/reveal/accept`, {
    method: "POST",
    body: JSON.stringify({}),
  })) as { data: any };
  return res.data;
}

// ============================================================
// POST /api/bottles/:id/reveal/refuse
// ============================================================
export async function refuseReveal(
  bottleId: string,
): Promise<{ id: string; status: "REFUSED" }> {
  const res = (await apiFetch(`/bottles/${bottleId}/reveal/refuse`, {
    method: "POST",
    body: JSON.stringify({}),
  })) as { data: any };
  return res.data;
}

// ============================================================
// POST /api/bottles/:id/break
// ============================================================
export async function breakBottle(
  bottleId: string,
): Promise<{ id: string; status: string }> {
  const res = (await apiFetch(`/bottles/${bottleId}/break`, {
    method: "POST",
    body: JSON.stringify({}),
  })) as { data: any };
  return res.data;
}

// ============================================================
// POST /api/bottles/:id/restart
// ============================================================
export async function restartBottle(
  bottleId: string,
): Promise<{ id: string; status: string }> {
  const res = (await apiFetch(`/bottles/${bottleId}/restart`, {
    method: "POST",
    body: JSON.stringify({}),
  })) as { data: any };
  return res.data;
}

// ============================================================
// GET /api/bottles/:id/reveal/status
// ============================================================
export async function getRevealStatus(
  bottleId: string,
): Promise<{
  hasPendingRequest: boolean;
  isRequester: boolean;
  requestedById?: string;
}> {
  const res = (await apiFetch(`/bottles/${bottleId}/reveal/status`)) as {
    data: any;
  };
  return res.data;
}
