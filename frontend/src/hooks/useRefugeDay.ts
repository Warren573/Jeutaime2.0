import { useEffect, useState } from "react";
import { useStore } from "../store/useStore";

/**
 * Hook pour gérer le jour courant dans une session Refuge.
 * Récupère l'état réel de la session depuis le backend.
 */
export function useRefugeDay() {
  const [currentDay, setCurrentDay] = useState(1);
  const [totalDays] = useState(7);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useStore();

  useEffect(() => {
    // TODO: Récupérer currentDay depuis le statut de la session Refuge
    // Via l'API: GET /api/refuge/sessions/:sessionId/status
    // Stocker sessionId dans le store ou le route params
    setIsLoading(false);
  }, [currentUser]);

  return {
    currentDay,
    totalDays,
    dayDisplay: `Jour ${currentDay} / ${totalDays}`,
    isLoading,
    error,
  };
}
