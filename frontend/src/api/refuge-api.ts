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
  hearts?: string[];
  canAttemptToday?: boolean;
  todaySubmitted?: boolean;
  adopteSubmittedToday?: boolean;
  // Actions du jour — visibles uniquement par l'Adopté si adopteSubmittedToday=true
  todayActions?: { action1: string; action2: string } | null;
  // Résultat du jour courant si une tentative a été soumise
  todayResult?: {
    matches: number;
    message: string;
    reward: number;
    emoji: string;
  } | null;
  // Phase finale — état du consentement au dévoilement (vu par MOI)
  reveal?: {
    available: boolean;
    myDecision: "ACCEPT" | "REFUSE" | null;
    otherDecided: boolean;
    revealedAt: string | null;
  };
  // Profil de l'autre — uniquement si status === REVEALED
  otherProfile?: {
    userId: string;
    pseudo: string;
    bio: string | null;
    city: string | null;
  } | null;
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
    // Handle potential double wrapper: backend returns {data: {...}}, apiFetch returns {success: true, data: {...}}
    const data = response?.data ?? response;
    return data;
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

  // Soumettre le choix quotidien de l'Adopté
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

  // Soumettre la tentative quotidienne de l'Adoptant
  // (retrouver les 2 actions du jour de l'Adopté)
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

  // DEV uniquement — sauter au jour N (la route n'existe pas en production)
  async devSetDay(sessionId: string, day: number): Promise<RefugeSession> {
    const response = await apiFetch(`/refuge/dev/${sessionId}/set-day`, {
      method: "POST",
      body: JSON.stringify({ day }),
    });
    return response?.data;
  },

  // Phase finale — soumettre sa décision de dévoilement (ACCEPT | REFUSE)
  async submitRevealConsent(sessionId: string, decision: "ACCEPT" | "REFUSE"): Promise<RefugeSession> {
    const response = await apiFetch(`/refuge/${sessionId}/reveal-consent`, {
      method: "POST",
      body: JSON.stringify({ decision }),
    });
    return response?.data;
  },

  // DEV uniquement — remise à zéro contrôlée d'une session de test
  // mode "reset": repasse en WAITING_FOR_ADOPTANT (choix/tentatives purgés)
  // mode "abandon": clôt définitivement la session de test
  // mode "consent": efface uniquement les décisions de dévoilement (phase finale)
  async devResetSession(sessionId: string, mode: "reset" | "abandon" | "consent" = "reset"): Promise<RefugeSession> {
    const response = await apiFetch(`/refuge/dev/${sessionId}/reset`, {
      method: "POST",
      body: JSON.stringify({ mode }),
    });
    return response?.data;
  },
};
