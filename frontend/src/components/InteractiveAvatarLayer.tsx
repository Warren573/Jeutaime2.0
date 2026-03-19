import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { colors, shadows } from '../styles/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OfferingItem {
  /** Emoji de l'offrande (ex: '🌹', '🍾', '☕') */
  emoji: string;
  /** Libellé optionnel (non affiché, pour debug/accessibilité) */
  label?: string;
}

export interface InteractiveAvatarLayerProps {
  /** Données de l'avatar pour générer les initiales et la couleur */
  avatarSource: { name: string; gender?: 'M' | 'F' };
  /** Offrandes visibles autour de l'avatar — max 3 */
  offerings?: OfferingItem[];
  /**
   * Type de pouvoir actif sur cet avatar.
   * Valeurs : 'grenouille' | 'ane' | 'invisible' | 'fantome' | 'pirate' |
   *           'rockstar' | 'statue' | 'poule' | 'cookie' | 'clown' | 'chat_demoniaque'
   */
  powerType?: string;
  /**
   * Type d'effet visuel en overlay.
   * Valeurs : 'aura' | 'etincelles' | 'fumee' | 'halo' | 'ombre' |
   *           'etoiles' | 'confettis' | 'petales' | 'pluie'
   */
  effectType?: string;
  /** Active l'animation d'entrée premium (fade + scale) */
  isActive?: boolean;
  /** Taille du cercle avatar en px (défaut 80) */
  size?: number;
  /** Affiche le point "en ligne" */
  online?: boolean;
  /** Callback sur appui */
  onPress?: () => void;
}

// ─── Mappings ─────────────────────────────────────────────────────────────────

const POWER_MAP: Record<string, { emoji: string; bgColor: string; avatarOpacity: number }> = {
  grenouille:      { emoji: '🐸', bgColor: '#C8E6C9', avatarOpacity: 1 },
  ane:             { emoji: '🫏', bgColor: '#D7CCC8', avatarOpacity: 1 },
  invisible:       { emoji: '🫥', bgColor: '#ECEFF1', avatarOpacity: 0.3 },
  fantome:         { emoji: '👻', bgColor: '#E8EAF6', avatarOpacity: 0.75 },
  pirate:          { emoji: '🏴‍☠️', bgColor: '#37474F', avatarOpacity: 1 },
  rockstar:        { emoji: '🎸', bgColor: '#880E4F', avatarOpacity: 1 },
  statue:          { emoji: '🗿', bgColor: '#8D6E63', avatarOpacity: 1 },
  poule:           { emoji: '🐔', bgColor: '#FFF9C4', avatarOpacity: 1 },
  cookie:          { emoji: '🍪', bgColor: '#EFEBE9', avatarOpacity: 1 },
  clown:           { emoji: '🤡', bgColor: '#FFCDD2', avatarOpacity: 1 },
  chat_demoniaque: { emoji: '😈', bgColor: '#4A148C', avatarOpacity: 1 },
};

const EFFECT_MAP: Record<string, { emoji: string; borderColor: string; glowColor: string }> = {
  aura:       { emoji: '✨', borderColor: '#FFD700', glowColor: 'rgba(255,215,0,0.40)' },
  etincelles: { emoji: '💫', borderColor: '#E91E63', glowColor: 'rgba(233,30,99,0.35)' },
  fumee:      { emoji: '💨', borderColor: '#90A4AE', glowColor: 'rgba(144,164,174,0.38)' },
  halo:       { emoji: '🔆', borderColor: '#FFF59D', glowColor: 'rgba(255,245,157,0.55)' },
  ombre:      { emoji: '🌑', borderColor: '#455A64', glowColor: 'rgba(55,71,79,0.55)' },
  etoiles:    { emoji: '🌟', borderColor: '#FFD700', glowColor: 'rgba(255,215,0,0.38)' },
  confettis:  { emoji: '🎊', borderColor: '#E91E63', glowColor: 'rgba(233,30,99,0.32)' },
  petales:    { emoji: '🌸', borderColor: '#F06292', glowColor: 'rgba(240,98,146,0.32)' },
  pluie:      { emoji: '🌧️', borderColor: '#2196F3', glowColor: 'rgba(33,150,243,0.38)' },
};

