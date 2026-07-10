import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useStore } from "../store/useStore";

interface RefugeSessionState {
  sessionId: string | null;
  currentDay: number;
  status: "ACTIVE" | "COMPLETED" | "REVEALED" | "ABANDONED";
  canAttemptToday: boolean;
  todaySubmitted: boolean;
  hearts: ("❤️" | "❌" | "🤍")[];
  companion: {
    animalType: string;
    animalAgeMonths: number;
    background: string;
  } | null;
  role: "adopte" | "adoptant" | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook pour gérer la session Refuge actuelle.
 * Récupère et maintient synchronisé l'état de la session.
 */
export function useRefugeSession(sessionId: string | null) {
  const [state, setState] = useState<RefugeSessionState>({
    sessionId: null,
    currentDay: 1,
    status: "ACTIVE",
    canAttemptToday: true,
    todaySubmitted: false,
    hearts: ["🤍", "🤍", "🤍", "🤍", "🤍", "🤍", "🤍"],
    companion: null,
    role: null,
    isLoading: true,
    error: null,
  });

  const { currentUser } = useStore();

  // Fonction helper pour obtenir le token
  const getAuthHeaders = useCallback(async () => {
    const token = await AsyncStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  // Récupérer le statut de la session
  const fetchSessionStatus = useCallback(async () => {
    if (!sessionId) return;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/refuge/sessions/${sessionId}/status`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch session status");
      }

      const data = await response.json();

      // Déterminer le rôle de l'utilisateur courant
      let role: "adopte" | "adoptant" | null = null;
      if (currentUser?.id) {
        if (data.adopteId === currentUser.id) {
          role = "adopte";
        } else if (data.adoptantId === currentUser.id) {
          role = "adoptant";
        }
      }

      setState((prev) => ({
        ...prev,
        sessionId: data.sessionId,
        currentDay: data.currentDay,
        status: data.status,
        canAttemptToday: data.canAttemptToday,
        todaySubmitted: data.todaySubmitted,
        hearts: data.hearts,
        companion: data.companion || null,
        role,
        isLoading: false,
        error: null,
      }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || "Unknown error",
      }));
    }
  }, [sessionId, getAuthHeaders]);

  // Charger le statut au montage
  useEffect(() => {
    fetchSessionStatus();

    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchSessionStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchSessionStatus]);

  // Soumettre la tentative quotidienne
  const submitAttempt = useCallback(
    async (actions: string[], guesses: string[]) => {
      if (!sessionId) return false;

      try {
        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/refuge/sessions/${sessionId}/attempt`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ actions, guesses }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to submit attempt");
        }

        // Rafraîchir le statut
        await fetchSessionStatus();
        return true;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: "Erreur lors de la soumission",
        }));
        return false;
      }
    },
    [sessionId, getAuthHeaders, fetchSessionStatus]
  );

  // Révéler les profils
  const revealProfiles = useCallback(async () => {
    if (!sessionId) return null;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/refuge/sessions/${sessionId}/reveal`,
        {
          method: "POST",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to reveal profiles");
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: "Erreur lors du dévoilement",
      }));
      return null;
    }
  }, [sessionId, getAuthHeaders]);

  // Changer le fond d'ambiance
  const changeBackground = useCallback(
    async (background: string) => {
      if (!sessionId) return false;

      try {
        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/refuge/companions/${sessionId}/background`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify({ background }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to change background");
        }

        // Mettre à jour l'état local
        setState((prev) => ({
          ...prev,
          companion: prev.companion
            ? { ...prev.companion, background }
            : null,
        }));

        return true;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: "Erreur lors du changement du fond",
        }));
        return false;
      }
    },
    [sessionId, getAuthHeaders]
  );

  return {
    ...state,
    fetchSessionStatus,
    submitAttempt,
    revealProfiles,
    changeBackground,
  };
}
