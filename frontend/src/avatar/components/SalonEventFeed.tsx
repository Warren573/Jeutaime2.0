/**
 * SalonEventFeed — Fil d'événements sociaux du salon
 * ─────────────────────────────────────────────────────────────────────────────
 * Affiche jusqu'à 3 événements récents (offrandes) sous forme de bandeaux
 * discrets qui glissent depuis la gauche et disparaissent automatiquement.
 *
 * Positionnement :
 *   Overlay absolu, coin inférieur gauche, pointerEvents="none"
 *   → non-interactif, ne gêne pas l'UI du salon.
 *
 * Animation de chaque item (SalonEventFeedItem) :
 *   Entrée  : translateX -120→0 (220ms) + opacity 0→1 (180ms)
 *   Pause   : VISIBLE_MS (2800ms)
 *   Sortie  : translateX 0→-120 (260ms) + opacity 1→0 (220ms)
 *   → onRemove appelé quand la sortie est finie (result.finished)
 *   → synchronisation parfaite entre animation et suppression de la liste
 *
 * Toutes les animations useNativeDriver: true → thread UI non bloqué.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { FeedItem } from '../hooks/useSalonEventFeed';

// ── Constantes ──────────────────────────────────────────────────────────────

const VISIBLE_MS    = 2800;  // Durée d'affichage avant la sortie
const SLIDE_OFFSET  = -120;  // px de décalage à gauche (entrée/sortie)
const ENTER_TX_MS   = 220;
const ENTER_OP_MS   = 180;
const EXIT_TX_MS    = 260;
const EXIT_OP_MS    = 220;

// ── Item individuel ─────────────────────────────────────────────────────────

interface ItemProps {
  item:     FeedItem;
  onRemove: (id: string) => void;
}

function SalonEventFeedItem({ item, onRemove }: ItemProps) {
  const tx      = useRef(new Animated.Value(SLIDE_OFFSET)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // ── Entrée ──────────────────────────────────────────────────────────────
    Animated.parallel([
      Animated.timing(tx,      { toValue: 0, duration: ENTER_TX_MS, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: ENTER_OP_MS, useNativeDriver: true }),
    ]).start();

    // ── Sortie automatique ──────────────────────────────────────────────────
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(tx,      { toValue: SLIDE_OFFSET, duration: EXIT_TX_MS, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0,            duration: EXIT_OP_MS, useNativeDriver: true }),
      ]).start((result) => {
        // result.finished = false si l'animation est interrompue (unmount)
        // → on appelle quand même onRemove pour nettoyer la liste proprement
        onRemove(item.id);
      });
    }, VISIBLE_MS);

    return () => clearTimeout(timer);
  // On ne dépend que de l'id : stable pour toute la durée de vie de l'item
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  return (
    <Animated.View
      style={[styles.item, { opacity, transform: [{ translateX: tx }] }]}
    >
      <Text style={styles.emoji}>{item.emoji}</Text>
      <Text style={styles.text} numberOfLines={1}>{item.text}</Text>
    </Animated.View>
  );
}

// ── Feed ────────────────────────────────────────────────────────────────────

interface Props {
  items:    FeedItem[];
  onRemove: (id: string) => void;
}

export function SalonEventFeed({ items, onRemove }: Props) {
  if (items.length === 0) return null;

  return (
    <View pointerEvents="none" style={styles.container}>
      {items.map((item) => (
        <SalonEventFeedItem key={item.id} item={item} onRemove={onRemove} />
      ))}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom:   14,
    left:     12,
    gap:      6,
    // Largeur max pour ne pas déborder sur les petits écrans
    maxWidth: 260,
    // zIndex inférieur aux modales (1000+), supérieur au contenu (< 100)
    zIndex:   200,
  },
  item: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius:    20,
    backgroundColor: 'rgba(30, 18, 8, 0.62)',
    // Bordure subtile warm
    borderWidth:     1,
    borderColor:     'rgba(212, 168, 122, 0.25)',
  },
  emoji: {
    fontSize:   15,
    lineHeight: 18,
  },
  text: {
    fontSize:   12,
    fontWeight: '500',
    color:      'rgba(255, 245, 230, 0.92)',
    flexShrink: 1,
  },
});
