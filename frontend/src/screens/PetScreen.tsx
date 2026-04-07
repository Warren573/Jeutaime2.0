import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Dimensions,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { PETS_CATALOG, RARITY_COLORS, RARITY_NAMES } from '../engine/PetEngine';
import { PET_PIXEL_ART } from '../data/petPixelArt';

const { width: SW } = Dimensions.get('window');
const CARD_SIZE = (SW - 48) / 2;

// ─── Pixel art renderer ────────────────────────────────────────────────────────

function PixelArt({ petId, size }: { petId: string; size: number }) {
  const art = PET_PIXEL_ART[petId];
  if (!art) return null;
  const { grid, palette } = art;
  const rows = grid.length;
  const cols = grid[0].length;
  const ps = size / Math.max(rows, cols);
  const w = cols * ps;
  const h = rows * ps;

  return (
    <Svg width={w} height={h} style={{ backgroundColor: art.bgColor, borderRadius: 8 }}>
      {grid.flatMap((row, r) =>
        row.map((v, c) => {
          if (v === 0) return null;
          const color = palette[v];
          if (!color) return null;
          return (
            <Rect
              key={`${r}-${c}`}
              x={c * ps}
              y={r * ps}
              width={ps}
              height={ps}
              fill={color}
            />
          );
        })
      )}
    </Svg>
  );
}

// ─── Animated floating pet ────────────────────────────────────────────────────

function FloatingPet({ petId, size }: { petId: string; size: number }) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const art = PET_PIXEL_ART[petId];

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 1200, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0,  duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.glow, {
        width: size + 40, height: size + 40,
        shadowColor: art?.glowColor ?? '#fff',
      }]} />
      <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
        <PixelArt petId={petId} size={size} />
      </Animated.View>
    </View>
  );
}

// ─── Pet mood overlay ─────────────────────────────────────────────────────────

type OverlayMood = 'hungry' | 'unhappy' | 'happy' | 'neutral';

function getPetOverlayMood(stats: {
  hunger: number; happiness: number; cleanliness: number; energy: number;
}): OverlayMood {
  if (stats.hunger < 30) return 'hungry';
  if (stats.happiness < 40 || stats.cleanliness < 40 || stats.energy < 40) return 'unhappy';
  if (stats.hunger > 75 && stats.happiness > 75 && stats.cleanliness > 75 && stats.energy > 75) return 'happy';
  return 'neutral';
}

const OVERLAY_ICONS: Record<Exclude<OverlayMood, 'neutral'>, [string, string]> = {
  hungry:  ['🍽️', '💭'],
  unhappy: ['☁️',  '🌧️'],
  happy:   ['💕',  '💕'],
};

function PetMoodOverlay({ mood }: { mood: OverlayMood }) {
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    a1.setValue(0);
    a2.setValue(0);
    if (mood === 'neutral') return;

    const makeLoop = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 700, useNativeDriver: true }),
          Animated.delay(500),
        ])
      );

    const l1 = makeLoop(a1, 0);
    const l2 = makeLoop(a2, 450);
    l1.start();
    l2.start();
    return () => { l1.stop(); l2.stop(); };
  }, [mood]);

  if (mood === 'neutral') return null;

  const icons = OVERLAY_ICONS[mood];
  const makeStyle = (val: Animated.Value) => ({
    opacity: val,
    transform: [{ translateY: val.interpolate({ inputRange: [0, 1], outputRange: [0, -28] }) }],
  });

  return (
    <View style={styles.overlayWrap} pointerEvents="none">
      <Animated.Text style={[styles.overlayIcon, { left: '18%', top: '20%' }, makeStyle(a1)]}>
        {icons[0]}
      </Animated.Text>
      <Animated.Text style={[styles.overlayIcon, { right: '18%', top: '35%' }, makeStyle(a2)]}>
        {icons[1]}
      </Animated.Text>
    </View>
  );
}

// ─── Stat bar ─────────────────────────────────────────────────────────────────

