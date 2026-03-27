/**
 * useSalonEventFeed — File d'événements sociaux du salon
 * ─────────────────────────────────────────────────────────────────────────────
 * Gère une liste glissante de FeedItem (max 3) avec expiration automatique.
 *
 * Utilisation :
 *   const { items, pushEvent, removeItem } = useSalonEventFeed();
 *   // Dans le handler d'offrande :
 *   pushEvent(event, 'Warren', 'Camille');
 *   // Rendu :
 *   <SalonEventFeed items={items} onRemove={removeItem} />
 *
 * Cycle de vie d'un item :
 *   pushEvent() → item ajouté → SalonEventFeed anime l'entrée
 *               → SalonEventFeed anime la sortie → appelle onRemove(id)
 *               → removeItem() retire l'item de la liste
 *
 * Le hook ne gère PAS les timers d'expiration : c'est SalonEventFeedItem
 * qui déclenche sa propre sortie et appelle onRemove quand elle est finie.
 * → Pas de double timer, synchronisation parfaite animation ↔ suppression.
 */

import { useCallback, useState } from 'react';
import { offerRegistry } from '../config/offerRegistry';
import type { OfferEvent, OfferType } from '../types/avatarTypes';

// ── Texte d'offrande en français ───────────────────────────────────────────

const OFFER_PHRASES: Record<OfferType, string> = {
  coffee:       'offre un café',
  tea:          'offre un thé',
  hotChocolate: 'offre un chocolat chaud',
  beer:         'offre une bière',
  cocktail:     'offre un cocktail',
  wine:         'offre un verre de vin',
  champagne:    'offre du champagne',
  rose:         'envoie une rose',
  flower:       'envoie une fleur',
  heart:        'envoie un cœur',
  letter:       'envoie une lettre',
};

// ── Type public ─────────────────────────────────────────────────────────────

export type FeedItem = {
  id:    string;
  text:  string;
  emoji: string;
};

// ── Hook ────────────────────────────────────────────────────────────────────

const MAX_ITEMS = 3;

export function useSalonEventFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);

  const pushEvent = useCallback((
    event:    OfferEvent,
    fromName: string,
    toName:   string,
  ) => {
    const def = offerRegistry[event.type];
    if (!def) return;

    const phrase = OFFER_PHRASES[event.type];
    const item: FeedItem = {
      id:    event.id,
      emoji: def.emoji,
      text:  `${fromName} ${phrase} à ${toName}`,
    };

    setItems(prev => {
      // FIFO : si déjà 3 items, on retire le plus ancien pour faire de la place
      const next = prev.length >= MAX_ITEMS ? prev.slice(1) : prev;
      return [...next, item];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  return { items, pushEvent, removeItem };
}
