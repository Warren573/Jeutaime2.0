import { apiFetch } from "./client";

export interface RefugeSession {
  id: string;
  adopteId: string;
  adoptantId: string | null;
  animalType: string;
  animalCategory: string;
  animalSexe: string;
  animalAgeMonths: number;
  acceptedSexe: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  endsAt: string | null;
  preexistingLinkType: string | null;
  background: string;
  // Metadata optionnelle (retournée par getSession)
  currentDay?: number;
  timeRemaining?: { days: number; hours: number };
  isActive?: boolean;
  isCompleted?: boolean;
}

export interface ProposeRefugeRequest {
  animalType: string;
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

  // Mettre à jour le fond d'ambiance
  async updateBackground(
    sessionId: string,
    background: string
  ): Promise<RefugeSession> {
    const response = await apiFetch(`/refuge/session/${sessionId}/background`, {
      method: "PATCH",
      body: JSON.stringify({ background }),
    });
    return response?.data;
  },

  // Récupérer la session Refuge active de l'utilisateur courant
  async getActive(): Promise<RefugeSession | null> {
    const response = await apiFetch("/refuge/active");
    // Backend retourne: { success: true, data: activeSession | null }
    // Déballage: retourner response.data (qui peut être null ou une RefugeSession)
    return response?.data || null;
  },

  // Récupérer le statut de la session (alias pour getSession)
  async getSessionStatus(sessionId: string): Promise<RefugeSession> {
    return this.getSession(sessionId);
  },

  // Soumettre les 2 actions quotidiennes de l'Adopté
  async submitDailyChoice(
    sessionId: string,
    dayNumber: number,
    action1: string,
    action2: string
  ): Promise<any> {
    const response = await apiFetch("/refuge/daily-choice", {
      method: "POST",
      body: JSON.stringify({ sessionId, dayNumber, action1, action2 }),
    });
    return response?.data;
  },

  // Soumettre les 2 devinettes quotidiennes de l'Adoptant
  async submitGuess(
    sessionId: string,
    dayNumber: number,
    guessedAction1: string,
    guessedAction2: string
  ): Promise<any> {
    const response = await apiFetch("/refuge/guess", {
      method: "POST",
      body: JSON.stringify({ sessionId, dayNumber, guessedAction1, guessedAction2 }),
    });
    return response?.data;
  },
};
