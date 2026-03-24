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
 * Source de vérité des expirations :
 *   Calculées ici, une seule fois, via deux useState + setTimeout.
 *   Les layers ne gèrent pas leur propre expiration.
 *   Un seul timer par effet → pas de fuite, pas de divergence.
 *
 * Règles de coexistence :
 *   - Une seule transformation active à la fois (prop scalaire)
 *   - mutesMagic=true (statue, frog) → magic + animations offrandes désactivés
 *     Le projectile vole quand même (impact visuel cohérent sur statue/grenouille)
 *   - Magies compatibles entre elles : voir magicRegistry.coexistsWith
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
  avatar:                   AvatarDefinition;
  name:                     string;
  isOnline?:                boolean;
  transformation?:          TransformationType | null;
  /** Timestamp ms epoch. Si dépassé, la transformation est masquée. */
  transformationExpiresAt?: number;
  magic?:                   MagicType | null;
  /** Timestamp ms epoch. Si dépassé, la magie est masquée. */
  magicExpiresAt?:          number;
  size?:                    number;
  availableOffers?:         OfferType[];
  onSendOffer?:             (event: OfferEvent) => void;
}

let _eventSeq = 0;

export function SalonAvatarCard({
  avatar,
  name,
  isOnline              = false,
  transformation        = null,
  transformationExpiresAt,
  magic                 = null,
  magicExpiresAt,
  size                  = 96,
  availableOffers       = V1_OFFERS,
  onSendOffer,
}: Props) {
  const { currentEvent, push, markDone } = useAvatarActionQueue();
  const { phase, config } = useOfferAnimation(currentEvent);

  // ── Source de vérité des expirations ──────────────────────────────────────
  // Un seul timer par effet. Dépendance stricte sur expiresAt → pas de fuite.
  const [isMagicActive, setIsMagicActive] = React.useState(
    () => !magicExpiresAt || Date.now() < magicExpiresAt,
  );
  const [isTransformationActive, setIsTransformationActive] = React.useState(
    () => !transformationExpiresAt || Date.now() < transformationExpiresAt,
  );

  React.useEffect(() => {
    if (!magicExpiresAt) { setIsMagicActive(true); return; }
    const remaining = magicExpiresAt - Date.now();
    if (remaining <= 0) { setIsMagicActive(false); return; }
    setIsMagicActive(true);
    const t = setTimeout(() => setIsMagicActive(false), remaining);
    return () => clearTimeout(t);
  }, [magicExpiresAt]);

  React.useEffect(() => {
    if (!transformationExpiresAt) { setIsTransformationActive(true); return; }
    const remaining = transformationExpiresAt - Date.now();
    if (remaining <= 0) { setIsTransformationActive(false); return; }
    setIsTransformationActive(true);
    const t = setTimeout(() => setIsTransformationActive(false), remaining);
    return () => clearTimeout(t);
  }, [transformationExpiresAt]);

  // ── Coexistence ───────────────────────────────────────────────────────────
  // mutesMagic = true : statue / frog gèlent la magie ET les animations d'offrandes
  const activeTransDef = (transformation && isTransformationActive)
    ? transformationRegistry[transformation]
    : null;
  const mutesMagic = activeTransDef?.mutesMagic ?? false;

  // Magie effective : null si expirée ou si la transformation la coupe
  const effectiveMagic: MagicType | null = (isMagicActive && !mutesMagic) ? magic : null;

  // Transformation effective : null si expirée
  const effectiveTransformation: TransformationType | null =
    isTransformationActive ? transformation : null;

  // ── File d'attente ────────────────────────────────────────────────────────
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

        {/* Magie derrière l'avatar (halo) — zIndex 0 */}
        <AvatarEffectLayer
          magic={effectiveMagic}
          avatarSize={size}
          zLayerFilter="behind"
        />

        {/*
          Animation du corps suspendue si mutesMagic :
          une statue/grenouille ne peut pas boire ni se pencher.
          Le projectile vole quand même (cf. OfferProjectileLayer ci-dessous).
        */}
        <AvatarOfferMotion
          animationKey={phase === 'reaction' && !mutesMagic ? config?.animationKey : null}
        >
          <AvatarRenderer avatar={avatar} size={size} />
        </AvatarOfferMotion>

        {/* Transformation (pirate, ghost, statue, frog) — zIndex 100 */}
        <AvatarTransformationLayer
          transformation={effectiveTransformation}
          avatarSize={size}
        />

        {/* Magie devant l'avatar (rain, ghost magic) — zIndex 100, DOM après transfo */}
        <AvatarEffectLayer
          magic={effectiveMagic}
          avatarSize={size}
          zLayerFilter="front"
        />

        {/* Projectile — zIndex 102, toujours visible (même sur statue) */}
        {config && (
          <OfferProjectileLayer
            visible={phase === 'projectile'}
            emoji={config.emoji}
            trajectory={config.trajectory}
          />
        )}

        {/*
          Réaction — zIndex 110, toujours au-dessus.
          Masquée si mutesMagic : pas d'expression sur une statue ou une grenouille.
        */}
        <OfferReactionLayer
          reaction={phase === 'reaction' && !mutesMagic ? config?.reactionKey : null}
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
