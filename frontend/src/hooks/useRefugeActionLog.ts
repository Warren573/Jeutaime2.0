import { useState, useCallback } from "react";
import type { RefugeAction } from "../components/AnimalIllustration";
import { ACTION_LABELS } from "../data/refugeActions";

interface ActionLogEntry {
  action: RefugeAction;
  timestamp: number;
}

/**
 * Hook pour tracker les actions effectuées pendant une session Refuge.
 * Stockage local à la session (pas de persistence).
 */
export function useRefugeActionLog() {
  const [log, setLog] = useState<ActionLogEntry[]>([]);

  const logAction = useCallback((action: RefugeAction) => {
    setLog(prev => [...prev, { action, timestamp: Date.now() }]);
  }, []);

  const getLastAction = useCallback((): string => {
    if (log.length === 0) return "Aucune action";
    const lastEntry = log[log.length - 1];
    return `Dernière action : ${ACTION_LABELS[lastEntry.action]}`;
  }, [log]);

  const clearLog = useCallback(() => {
    setLog([]);
  }, []);

  return {
    log,
    logAction,
    getLastAction,
    clearLog,
  };
}
