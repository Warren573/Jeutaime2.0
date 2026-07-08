import { useState, useCallback } from "react";
import type { RefugeAction } from "../components/AnimalIllustration";
import { triggerRefugeLight } from "../utils/refugeHaptics";

const ACTION_DURATION_MS = 1200;

/**
 * Hook pour gérer une action du Refuge.
 * Gère l'état isActing et la durée de l'action.
 */
export function useRefugeAction() {
  const [currentAction, setCurrentAction] = useState<RefugeAction | null>(null);
  const [isActing, setIsActing] = useState(false);

  const triggerAction = useCallback((action: RefugeAction) => {
    triggerRefugeLight();
    setCurrentAction(action);
    setIsActing(true);

    const timeout = setTimeout(() => {
      setIsActing(false);
      setCurrentAction(null);
    }, ACTION_DURATION_MS);

    return () => clearTimeout(timeout);
  }, []);

  return {
    currentAction,
    isActing,
    triggerAction,
  };
}
