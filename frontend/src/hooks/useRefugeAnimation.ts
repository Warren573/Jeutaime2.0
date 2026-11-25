import { useEffect, useReducer, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  refugeAnimationFrame,
  refugeNextChangeMs,
  type RefugeAnimationData,
  type RefugeFrame,
} from '../data/refugeAnimation';
import { serverNow } from '../data/refugeClock';
import { claimReplay, createReplayMemory, replayKey } from '../data/refugeReplay';

// Mémoire commune au Refuge et à la case de l'accueil : un même résultat n'est
// rattrapé qu'une fois, au même instant pour les deux écrans (animations synchronisées).
const memory = createReplayMemory();
const loadedUsers = new Set<string>();
const storageKey = (userId: string) => `refuge.reactionsSeen.${userId}`;

async function loadSeen(userId: string): Promise<void> {
  if (loadedUsers.has(userId)) return;
  try {
    const value = await AsyncStorage.getItem(storageKey(userId));
    if (value && !memory.seen.has(userId)) memory.seen.set(userId, value);
  } catch {
    // Stockage indisponible : au pire un rattrapage supplémentaire, jamais d'erreur.
  }
  loadedUsers.add(userId);
}

function persistSeen(userId: string): void {
  const value = memory.seen.get(userId);
  if (value) AsyncStorage.setItem(storageKey(userId), value).catch(() => undefined);
}

/**
 * Image courante du compagnon, calculée LOCALEMENT à partir des horodatages serveur.
 *
 *  - aucun appel réseau à chaque changement d'image ;
 *  - un seul minuteur, programmé au prochain changement (aucun rafraîchissement permanent) ;
 *  - minuteur nettoyé au démontage, suspendu en arrière-plan, recalé au retour au premier plan ;
 *  - ne dépend ni du démarrage de l'application ni de l'écran affiché : même résultat partout.
 */
export function useRefugeAnimation(args: {
  animation: RefugeAnimationData | null | undefined;
  serverOffsetMs: number;
  userId: string | null | undefined;
  sessionId: string | null | undefined;
}): RefugeFrame {
  const { animation, serverOffsetMs, userId, sessionId } = args;
  const [replayAt, setReplayAt] = useState<number | null>(null);
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const resultKey = replayKey(sessionId, animation);
  const animationKey = JSON.stringify(animation ?? null);

  // Rattrapage des réactions manquées : décidé une fois par résultat et par appareil.
  useEffect(() => {
    if (!resultKey || !userId) {
      setReplayAt(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      await loadSeen(userId);
      if (cancelled) return;
      const at = claimReplay(memory, userId, sessionId, animation, serverNow(serverOffsetMs));
      persistSeen(userId);
      setReplayAt(at);
    })();
    return () => { cancelled = true; };
    // Une seule décision par résultat : ni l'objet animation ni le décalage d'horloge ne relancent le calcul.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultKey, userId]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let alive = true;
    const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };
    const schedule = () => {
      clear();
      const delay = refugeNextChangeMs({ now: serverNow(serverOffsetMs), animation, replayAt });
      if (delay == null) return; // figé (sommeil, état neutre) : aucun minuteur
      timer = setTimeout(() => {
        if (!alive) return;
        redraw();
        schedule();
      }, delay);
    };
    schedule();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') { redraw(); schedule(); } else clear();
    });
    return () => { alive = false; clear(); subscription.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationKey, serverOffsetMs, replayAt]);

  return refugeAnimationFrame({ now: serverNow(serverOffsetMs), animation, replayAt });
}
