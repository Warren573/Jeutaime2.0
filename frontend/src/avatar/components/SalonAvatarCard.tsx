/**
 * SalonAvatarCard — Carte avatar salon branchée sur le moteur d'offrandes
 * ─────────────────────────────────────────────────────────────────────────────
 * Ordre de rendu (bas → haut) :
 *   AvatarEffectLayer [behind]      — halo (zIndex 0)
 *   AvatarOfferMotion
 *     AvatarRenderer                — couches avatar pures
 *   AvatarTransformationLayer       — pirate, ghost, statue, frog (zIndex 100)
 *   AvatarEffectLayer [front]       — rain, ghost magic (zIndex 100, DOM après transfo)
 *   OfferProjectileLayer            — (zIndex 102, toujours visible)
 *   OfferReactionLayer              — (zIndex 110, toujours au-dessus)
 *
 * Règles de coexistence :
 *   - Une seule transformation active à la fois (prop scalaire)
 *   - Si transformation.mutesMagic = true → magic supprimé (statue, frog)
 *   - Magies compatibles entre elles : voir magicRegistry.coexistsWith
 *   - Réactions et projectiles toujours visibles (z-index supérieur)
 *
 * Expirations :
 *   - transformationExpiresAt / magicExpiresAt : timestamp ms epoch
 *   - Les layers se désactivent et nettoient leurs animations à l'heure exacte
 *
 * Flux d'une offrande :
 *  1. handleOffer(type)       → push dans la file (useAvatarActionQueue)
 *  2. useOfferAnimation       → phase: idle → projectile → reaction → done
 *  3. OfferProjectileLayer    → anime l'objet selon trajectory
 *  4. AvatarOfferMotion       → anime le corps selon animationKey
 *  5. OfferReactionLayer      → affiche la réaction selon reactionKey
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AvatarDefinition, MagicType, OfferType, TransformationType, OfferEvent } from '../types/avatarTypes';
import { offerRegistry, V1_OFFERS } from '../config/offerRegistry';
import { transformationRegistry } from '../config/transformationRegistry';
import { useAvatarActionQueue } from '../hooks/useAvatarActionQueue';
import { useOfferAnimation } from '../hooks/useOfferAnimation';
import { AvatarRenderer } from './AvatarRenderer';
import { AvatarOfferMotion } from './AvatarOfferMotion';
import { OfferProjectileLayer } from './OfferProjectileLayer';
import { OfferReactionLayer } from './OfferReactionLayer';
import { AvatarTransformationLayer } from './AvatarTransformationLayer';
import { AvatarEffectLayer } from './AvatarEffectLayer';

interface Props {
  avatar:                  AvatarDefinition;
  name:                    string;
  isOnline?:               boolean;
  transformation?:         TransformationType | null;
  transformationExpiresAt?: number;
  magic?:                  MagicType | null;
  magicExpiresAt?:         number;
  size?:                   number;
  availableOffers?:        OfferType[];
  onSendOffer?:            (event: OfferEvent) => void;
}

let _eventSeq = 0;

export function SalonAvatarCard({
  avatar,
  name,
  isOnline             = false,
  transformation       = null,
  transformationExpiresAt,
  magic                = null,
  magicExpiresAt,
  size                 = 96,
  availableOffers      = V1_OFFERS,
  onSendOffer,
}: Props) {
  const { currentEvent, push, markDone } = useAvatarActionQueue();
  const { phase, config } = useOfferAnimation(currentEvent);

  // Libérer la file quand l'animation est terminée
  React.useEffect(() => {
    if (phase === 'done') markDone();
  }, [phase, markDone]);

  // Règle de coexistence : transformation muteAvatar supprime la magie
  const effectiveMagic: MagicType | null = React.useMemo(() => {
    if (!magic || !transformation) return magic;
    const transDef = transformationRegistry[transformation];
    return transDef?.mutesMagic ? null : magic;
  }, [magic, transformation]);

  function handleOffer(type: OfferType) {
    const event: OfferEvent = {
      id:         `offer_${++_eventSeq}`,
      category:   'offer',
      type,
      fromUserId: 'me',
      toUserId:   avatar.id,
      createdAt:  Date.now(),
      status:     'queued',
    };
    push(event);
    onSendOffer?.(event);
  }

  return (
    <View style={styles.card}>
      {/* Avatar + effets */}
      <View style={[styles.avatarWrapper, { width: size, height: size }]}>

        {/* Magie derrière l'avatar (ex : halo) — zIndex 0 */}
        <AvatarEffectLayer
          magic={effectiveMagic}
          avatarSize={size}
          zLayerFilter="behind"
          expiresAt={magicExpiresAt}
        />

        <AvatarOfferMotion
          animationKey={phase === 'reaction' ? config?.animationKey : null}
        >
          <AvatarRenderer avatar={avatar} size={size} />
        </AvatarOfferMotion>

        {/* Transformation (pirate, ghost, statue, frog) — zIndex 100 */}
        <AvatarTransformationLayer
          transformation={transformation}
          avatarSize={size}
          expiresAt={transformationExpiresAt}
        />

        {/* Magie devant l'avatar (rain, ghost magic…) — zIndex 100, DOM après transfo */}
        <AvatarEffectLayer
          magic={effectiveMagic}
          avatarSize={size}
          zLayerFilter="front"
          expiresAt={magicExpiresAt}
        />

        {/* Projectile — zIndex 102, toujours au-dessus des overlays */}
        {config && (
          <OfferProjectileLayer
            visible={phase === 'projectile'}
            emoji={config.emoji}
            trajectory={config.trajectory}
          />
        )}

        {/* Réaction — zIndex 110, toujours au-dessus */}
        <OfferReactionLayer
          reaction={phase === 'reaction' ? config?.reactionKey : null}
          avatarSize={size}
        />

        {/* Point en ligne */}
        {isOnline && <View style={styles.onlineDot} />}
      </View>

      {/* Nom */}
      <Text style={styles.name} numberOfLines={1}>{name}</Text>

      {/* Boutons d'offrandes */}
      {availableOffers.length > 0 && (
        <View style={styles.offerRow}>
          {availableOffers.map((type) => {
            const def = offerRegistry[type];
            if (!def) return null;
            return (
              <Pressable
                key={type}
                style={({ pressed }) => [
                  styles.offerBtn,
                  pressed && styles.offerBtnPressed,
                ]}
                onPress={() => handleOffer(type)}
              >
                <Text style={styles.offerEmoji}>{def.emoji}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap:        6,
  },
  avatarWrapper: {
    position:     'relative',
    borderRadius: 999,
    overflow:     'hidden',
    borderWidth:  2,
    borderColor:  'rgba(212,168,122,0.5)',
  },
  onlineDot: {
    position:        'absolute',
    bottom:          3,
    right:           3,
    width:           11,
    height:          11,
    borderRadius:    6,
    backgroundColor: '#4CAF50',
    borderWidth:     2,
    borderColor:     '#fff',
  },
  name: {
    fontSize:   12,
    fontWeight: '600',
    color:      '#2A1A0E',
    maxWidth:   100,
  },
  offerRow: {
    flexDirection: 'row',
    gap:           4,
  },
  offerBtn: {
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: 'rgba(212,168,122,0.2)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  offerBtnPressed: {
    backgroundColor: 'rgba(212,168,122,0.45)',
    transform:       [{ scale: 0.9 }],
  },
  offerEmoji: {
    fontSize: 14,
  },
});
