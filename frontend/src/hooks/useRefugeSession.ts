import { useState, useEffect, useCallback } from "react";
import { useStore } from "../store/useStore";
import { refugeApi } from "../api/refuge-api";

interface RefugeSessionState {
  sessionId: string | null;
  currentDay: number;
  status: "ACTIVE" | "COMPLETED" | "REVEALED" | "ABANDONED";
  canAttemptToday: boolean;
  todaySubmitted: boolean;
  hearts: ("❤️" | "❌" | "🤍")[];
  companion: {
    animalType: string;
    background: string;
  } | null;
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
    isLoading: true,
    error: null,
  });

  const { currentUser } = useStore();

  // Mapping interne: UI values → enum backend
  const mapActionToBackend = (action: string): string => {
    const mapping: Record<string, string> = {
      feed: "NOURRIR",
      play: "JOUER",
      pet: "CARESSER",
      wash: "LAVER",
    };
    return mapping[action] || action;
  };

  const mapBackgroundToBackend = (background: string): string => {
    const mapping: Record<string, string> = {
      default: "FORET", // Default → FORET
      forêt: "FORET",
      plage: "PLAGE",
      neige: "NEIGE",
      automne: "AUTOMNE",
      montagne: "MONTAGNE",
      nuit_étoilée: "NUIT_ETOILEE",
    };
    return mapping[background] || background;
  };

  // Récupérer le statut de la session via refugeApi
  const fetchSessionStatus = useCallback(async () => {
    if (!sessionId) return;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const data = await refugeApi.getSessionStatus(sessionId);
      setState((prev) => ({
        ...prev,
        sessionId: data.sessionId || data.id,
        currentDay: data.currentDay || 1,
        status: data.status,
        canAttemptToday: data.canAttemptToday ?? true,
        todaySubmitted: data.todaySubmitted ?? false,
        hearts: data.hearts || prev.hearts,
        companion: data.companion || {
          animalType: data.animalType,
          background: data.background,
        },
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
  }, [sessionId]);

  // Charger le statut au montage
  useEffect(() => {
    fetchSessionStatus();

    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchSessionStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchSessionStatus]);

  // Soumettre les actions quotidiennes et les devinettes
  const submitAttempt = useCallback(
    async (actions: string[], guesses: string[]) => {
      if (!sessionId || actions.length < 2 || guesses.length < 2) return false;

      try {
        // Mapper actions UI vers enums backend avant envoi
        const backendAction1 = mapActionToBackend(actions[0]);
        const backendAction2 = mapActionToBackend(actions[1]);
        const backendGuess1 = mapActionToBackend(guesses[0]);
        const backendGuess2 = mapActionToBackend(guesses[1]);

        // Soumettre les actions de l'Adopté
        await refugeApi.submitDailyChoice(
          sessionId,
          state.currentDay,
          backendAction1,
          backendAction2
        );

        // Soumettre les devinettes de l'Adoptant
        await refugeApi.submitGuess(
          sessionId,
          state.currentDay,
          backendGuess1,
          backendGuess2
        );

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
    [sessionId, state.currentDay, fetchSessionStatus]
  );

  // Révéler les profils (endpoint pas encore implémenté côté backend)
  const revealProfiles = useCallback(async () => {
    console.warn(
      "⚠️ revealProfiles() n'a pas d'endpoint backend — non implémenté"
    );
    return null;
  }, []);

  // Changer le fond d'ambiance via refugeApi
  const changeBackground = useCallback(
    async (background: string) => {
      if (!sessionId) return false;

      try {
        // Mapper background vers enum backend
        const backendBackground = mapBackgroundToBackend(background);

        const updatedSession = await refugeApi.updateBackground(
          sessionId,
          backendBackground
        );

        // Mettre à jour l'état local avec la réponse du serveur
        setState((prev) => ({
          ...prev,
          companion: {
            animalType: updatedSession.animalType,
            background: updatedSession.background,
          },
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
    [sessionId]
  );

  return {
    ...state,
    fetchSessionStatus,
    submitAttempt,
    revealProfiles,
    changeBackground,
  };
}