// ─── Utils ────────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  '#C2185B', '#7B1FA2', '#303F9F', '#0288D1',
  '#00796B', '#558B2F', '#E64A19', '#5D4037',
  '#455A64', '#AD1457', '#6A1B9A', '#1565C0',
];

function getAvatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Positions des offrandes (3 slots fixes, toujours dans les bounds) ───────
// Slot 0 : bas-gauche  |  Slot 1 : bas-droite  |  Slot 2 : côté droit, mi-hauteur
// Calculées dynamiquement selon size + PAD (voir composant)

// ─── Composant ────────────────────────────────────────────────────────────────

const PAD = 28; // espace autour de l'avatar pour les offrandes
const BADGE_SIZE = 28; // taille du badge d'offrande
const RING_EXTRA = 14; // épaisseur du halo d'effet

export default function InteractiveAvatarLayer({
  avatarSource,
  offerings = [],
  powerType,
  effectType,
  isActive = false,
  size = 80,
  online = true,
  onPress,
}: InteractiveAvatarLayerProps) {
  const power = powerType ? POWER_MAP[powerType] : null;
  const effect = effectType ? EFFECT_MAP[effectType] : null;

  const avatarColor = getAvatarColor(avatarSource.name);
  const initials = getInitials(avatarSource.name);
  const visibleOfferings = offerings.slice(0, 3);

  // Dimensions du conteneur
  const containerW = size + PAD * 2;
  const containerH = size + PAD * 2;

  // Positions des 3 slots d'offrandes, toutes dans le container
  const slotStyles = [
    // Bas-gauche (sous le cercle, côté gauche)
    { position: 'absolute' as const, bottom: 2, left: 2 },
    // Bas-droite
    { position: 'absolute' as const, bottom: 2, right: 2 },
    // Côté droit, à mi-hauteur de l'avatar
    { position: 'absolute' as const, top: PAD + Math.round(size * 0.28), right: 2 },
  ];

  // ── Animations ──────────────────────────────────────────────────────────────

  // 1. Breathing : scale subtil en boucle
  const breathScale = useRef(new Animated.Value(1)).current;

  // 2. Glow pulse : opacité du halo en boucle
  const glowOpacity = useRef(new Animated.Value(0.35)).current;

  // 3. Entrée premium : fade + scale au montage ou quand isActive
  const entryOpacity = useRef(new Animated.Value(isActive ? 0 : 1)).current;
  const entryScale = useRef(new Animated.Value(isActive ? 0.85 : 1)).current;

  // 4. Drop : effet emoji "atterrit" depuis le haut quand effectType change
  const dropY = useRef(new Animated.Value(0)).current;
  const dropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Breathing — toujours actif
    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathScale, {
          toValue: 1.03,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(breathScale, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );
    breathLoop.start();
    return () => breathLoop.stop();
  }, []);

  useEffect(() => {
    // Glow pulse — uniquement quand un effet est actif
    if (!effect) {
      glowOpacity.setValue(0.35);
      return;
    }
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.9,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );
    glowLoop.start();
    return () => glowLoop.stop();
  }, [effectType]);

  useEffect(() => {
    // Entrée premium
    if (isActive) {
      Animated.parallel([
        Animated.timing(entryOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.spring(entryScale, {
          toValue: 1,
          tension: 130,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActive]);

  useEffect(() => {
    // Drop animation : l'emoji effet "atterrit" sur l'avatar depuis le haut
    if (!effectType) return;
    dropY.setValue(-size * 0.55);
    dropOpacity.setValue(1);
    Animated.sequence([
      Animated.spring(dropY, {
        toValue: 0,
        tension: 90,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.delay(480),
      Animated.timing(dropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [effectType]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const ringSize = size + RING_EXTRA * 2;
  const ringOffset = -RING_EXTRA;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.82 : 1}
      onPress={onPress}
      style={{ width: containerW, height: containerH, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        style={{
          width: containerW,
          height: containerH,
          opacity: entryOpacity,
          transform: [{ scale: entryScale }],
        }}
      >
        {/* Glow ring (derrière l'avatar, effet de lumière diffuse) */}
        {effect && (
          <Animated.View
            style={[
              styles.glowRing,
              {
                width: ringSize + 16,
                height: ringSize + 16,
                borderRadius: (ringSize + 16) / 2,
                backgroundColor: effect.glowColor,
                top: PAD - RING_EXTRA - 8,
                left: PAD - RING_EXTRA - 8,
                opacity: glowOpacity,
              },
            ]}
          />
        )}

        {/* Avatar principal avec breathing */}
        <Animated.View
          style={[
            styles.avatarWrapper,
            {
              width: size,
              height: size,
              top: PAD,
              left: PAD,
              transform: [{ scale: breathScale }],
            },
          ]}
        >
          {/* Anneau d'effet (bordure colorée autour de l'avatar) */}
          {effect && (
            <View
              style={[
                styles.effectRing,
                {
                  width: ringSize,
                  height: ringSize,
                  borderRadius: ringSize / 2,
                  borderColor: effect.borderColor,
                  top: ringOffset,
                  left: ringOffset,
                },
              ]}
            />
          )}

          {/* Cercle avatar */}
          <View
            style={[
              styles.avatarCircle,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: power ? power.bgColor : avatarColor,
                opacity: power ? power.avatarOpacity : 1,
              },
            ]}
          >
            {power ? (
              <Text style={{ fontSize: size * 0.46 }}>{power.emoji}</Text>
            ) : (
              <Text style={[styles.initials, { fontSize: size * 0.34 }]}>{initials}</Text>
            )}
          </View>

          {/* Point en ligne */}
          {online && !power && (
            <View
              style={[
                styles.onlineDot,
                {
                  width: size * 0.21,
                  height: size * 0.21,
                  borderRadius: size * 0.105,
                  borderWidth: Math.max(2, size * 0.035),
                  bottom: 1,
                  right: 1,
                },
              ]}
            />
          )}

          {/* Emoji d'effet qui "atterrit" depuis le haut — overlay centré */}
          {effect && (
            <Animated.Text
              style={[
                styles.dropEmoji,
                {
                  fontSize: size * 0.38,
                  transform: [{ translateY: dropY }],
                  opacity: dropOpacity,
                },
              ]}
            >
              {effect.emoji}
            </Animated.Text>
          )}
        </Animated.View>

        {/* Offrandes (max 3, positionnées autour, jamais sur le visage) */}
        {visibleOfferings.map((off, idx) => (
          <View key={idx} style={[styles.offeringBadge, slotStyles[idx]]}>
            <Text style={styles.offeringEmoji}>{off.emoji}</Text>
          </View>
        ))}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Halo diffus derrière l'avatar
  glowRing: {
    position: 'absolute',
  },

  // Conteneur de l'avatar (position absolute dans le wrapper animé)
  avatarWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Anneau de bordure colorée (effet actif)
  effectRing: {
    position: 'absolute',
    borderWidth: 2.5,
    borderStyle: 'solid',
  },

  // Cercle principal de l'avatar
  avatarCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },

  // Initiales texte
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Point vert "en ligne"
  onlineDot: {
    position: 'absolute',
    backgroundColor: colors.success,
    borderColor: '#FFFFFF',
  },

  // Emoji d'effet centré en overlay (animation de drop)
  dropEmoji: {
    position: 'absolute',
    textAlign: 'center',
    alignSelf: 'center',
  },

  // Badge d'offrande
  offeringBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },

  // Emoji dans le badge
  offeringEmoji: {
    fontSize: 16,
    lineHeight: 20,
  },
});
