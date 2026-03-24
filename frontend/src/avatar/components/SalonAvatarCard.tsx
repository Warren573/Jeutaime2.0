/**
 * SalonAvatarCard — Carte avatar pour les salons (petit format)
 * ─────────────────────────────────────────────────────────────────────────────
 * Affiche l'avatar avec son nom, état actif et boutons d'offrandes.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AvatarDefinition, MagicType, OfferType, ReactionType, TransformationType } from '../types/avatarTypes';
import { actionRegistry } from '../config/actionRegistry';
import { AvatarRenderer } from './AvatarRenderer';
import { ProjectileAnimationLayer } from './ProjectileAnimationLayer';

interface Props {
  avatar:          AvatarDefinition;
  name:            string;
  isOnline?:       boolean;
  transformation?: TransformationType | null;
  magic?:          MagicType | null;
  size?:           number;
  /** Offrandes disponibles à envoyer */
  availableOffers?: OfferType[];
  onSendOffer?:    (type: OfferType) => void;
}

export function SalonAvatarCard({
  avatar,
  name,
  isOnline = false,
  transformation = null,
  magic = null,
  size = 96,
  availableOffers = ['coffee', 'beer', 'rose', 'letter'],
  onSendOffer,
}: Props) {
  const [activeReaction, setActiveReaction] = useState<ReactionType | null>(null);
  const [projectile, setProjectile] = useState<{ visible: boolean; type: OfferType }>({
    visible: false,
    type:    'coffee',
  });

  function handleOffer(type: OfferType) {
    const def = actionRegistry[type];
    if (!def) return;

    // Lance le projectile
    setProjectile({ visible: true, type });
    onSendOffer?.(type);
  }

  function handleProjectileComplete() {
    const def = actionRegistry[projectile.type];
    if (!def) return;

    setProjectile((p) => ({ ...p, visible: false }));
    setActiveReaction(def.reaction);

    setTimeout(() => setActiveReaction(null), def.reactionDurationMs);
  }

  const circleSize = size;

  return (
    <View style={styles.card}>
      {/* Avatar + projectile */}
      <View style={[styles.avatarWrapper, { width: circleSize, height: circleSize }]}>
        <AvatarRenderer
          avatar={avatar}
          size={circleSize}
          transformation={transformation}
          magic={magic}
          reaction={activeReaction}
        />
        <ProjectileAnimationLayer
          visible={projectile.visible}
          actionType={projectile.type}
          onComplete={handleProjectileComplete}
        />

        {/* Indicateur en ligne */}
        {isOnline && (
          <View style={[styles.onlineDot, { bottom: 3, right: 3 }]} />
        )}
      </View>

      {/* Nom */}
      <Text style={styles.name} numberOfLines={1}>{name}</Text>

      {/* Boutons d'offrandes */}
      {availableOffers.length > 0 && (
        <View style={styles.offerRow}>
          {availableOffers.map((type) => (
            <Pressable
              key={type}
              style={({ pressed }) => [styles.offerBtn, pressed && styles.offerBtnPressed]}
              onPress={() => handleOffer(type)}
            >
              <Text style={styles.offerEmoji}>
                {{ coffee: '☕', beer: '🍺', rose: '🌹', letter: '💌' }[type]}
              </Text>
            </Pressable>
          ))}
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