function StatBar({ label, emoji, value, color }: { label: string; emoji: string; value: number; color: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statBg}>
        <View style={[styles.statFill, { width: `${Math.round(value)}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.statVal, { color }]}>{Math.round(value)}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type ScreenView = 'refuge' | 'pet';

export default function PetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { pet, coins, adoptPet, feedPet, playWithPet, cleanPet, removeCoins, addPoints } = useStore();
  const [view, setView] = useState<ScreenView>(pet ? 'pet' : 'refuge');
  const [feedback, setFeedback] = useState('');
  const feedbackAnim = useRef(new Animated.Value(0)).current;

  const showFeedback = useCallback((msg: string) => {
    setFeedback(msg);
    feedbackAnim.setValue(0);
    Animated.sequence([
      Animated.timing(feedbackAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(feedbackAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleAdopt = (petId: string, name: string, cost: number) => {
    if (!removeCoins(cost)) {
      showFeedback('❌ Pas assez de pièces !');
      return;
    }
    adoptPet(petId, name, '');
    addPoints(20);
    setView('pet');
    showFeedback(`🎉 ${name} adopté !`);
  };

  const doAction = (type: 'feed' | 'play' | 'clean' | 'sleep') => {
    const msgs = {
      feed:  ['🍖 Miam miam !', '😋 Délicieux !'],
      play:  ['🎾 Super partie !', '✨ Youpi !'],
      clean: ['🚿 Tout propre !', '✨ Nickel !'],
      sleep: ['💤 Bonne sieste !', '⚡ Reposé !'],
    };
    const actions = { feed: feedPet, play: playWithPet, clean: cleanPet, sleep: () => null };
    actions[type]();
    const list = msgs[type];
    showFeedback(list[Math.floor(Math.random() * list.length)]);
  };

  const currentPetDef = pet ? PETS_CATALOG.find(p => p.id === pet.petId) : null;

  // If we somehow land on pet view without a pet, go back to refuge
  useEffect(() => {
    if (view === 'pet' && (!pet || !currentPetDef)) {
      setView('refuge');
    }
  }, [view, pet, currentPetDef]);

  // ── REFUGE VIEW ──────────────────────────────────────────────────────────────
  if (view === 'refuge') {
    const sorted = [...PETS_CATALOG].sort((a, b) => a.cost - b.cost);
    return (
      <View style={[styles.refugeContainer, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.refugeHeader}>
          <TouchableOpacity onPress={() => pet ? setView('pet') : router.back()} hitSlop={12}>
            <Text style={styles.refugeBack}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.refugeTitle}>🐾 Refuge</Text>
          <View style={styles.coinsChip}>
            <Text style={styles.coinsChipText}>🌕 {coins}</Text>
          </View>
        </View>

        {/* Coins bar */}
        <View style={styles.coinsBar}>
          <Text style={styles.coinsBarText}>🪙 {coins} pièces disponibles</Text>
        </View>

        {/* Feedback */}
        {feedback ? (
          <Animated.View style={[styles.feedbackBanner, { opacity: feedbackAnim }]}>
            <Text style={styles.feedbackText}>{feedback}</Text>
          </Animated.View>
        ) : null}

        <ScrollView contentContainerStyle={styles.gridContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {sorted.map(animal => {
              const canAfford = coins >= animal.cost;
              const isOwned = pet?.petId === animal.id;
              const rarityColor = RARITY_COLORS[animal.rarity];
              const rarityName = RARITY_NAMES[animal.rarity].toUpperCase();
              return (
                <View key={animal.id}
                  style={[styles.animalCard, isOwned && { borderColor: '#4CAF50', borderWidth: 2.5 }]}>
                  {/* Rarity badge */}
                  <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
                    <Text style={styles.rarityText}>{rarityName}</Text>
                  </View>

                  {/* Pixel art */}
                  <View style={styles.spriteWrap}>
                    <PixelArt petId={animal.id} size={CARD_SIZE - 28} />
                    {isOwned && (
                      <View style={styles.ownedOverlay}>
                        <Text style={{ fontSize: 24 }}>✅</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.cardName}>{animal.name}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>{animal.personality}</Text>
                  <Text style={styles.cardFood}>{animal.favoriteEmoji} {animal.favoriteFood}</Text>

                  {/* Cost */}
                  <Text style={[styles.cardCost, !canAfford && { color: '#E85C8A' }]}>
                    🌕 {animal.cost} coins
                  </Text>
                  {!canAfford && !isOwned && (
                    <Text style={styles.missingText}>
                      Manque {animal.cost - coins} coins
                    </Text>
                  )}

                  {/* Button */}
                  {isOwned ? (
                    <TouchableOpacity style={[styles.adoptBtn, { backgroundColor: '#4CAF50' }]}
                      onPress={() => setView('pet')}>
                      <Text style={styles.adoptBtnText}>🐾 S'occuper</Text>
                    </TouchableOpacity>
                  ) : canAfford ? (
                    <TouchableOpacity style={[styles.adoptBtn, { backgroundColor: '#E85C8A' }]}
                      onPress={() => handleAdopt(animal.id, animal.name, animal.cost)}>
                      <Text style={styles.adoptBtnText}>💝 Adopter</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.adoptBtn, { backgroundColor: '#ccc' }]}>
                      <Text style={[styles.adoptBtnText, { color: '#888' }]}>Coins insuffisants</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── PET DETAIL VIEW ──────────────────────────────────────────────────────────
  if (!pet || !currentPetDef) {
    return null;
  }

  const avg = (pet.stats.hunger + pet.stats.happiness + pet.stats.cleanliness + pet.stats.energy) / 4;
  const mood = avg > 80 ? '😍' : avg > 60 ? '😊' : avg > 40 ? '😐' : '😢';
  const overlayMood = getPetOverlayMood(pet.stats);

  return (
    <View style={[styles.petContainer, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.petHeader}>
        <TouchableOpacity onPress={() => setView('refuge')} style={styles.backBtn}>
          <Text style={styles.backText}>← Refuge</Text>
        </TouchableOpacity>
        <Text style={styles.petHeaderTitle}>{currentPetDef.name}</Text>
        <View style={styles.coinsChipDark}>
          <Text style={styles.coinsChipText}>🌕 {coins}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Feedback */}
        {feedback ? (
          <Animated.View style={[styles.feedbackBannerDark, { opacity: feedbackAnim }]}>
            <Text style={styles.feedbackText}>{feedback}</Text>
          </Animated.View>
        ) : null}

        {/* Floating sprite + mood overlay */}
        <View style={styles.spriteArea}>
          <FloatingPet petId={pet.petId} size={160} />
          <PetMoodOverlay mood={overlayMood} />
        </View>

        {/* Stats */}
        <View style={styles.statsPanel}>
          <View style={styles.petNameRow}>
            <Text style={styles.petNameBig}>{currentPetDef.name}</Text>
            <Text style={{ fontSize: 22 }}>{mood}</Text>
          </View>
          <StatBar label="🍽️ Satiété"  emoji="" value={pet.stats.hunger}      color="#FF9A3C" />
          <StatBar label="💖 Bonheur"  emoji="" value={pet.stats.happiness}   color="#E85C8A" />
          <StatBar label="⚡ Énergie"  emoji="" value={pet.stats.energy}      color="#4A90D9" />
          <StatBar label="✨ Propreté" emoji="" value={pet.stats.cleanliness} color="#9B6DD6" />
        </View>

        {/* Actions */}
        <View style={styles.actionsPanel}>
          <Text style={styles.actionsPanelTitle}>ACTIONS</Text>
          <View style={styles.actionsRow}>
            {[
              { key: 'feed',  icon: '🍽️', label: 'Nourrir', color: '#FF9A3C' },
              { key: 'play',  icon: '🎮', label: 'Jouer',   color: '#4CAF6E' },
              { key: 'clean', icon: '🪮', label: 'Toilette',color: '#4A90D9' },
              { key: 'sleep', icon: '💤', label: 'Dormir',  color: '#9B6DD6' },
            ].map(a => (
              <TouchableOpacity key={a.key}
                style={[styles.actionBtn, { borderColor: a.color + '55' }]}
                onPress={() => doAction(a.key as any)}
                activeOpacity={0.7}>
                <Text style={styles.actionIcon}>{a.icon}</Text>
                <Text style={[styles.actionLabel, { color: a.color }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Rarity info */}
        <View style={[styles.rarityPanel, { borderColor: RARITY_COLORS[currentPetDef.rarity] + '88' }]}>
          <View style={[styles.rarityDot, { backgroundColor: RARITY_COLORS[currentPetDef.rarity] }]} />
          <Text style={styles.rarityPanelText}>
            {RARITY_NAMES[currentPetDef.rarity]} · {currentPetDef.personality}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Refuge
  refugeContainer: { flex: 1, backgroundColor: '#F5F0E8' },
  refugeHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  refugeBack: { fontSize: 15, fontWeight: '600', color: '#E85C8A' },
  refugeTitle: { fontSize: 20, fontWeight: '900', color: '#2D1F0E' },
  coinsChip: {
    backgroundColor: 'rgba(245,200,66,0.15)', borderWidth: 1.5, borderColor: '#F5C842',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  coinsChipText: { fontWeight: '800', fontSize: 14, color: '#2D1F0E' },
  coinsBar: {
    backgroundColor: '#F5C842', margin: 12, borderRadius: 12,
    padding: 12, alignItems: 'center',
    shadowColor: '#F5C842', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
  },
  coinsBarText: { fontSize: 15, fontWeight: '800', color: '#2D1F0E' },
  gridContainer: { paddingHorizontal: 12, paddingBottom: 100 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  animalCard: {
    width: CARD_SIZE, backgroundColor: '#fff', borderRadius: 18,
    overflow: 'hidden', padding: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
    borderWidth: 2, borderColor: 'transparent',
  },
  rarityBadge: {
    position: 'absolute', top: 0, left: '50%', transform: [{ translateX: -(CARD_SIZE * 0.3) }],
    paddingHorizontal: 10, paddingVertical: 3, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, zIndex: 1,
  },
  rarityText: { fontSize: 8, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  spriteWrap: {
    width: '100%', aspectRatio: 1, backgroundColor: '#0a0a0a',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 0,
  },
  ownedOverlay: {
    position: 'absolute', inset: 0, backgroundColor: 'rgba(76,175,110,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardName: { fontSize: 15, fontWeight: '900', color: '#2D1F0E', marginHorizontal: 10, marginTop: 10 },
  cardDesc: { fontSize: 10, color: '#8A7A6A', marginHorizontal: 10, marginTop: 2, lineHeight: 14 },
  cardFood: { fontSize: 10, color: '#8A7A6A', marginHorizontal: 10, marginTop: 4 },
  cardCost: { fontSize: 14, fontWeight: '900', color: '#D4A017', marginHorizontal: 10, marginTop: 6 },
  missingText: { fontSize: 10, color: '#E85C8A', marginHorizontal: 10 },
  adoptBtn: {
    margin: 10, marginTop: 8, borderRadius: 10, padding: 9,
    alignItems: 'center',
  },
  adoptBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  feedbackBanner: {
    backgroundColor: '#E8F5E9', marginHorizontal: 12, borderRadius: 10, padding: 10,
    alignItems: 'center', marginBottom: 4,
  },
  feedbackText: { fontSize: 14, fontWeight: '700', color: '#2E7D32' },

  // Pet detail
  petContainer: { flex: 1, backgroundColor: '#0A0A0A' },
  petHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#222',
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 14, color: '#888', fontWeight: '700' },
  petHeaderTitle: { fontSize: 18, fontWeight: '900', color: '#fff', flex: 1, textAlign: 'center' },
  coinsChipDark: {
    backgroundColor: 'rgba(245,200,66,0.2)', borderWidth: 1, borderColor: '#F5C842',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  feedbackBannerDark: {
    backgroundColor: '#1a2a1a', marginHorizontal: 16, borderRadius: 10, padding: 10,
    alignItems: 'center', marginTop: 8,
  },
  spriteArea: {
    height: 220, alignItems: 'center', justifyContent: 'center', marginVertical: 16,
  },
  glow: {
    position: 'absolute', borderRadius: 999,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 30, elevation: 0,
  },
  overlayWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  overlayIcon: { position: 'absolute', fontSize: 22 },
  statsPanel: {
    backgroundColor: '#161616', marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  petNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  petNameBig: { fontSize: 20, fontWeight: '900', color: '#fff' },
  statRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statEmoji: { width: 0 },
  statLabel: { fontSize: 12, color: '#888', width: 80 },
  statBg: { flex: 1, height: 7, backgroundColor: '#2a2a2a', borderRadius: 4, overflow: 'hidden' },
  statFill: { height: '100%', borderRadius: 4 },
  statVal: { fontSize: 12, fontWeight: '700', width: 30, textAlign: 'right' },
  actionsPanel: {
    backgroundColor: '#111', marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 12,
  },
  actionsPanelTitle: {
    fontSize: 11, fontWeight: '800', color: '#555', letterSpacing: 1.5, marginBottom: 12,
  },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, backgroundColor: '#1a1a1a', borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', borderWidth: 1.5,
  },
  actionIcon: { fontSize: 22 },
  actionLabel: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  rarityPanel: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, borderRadius: 12, padding: 12, borderWidth: 1,
    backgroundColor: '#111',
  },
  rarityDot: { width: 10, height: 10, borderRadius: 5 },
  rarityPanelText: { fontSize: 12, color: '#888', flex: 1 },
});
