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
  background: string;
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
    console.log("🔌 API: GET /refuge/active");
    try {
      const response = await apiFetch("/refuge/active");
      console.log("📥 API Response:", response);
      const result = response?.data || null;
      console.log("✅ API getActive() result:", result);
      return result;
    } catch (error) {
      console.error("❌ API ERROR in getActive():", error);
      throw error;
    }
  },
};
