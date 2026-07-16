import { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "../store/useStore";
import { refugeApi } from "../api/refuge-api";
import { ACTION_TO_BACKEND, type RefugeActionType } from "../data/refugeActions";

interface RefugeSessionState {
  sessionId: string | null;
  currentDay: number;
  status: string;
  canAttemptToday: boolean;
  todaySubmitted: boolean;
  adopteSubmittedToday: boolean;
  adoptantSubmittedToday: boolean;
  dayCompleted: boolean;
  canAdvanceDay: boolean;
  finalConsentAvailable: boolean;
  hearts: string[];
  companion: {
    animalType: string;
    animalAgeMonths: number;
    background: string;
  } | null;
  todayActions: {
    action1: string;
    action2: string;
  } | null;
  todayResult: {
    matches: number;
    message: string;
    reward: number;
    emoji: string;
  } | null;
  reveal: {
    available: boolean;
    myDecision: "ACCEPT" | "REFUSE" | null;
    otherDecided: boolean;
    revealedAt: string | null;
  } | null;
  otherProfile: {
    userId: string;
    pseudo: string;
    bio: string | null;
    city: string | null;
    age: number | null;
    interests: string[];
    photoUrl: string | null;
  } | null;
  dailyResults: {
    dayNumber: number;
    status: string;
    matchCount: number | null;
    symbol: string;
    adopteCoinsDelta: number;
    adoptantCoinsDelta: number;
    message: string;
  }[];
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
    adopteSubmittedToday: false,
    adoptantSubmittedToday: false,
    dayCompleted: false,
    canAdvanceDay: false,
    finalConsentAvailable: false,
    hearts: ["🤍", "🤍", "🤍", "🤍", "🤍", "🤍", "🤍"],
    companion: null,
    todayActions: null,
    todayResult: null,
    reveal: null,
    otherProfile: null,
    dailyResults: [],
    role: null,
    isLoading: true,
    error: null,
  });

  const { currentUser } = useStore();

  // Garde anti double-clic / requêtes simultanées sur la tentative
  const isSubmittingRef = useRef(false);

  // Jour courant lisible depuis les callbacks sans re-création
  const currentDayRef = useRef(state.currentDay);
  currentDayRef.current = state.currentDay;

  // isLoading n'est vrai QUE pour le tout premier chargement : le polling ne
  // doit jamais repasser l'écran en "Chargement..." — cela démontait tout
  // l'arbre React (dont l'animation de dévoilement, qui rejouait en boucle).
  const hasLoadedOnceRef = useRef(false);

  // Récupérer le statut de la session
  const fetchSessionStatus = useCallback(async () => {
    if (!sessionId) return;

    if (!hasLoadedOnceRef.current) {
      setState((prev) => ({ ...prev, isLoading: true }));
    }

    try {
      const data = await refugeApi.getSession(sessionId);

      // Déterminer le rôle de l'utilisateur courant
      let role: "adopte" | "adoptant" | null = null;
      if (currentUser?.id) {
        if (data.adopteId === currentUser?.id) {
          role = "adopte";
        } else if (data.adoptantId === currentUser?.id) {
          role = "adoptant";
        } else {
          role = null;
        }
      }

      setState((prev) => ({
        ...prev,
        sessionId: data.id,
        currentDay: data.currentDay ?? 0,
        status: data.status,
        canAttemptToday: data.canAttemptToday ?? false,
        todaySubmitted: data.todaySubmitted ?? false,
        adopteSubmittedToday: data.adopteSubmittedToday ?? false,
        adoptantSubmittedToday: data.adoptantSubmittedToday ?? false,
        dayCompleted: data.dayCompleted ?? false,
        canAdvanceDay: data.canAdvanceDay ?? false,
        finalConsentAvailable: data.finalConsentAvailable ?? false,
        hearts: data.hearts || prev.hearts,
        companion: {
          animalType: data.animalType,
          animalAgeMonths: data.animalAgeMonths,
          background: data.background,
        },
        todayActions: data.todayActions ?? null,
        todayResult: data.todayResult ?? null,
        dailyResults: data.dailyResults ?? prev.dailyResults,
        reveal: data.reveal ?? null,
        otherProfile: data.otherProfile ?? null,
        role,
        isLoading: false,
        error: null,
      }));
      hasLoadedOnceRef.current = true;
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || "Failed to fetch session",
      }));
    }
  }, [sessionId, currentUser?.id]);

  // Charger le statut au montage
  useEffect(() => {
    fetchSessionStatus();

    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchSessionStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchSessionStatus]);

  // Soumettre la tentative quotidienne de l'Adoptant :
  // retrouver les 2 actions du jour de l'Adopté (POST /refuge/guess).
  const submitGuess = useCallback(
    async (guessActions: RefugeActionType[]) => {
      if (!sessionId || guessActions.length !== 2) return false;
      if (isSubmittingRef.current) return false;
      isSubmittingRef.current = true;

      try {
        const guessedAction1 = ACTION_TO_BACKEND[guessActions[0]];
        const guessedAction2 = ACTION_TO_BACKEND[guessActions[1]];

        await refugeApi.submitGuess(
          sessionId,
          currentDayRef.current,
          guessedAction1,
          guessedAction2
        );

        // Rafraîchir le statut (cœurs, todaySubmitted)
        await fetchSessionStatus();
        return true;
      } catch (err: any) {
        // 409 : la tentative du jour a déjà été enregistrée (double clic,
        // requête simultanée ou réponse réseau perdue) — c'est un succès.
        if (typeof err?.message === "string" && err.message.includes("déjà été soumise")) {
          await fetchSessionStatus();
          return true;
        }
        setState((prev) => ({
          ...prev,
          error: err?.message || "Erreur lors de la soumission",
        }));
        return false;
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [sessionId, fetchSessionStatus]
  );

  // Soumettre le choix quotidien de l'Adopté
  const submitDailyChoice = useCallback(
    async (actions: RefugeActionType[]) => {
      if (!sessionId || actions.length !== 2) return false;
      if (isSubmittingRef.current) return false;
      isSubmittingRef.current = true;

      try {
        const action1 = ACTION_TO_BACKEND[actions[0]];
        const action2 = ACTION_TO_BACKEND[actions[1]];

        await refugeApi.submitDailyChoice(sessionId, currentDayRef.current, action1, action2);

        await fetchSessionStatus();
        return true;
      } catch (err: any) {
        if (typeof err?.message === "string" && err.message.includes("déjà été soumise")) {
          await fetchSessionStatus();
          return true;
        }
        setState((prev) => ({
          ...prev,
          error: err?.message || "Erreur lors de la soumission",
        }));
        return false;
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [sessionId, fetchSessionStatus]
  );

  // Phase finale — soumettre sa décision de dévoilement.
  // Le serveur est la seule source de vérité : on renvoie son état tel quel.
  const submitRevealConsent = useCallback(
    async (decision: "ACCEPT" | "REFUSE") => {
      if (!sessionId) return false;
      if (isSubmittingRef.current) return false;
      isSubmittingRef.current = true;

      try {
        await refugeApi.submitRevealConsent(sessionId, decision);
        await fetchSessionStatus();
        return true;
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          error: err?.message || "Erreur lors de l'enregistrement de la décision",
        }));
        // Resynchroniser quand même (l'autre a pu terminer la session entre-temps)
        await fetchSessionStatus();
        return false;
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [sessionId, fetchSessionStatus]
  );

  // Changer le fond d'ambiance (Adopté uniquement)
  const changeBackground = useCallback(
    async (background: string) => {
      if (!sessionId) return false;

      try {
        await refugeApi.updateBackground(sessionId, background);

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
    [sessionId]
  );

  return {
    ...state,
    fetchSessionStatus,
    submitDailyChoice,
    submitGuess,
    submitRevealConsent,
    changeBackground,
  };
}
