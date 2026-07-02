import { apiFetch } from "./client";

export interface RefugeSession {
  id: string;
  adopteId: string;
  adoptantId: string | null;
  animalType: string;
  animalCategory: string;
  animalSexe: string;
  acceptedSexe: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  endsAt: string | null;
  preexistingLinkType: string | null;
}

export interface ProposeRefugeRequest {
  animalType: string;
  animalCategory: string;
  animalSexe: string;
  acceptedSexe: string;
}

export interface AdoptRefugeRequest {
  refugeSessionId: string;
}

export const refugeApi = {
  // Proposer un refuge comme Adopté
  async propose(data: ProposeRefugeRequest): Promise<RefugeSession> {
    const response = await apiFetch("/refuge/propose", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response?.data;
  },

  // Récupérer les refuges disponibles
  async getAvailable(gender?: string): Promise<RefugeSession[]> {
    const query = gender ? `?gender=${encodeURIComponent(gender)}` : "";
    const response = await apiFetch(`/refuge/available${query}`);
    return response?.data || [];
  },

  // Adopter un refuge comme Adoptant
  async adopt(refugeSessionId: string): Promise<RefugeSession> {
    const response = await apiFetch("/refuge/adopt", {
      method: "POST",
      body: JSON.stringify({ refugeSessionId }),
    });
    return response?.data;
  },

  // Récupérer une session Refuge spécifique
  async getSession(sessionId: string): Promise<RefugeSession> {
    const response = await apiFetch(`/refuge/session/${sessionId}`);
    return response?.data;
  },
};
