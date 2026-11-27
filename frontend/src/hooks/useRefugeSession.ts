import { useState, useEffect, useCallback, useRef } from "react";
import { AppState } from "react-native";
import { useStore } from "../store/useStore";
import { refugeApi, isAlreadySubmittedError } from "../api/refuge-api";
import { ACTION_TO_BACKEND, type RefugeActionType } from "../data/refugeActions";
import type { RefugeAnimationData } from "../data/refugeAnimation";
import { computeClockOffsetMs } from "../data/refugeClock";
import { refugeEvents } from "../data/refugeEvents";
import type { AttentionData, AttentionKind } from "../data/refugeAttention";
import type { FinalReportData } from "../data/refugeFinalReport";

interface RefugeSessionState {
  sessionId: string | null;
  currentDay: number;
  status: string;
  canAttemptToday: boolean;
  todaySubmitted: boolean;
  sponsorRole: "parrain" | "marraine" | null;
  /** Horodatages serveur de l'animation du compagnon (aucune action secrète). */
  animation: RefugeAnimationData | null;
  /** Décalage horloge serveur − appareil (ms), pour calculer l'animation localement. */
  serverOffsetMs: number;
  adopteSubmittedToday: boolean;
  adoptantSubmittedToday: boolean;
  dayCompleted: boolean;
  canAdvanceDay: boolean;
  finalConsentAvailable: boolean;
  /** Petite attention du jour (identique pour les deux participants) et possibilité d'en envoyer une. */
  attention: AttentionData | null;
  canSendAttention: boolean;
  /** Bilan final des sept jours (règles v2) et heure de fin de l'aventure (le dévoilement n'existe pas avant). */
  finalReport: FinalReportData | null;
  endsAt: string | null;
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
  /** Refus du serveur lors d'une validation : affiché à l'écran, jamais effacé par le rafraîchissement automatique. */
  submitError: string | null;
  /** `isActive` renvoyé par le serveur (faux = fin dépassée) ; null tant qu'inconnu. */
  isActive: boolean | null;
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
    sponsorRole: null,
    animation: null,
    serverOffsetMs: 0,
    adopteSubmittedToday: false,
    adoptantSubmittedToday: false,
    dayCompleted: false,
    canAdvanceDay: false,
    finalConsentAvailable: false,
    attention: null,
    canSendAttention: false,
    finalReport: null,
    endsAt: null,
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
    submitError: null,
    isActive: null,
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
        sponsorRole: data.sponsorRole ?? null,
        animation: data.animation ?? null,
        serverOffsetMs: computeClockOffsetMs(data.serverTime, Date.now()),
        adopteSubmittedToday: data.adopteSubmittedToday ?? false,
        adoptantSubmittedToday: data.adoptantSubmittedToday ?? false,
        dayCompleted: data.dayCompleted ?? false,
        canAdvanceDay: data.canAdvanceDay ?? false,
        finalConsentAvailable: data.finalConsentAvailable ?? false,
        attention: data.attention ?? null,
        canSendAttention: data.canSendAttention ?? false,
        finalReport: data.finalReport ?? null,
        endsAt: data.endsAt ?? null,
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
        isActive: typeof data.isActive === "boolean" ? data.isActive : null,
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

    // Rafraîchir toutes les 30 secondes, uniquement application au premier plan
    // (aucune requête en arrière-plan : ménage le quota de la base).
    let interval: ReturnType<typeof setInterval> | null = setInterval(fetchSessionStatus, 30000);
    const stop = () => { if (interval) { clearInterval(interval); interval = null; } };
    const subscription = AppState.addEventListener("change", (appState) => {
      if (appState === "active") {
        // Retour au premier plan : une seule requête pour retrouver le bon état
        // (résultat reçu pendant l'absence), puis reprise du rythme normal.
        stop();
        void fetchSessionStatus();
        interval = setInterval(fetchSessionStatus, 30000);
      } else {
        stop();
      }
    });
    // Notification du Refuge reçue application ouverte : rafraîchissement immédiat (une seule requête), sans sondage de plus.
    const unsubscribe = refugeEvents.subscribe((eventSessionId) => {
      if (eventSessionId === null || eventSessionId === sessionId) void fetchSessionStatus();
    });
    return () => { stop(); subscription.remove(); unsubscribe(); };
  }, [fetchSessionStatus, sessionId]);

  // Soumettre la tentative quotidienne de l'Adoptant :
  // retrouver les 2 actions du jour de l'Adopté (POST /refuge/guess).
  const submitGuess = useCallback(
    async (guessActions: RefugeActionType[], foodChoice?: string) => {
      if (!sessionId || guessActions.length !== 2) return false;
      if (isSubmittingRef.current) return false;
      isSubmittingRef.current = true;
      setState((prev) => ({ ...prev, submitError: null }));

      try {
        const guessedAction1 = ACTION_TO_BACKEND[guessActions[0]];
        const guessedAction2 = ACTION_TO_BACKEND[guessActions[1]];

        await refugeApi.submitGuess(
          sessionId,
          currentDayRef.current,
          guessedAction1,
          guessedAction2,
          foodChoice
        );

        // Rafraîchir le statut (cœurs, todaySubmitted)
        await fetchSessionStatus();
        return true;
      } catch (err: any) {
        // 409 REFUGE_GUESS_ALREADY_SUBMITTED : la tentative du jour a déjà été
        // enregistrée (double clic, requête simultanée ou réponse réseau
        // perdue) — c'est un succès, l'état serveur fait foi.
        if (isAlreadySubmittedError(err, "guess")) {
          await fetchSessionStatus();
          return true;
        }
        setState((prev) => ({
          ...prev,
          submitError: err?.message || "",
        }));
        return false;
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [sessionId, fetchSessionStatus]
  );

  // Petite attention du parrain / de la marraine : une seule par jour. Un 409 (déjà envoyée, compagnon déjà validé) est
  // un état, pas une erreur : on relit la session et les boutons disparaissent.
  const sendAttention = useCallback(
    async (kind: AttentionKind) => {
      if (!sessionId || isSubmittingRef.current) return false;
      isSubmittingRef.current = true;
      setState((prev) => ({ ...prev, submitError: null, canSendAttention: false }));
      try {
        await refugeApi.sendAttention(sessionId, kind);
        await fetchSessionStatus();
        return true;
      } catch (err: any) {
        await fetchSessionStatus();
        if (err?.status !== 409) setState((prev) => ({ ...prev, submitError: err?.message || "" }));
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
      setState((prev) => ({ ...prev, submitError: null }));

      try {
        const action1 = ACTION_TO_BACKEND[actions[0]];
        const action2 = ACTION_TO_BACKEND[actions[1]];

        await refugeApi.submitDailyChoice(sessionId, currentDayRef.current, action1, action2);

        await fetchSessionStatus();
        return true;
      } catch (err: any) {
        // 409 REFUGE_DAILY_CHOICE_ALREADY_SUBMITTED : choix déjà enregistré —
        // succès idempotent côté UX, l'état serveur fait foi.
        if (isAlreadySubmittedError(err, "dailyChoice")) {
          await fetchSessionStatus();
          return true;
        }
        setState((prev) => ({
          ...prev,
          submitError: err?.message || "",
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

  const clearSubmitError = useCallback(() => {
    setState((prev) => (prev.submitError ? { ...prev, submitError: null } : prev));
  }, []);

  return {
    ...state,
    clearSubmitError,
    fetchSessionStatus,
    submitDailyChoice,
    submitGuess,
    sendAttention,
    submitRevealConsent,
    changeBackground,
  };
}
