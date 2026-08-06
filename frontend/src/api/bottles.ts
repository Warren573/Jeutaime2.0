import { apiFetch } from "./client";

export interface CreateBottlePayload {
  message: string;
  targetGender: "HOMME" | "FEMME" | "AUTRE" | "LES_DEUX";
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
  status: "FLOATING" | "ACCEPTED" | "EXPIRED" | "REVEALED" | "BROKEN";
  acceptedById: string | null;
  acceptedAt: string | null;
  matchId?: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface InboxBottleDTO {
  id: string;
  message: string;
  senderCity: string;
  targetGender: string;
  status: "FLOATING" | "ACCEPTED" | "EXPIRED" | "REVEALED" | "BROKEN";
  senderId: string;
  acceptedById: string | null;
  matchId?: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface BottleMessageDTO {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface BottleMessageWithMetadata {
  id: string;
  content: string;
  createdAt: string;
  isMine: boolean;
  source: 'INITIAL_BOTTLE' | 'ANONYMOUS_MESSAGE';
}

export interface GetCurrentBottleResponse {
  bottle: {
    id: string;
    status: 'FLOATING' | 'ACCEPTED' | 'REVEALED' | 'BROKEN' | 'EXPIRED';
  } | null;
  latestLetter: {
    id: string;
    content: string;
    createdAt: string;
    isMine: boolean;
    source: 'INITIAL_BOTTLE' | 'ANONYMOUS_MESSAGE';
  } | null;
  canReply: boolean;
  waitingForReply: boolean;
  canCreateBottle: boolean;
  canBreak: boolean;
  messageCount: number;
}

export async function createBottle(payload: CreateBottlePayload): Promise<BottleDTO> {
  const res = (await apiFetch("/bottles/create", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as { data: BottleDTO };
  return res.data;
}

export interface SentBottleDTO {
  id: string;
  message: string;
  targetGender: string;
  ageMin: number;
  ageMax: number;
  status: "FLOATING" | "ACCEPTED" | "EXPIRED" | "REVEALED" | "BROKEN";
  createdAt: string;
  expiresAt: string;
  recipientCount: number;
}

export async function getSentBottles(): Promise<SentBottleDTO[]> {
  const res = (await apiFetch("/bottles/sent")) as { data: { bottles: SentBottleDTO[] } };
  return res.data.bottles;
}

export async function cancelPendingBottles(): Promise<number> {
  const res = (await apiFetch("/bottles/cancel-pending", {
    method: "POST",
    body: JSON.stringify({}),
  })) as { data: { cancelled: number } };
  return res.data.cancelled;
}

export async function getBottleById(bottleId: string): Promise<InboxBottleDTO> {
  const res = (await apiFetch(`/bottles/${bottleId}`)) as { data: InboxBottleDTO };
  return res.data;
}

export async function getInbox(): Promise<InboxBottleDTO[]> {
  const res = (await apiFetch("/bottles/inbox")) as { data: { bottles: InboxBottleDTO[] } };
  return res.data.bottles;
}

export async function acceptBottle(bottleId: string): Promise<BottleDTO> {
  const res = (await apiFetch(`/bottles/${bottleId}/accept`, {
    method: "POST",
    body: JSON.stringify({}),
  })) as { data: BottleDTO };
  return res.data;
}

export async function refuseBottle(bottleId: string): Promise<{ success: boolean }> {
  const res = (await apiFetch(`/bottles/${bottleId}/refuse`, {
    method: "POST",
    body: JSON.stringify({}),
  })) as { data: { success: boolean } };
  return res.data;
}

export async function getCurrentBottle(): Promise<GetCurrentBottleResponse> {
  const res = (await apiFetch("/bottles/current")) as { data: GetCurrentBottleResponse };
  return res.data;
}

export async function getBottleMessages(bottleId: string): Promise<BottleMessageWithMetadata[]> {
  const res = (await apiFetch(`/bottles/${bottleId}/messages`)) as {
    data: { messages: BottleMessageWithMetadata[] };
  };
  return res.data.messages;
}

export async function postBottleMessage(
  bottleId: string,
  content: string,
  idempotencyKey: string,
): Promise<BottleMessageDTO> {
  const res = (await apiFetch(`/bottles/${bottleId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, idempotencyKey }),
  })) as { data: { message: BottleMessageDTO; idempotentReplay: boolean } };
  return res.data.message;
}

export async function getUnreadCount(): Promise<number> {
  const res = (await apiFetch("/bottles/unread-count")) as { data: { count: number } };
  return res.data.count;
}

export async function markBottleAsRead(bottleId: string): Promise<{ id: string; status: string }> {
  const res = (await apiFetch(`/bottles/${bottleId}/read`, {
    method: "POST",
    body: JSON.stringify({}),
  })) as { data: { id: string; status: string } };
  return res.data;
}

export async function requestReveal(
  bottleId: string,
): Promise<{ id: string; status: "PENDING" | "ACCEPTED" | "REFUSED" }> {
  const res = (await apiFetch(`/bottles/${bottleId}/reveal/request`, {
    method: "POST",
    body: JSON.stringify({}),
  })) as { data: any };
  return res.data;
}

export async function acceptReveal(
  bottleId: string,
): Promise<{ id: string; status: string; revealedAt: string | null; matchId?: string | null }> {
  const res = (await apiFetch(`/bottles/${bottleId}/reveal/accept`, {
    method: "POST",
    body: JSON.stringify({}),
  })) as { data: any };
  return res.data;
}

export async function refuseReveal(bottleId: string): Promise<{ id: string; status: "REFUSED" }> {
  const res = (await apiFetch(`/bottles/${bottleId}/reveal/refuse`, {
    method: "POST",
    body: JSON.stringify({}),
  })) as { data: any };
  return res.data;
}

export async function breakBottle(bottleId: string): Promise<{ id: string; status: string }> {
  const res = (await apiFetch(`/bottles/${bottleId}/break`, {
    method: "POST",
    body: JSON.stringify({}),
  })) as { data: any };
  return res.data;
}

export async function restartBottle(bottleId: string): Promise<{ id: string; status: string }> {
  const res = (await apiFetch(`/bottles/${bottleId}/restart`, {
    method: "POST",
    body: JSON.stringify({}),
  })) as { data: any };
  return res.data;
}

export async function getRevealStatus(
  bottleId: string,
): Promise<{ hasPendingRequest: boolean; isRequester: boolean; requestedById?: string }> {
  const res = (await apiFetch(`/bottles/${bottleId}/reveal/status`)) as { data: any };
  return res.data;
}

export async function reportBottleConversation(
  bottleId: string,
  reason: 'HARASSMENT' | 'SPAM' | 'FAKE' | 'INAPPROPRIATE_CONTENT' | 'MINOR' | 'OTHER',
  details?: string,
): Promise<{ id: string; status: string }> {
  const res = (await apiFetch(`/bottles/${bottleId}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason, details }),
  })) as { data: any };
  return res.data;
}
