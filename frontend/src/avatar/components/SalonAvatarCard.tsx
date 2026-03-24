/**
 * SalonAvatarCard — Carte avatar salon branchée sur le moteur d'offrandes
 * ─────────────────────────────────────────────────────────────────────────────
 * Flux d'une offrande :
 *  1. handleOffer(type)       → crée un OfferEvent + notifie le parent
 *  2. useOfferAnimation       → phase: idle → projectile → reaction → done
 *  3. OfferProjectileLayer    → anime l'objet selon trajectory
 *  4. AvatarOfferMotion       → anime le corps selon animationKey
 *  5. OfferReactionLayer      → affiche la réaction selon reactionKey
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AvatarDefinition, MagicType, OfferType, TransformationType, OfferEvent } from '../types/avatarTypes';
import { offerRegistry, V1_OFFERS } from '../config/offerRegistry';
import { useAvatarActionQueue } from '../hooks/useAvatarActionQueue';
import { useOfferAnimation } from '../hooks/useOfferAnimation';
import { AvatarRenderer } from './AvatarRenderer';
import { AvatarOfferMotion } from './AvatarOfferMotion';
import { OfferProjectileLayer } from './OfferProjectileLayer';
import { OfferReactionLayer } from './OfferReactionLayer';
import { AvatarTransformationLayer } from './AvatarTransformationLayer';

interface Props {
  avatar:          AvatarDefinition;
  name:            string;
  isOnline?:       boolean;
  transformation?: TransformationType | null;
  magic?:          MagicType | null;
  size?:           number;
  availableOffers?: OfferType[];
  onSendOffer?:    (event: OfferEvent) => void;
}

let _eventSeq = 0;

export function SalonAvatarCard({
  avatar,
  name,
  isOnline    = false,
  transformation = null,
  magic       = null,
  size        = 96,
  availableOffers = V1_OFFERS,
  onSendOffer,
}: Props) {
  const { currentEvent, push, markDone } = useAvatarActionQueue();
  const { phase, config } = useOfferAnimation(currentEvent);

  // Libérer la file quand l'animation est terminée
  React.useEffect(() => {
    if (phase === 'done') markDone();
  }, [phase, markDone]);

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

        <AvatarOfferMotion
          animationKey={phase === 'reaction' ? config?.animationKey : null}
        >
          <AvatarRenderer
            avatar={avatar}
            size={size}
            transformation={transformation}
            magic={magic}
          />
        </AvatarOfferMotion>

        {/* Projectile */}
        {config && (
          <OfferProjectileLayer
            visible={phase === 'projectile'}
            emoji={config.emoji}
            trajectory={config.trajectory}
          />
        )}

        {/* Réaction */}
        <OfferReactionLayer
          reaction={phase === 'reaction' ? config?.reactionKey : null}
          avatarSize={size}
        />

        {/* Transformation overlay */}
        {transformation && (
          <AvatarTransformationLayer transformation={transformation} size={size} />
        )}

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
