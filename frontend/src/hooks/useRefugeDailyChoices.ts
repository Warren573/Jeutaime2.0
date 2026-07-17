import { useState, useCallback } from "react";
import type { RefugeActionType } from "../data/refugeActions";

interface DailyState {
  selectedMyActions: RefugeActionType[];
  selectedGuessActions: RefugeActionType[];
  isDaySubmitted: boolean;
}

const INITIAL_STATE: DailyState = {
  selectedMyActions: [],
  selectedGuessActions: [],
  isDaySubmitted: false,
};

/**
 * Hook pour gérer les choix quotidiens du Refuge.
 * Chaque jour: 2 actions pour soi + 2 pour deviner l'autre.
 */
export function useRefugeDailyChoices() {
  const [state, setState] = useState<DailyState>(INITIAL_STATE);

  const toggleMyAction = useCallback((action: RefugeActionType) => {
    setState(prev => {
      const newActions = prev.selectedMyActions.includes(action)
        ? prev.selectedMyActions.filter(a => a !== action)
        : prev.selectedMyActions.length < 2
          ? [...prev.selectedMyActions, action]
          : prev.selectedMyActions;

      return { ...prev, selectedMyActions: newActions };
    });
  }, []);

  const toggleGuessAction = useCallback((action: RefugeActionType) => {
    setState(prev => {
      const newActions = prev.selectedGuessActions.includes(action)
        ? prev.selectedGuessActions.filter(a => a !== action)
        : prev.selectedGuessActions.length < 2
          ? [...prev.selectedGuessActions, action]
          : prev.selectedGuessActions;

      return { ...prev, selectedGuessActions: newActions };
    });
  }, []);

  const submitDay = useCallback(() => {
    if (state.selectedMyActions.length === 2 && state.selectedGuessActions.length === 2) {
      setState(prev => ({ ...prev, isDaySubmitted: true }));
      return true;
    }
    return false;
  }, [state]);

  const resetDay = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const canSubmit = state.selectedMyActions.length === 2 && state.selectedGuessActions.length === 2;

  return {
    selectedMyActions: state.selectedMyActions,
    selectedGuessActions: state.selectedGuessActions,
    isDaySubmitted: state.isDaySubmitted,
    toggleMyAction,
    toggleGuessAction,
    submitDay,
    resetDay,
    canSubmit,
  };
}
