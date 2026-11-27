import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ATTENTION_REACTION_MS, attentionKey, claimAttentionReaction, type AttentionData } from '../data/refugeAttention';

const storageKey = (userId: string) => `refuge.attentionSeen.${userId}`;

/**
 * Vrai pendant quelques secondes quand une NOUVELLE petite attention apparaît (envoi par le parrain / la marraine, ou
 * découverte par le compagnon), une seule fois par attention et par appareil. Aucun réseau, un seul minuteur, nettoyé au
 * démontage. N'influence PAS le moteur d'animation : l'écran superpose simplement l'image « content » le temps voulu.
 */
export function useRefugeAttentionReaction(args: {
  sessionId: string | null | undefined;
  attention: AttentionData | null | undefined;
  userId: string | null | undefined;
}): boolean {
  const { sessionId, attention, userId } = args;
  const [active, setActive] = useState(false);
  const seen = useRef<Set<string>>(new Set());
  const loadedFor = useRef<string | null>(null);
  const key = attentionKey(sessionId, attention);

  useEffect(() => {
    if (!key || !userId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    void (async () => {
      if (loadedFor.current !== userId) {
        try {
          const raw = await AsyncStorage.getItem(storageKey(userId));
          const parsed = raw ? (JSON.parse(raw) as unknown) : [];
          seen.current = new Set(Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : []);
        } catch {
          seen.current = new Set();
        }
        loadedFor.current = userId;
      }
      if (cancelled || !claimAttentionReaction(seen.current, key)) return;
      AsyncStorage.setItem(storageKey(userId), JSON.stringify([...seen.current])).catch(() => undefined);
      setActive(true);
      timer = setTimeout(() => setActive(false), ATTENTION_REACTION_MS);
    })();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [key, userId]);

  return active;
}
