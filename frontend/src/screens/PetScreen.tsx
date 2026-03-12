import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { animals, rarityColors, rarityNames, Animal } from '../data/gameData';

export default function PetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pet, adoptPet, feedPet, playWithPet, cleanPet, coins, removeCoins, addPoints } = useStore();
  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const [lastAction, setLastAction] = useState('');

  const handleAdopt = (animal: Animal) => {
    if (!removeCoins(animal.cost)) {
      setLastAction('❌ Pas assez de pièces!');
      return;
    }
    adoptPet(animal.id, animal.name, animal.emoji);
    addPoints(20);
    setShowAdoptModal(false);
    setLastAction(`🎉 ${animal.name} adopté!`);
  };

  const handleFeed = () => {
    feedPet();
    setLastAction('🍖 Miam miam!');
  };

  const handlePlay = () => {
    playWithPet();
    setLastAction('🎾 Super partie de jeu!');
  };

  const handleClean = () => {
    cleanPet();
    setLastAction('🚿 Tout propre!');
  };

  const getStatColor = (value: number) => {
    if (value >= 70) return '#4CAF50';
    if (value >= 40) return '#FF9800';
    return '#F44336';
  };

  const StatBar = ({ label, value, emoji }: { label: string; value: number; emoji: string }) => (
    <View style={styles.statRow}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statBarBg}>
        <View style={[styles.statBarFill, { width: `${value}%`, backgroundColor: getStatColor(value) }]} />
      </View>
      <Text style={styles.statValue}>{value}%</Text>
    </View>
  );

  const sortedAnimals = [...animals].sort((a, b) => a.cost - b.cost);

  if (!pet) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🐾 Refuge d'Animaux</Text>
          <Text style={styles.subtitle}>Adoptez et prenez soin de vos compagnons virtuels</Text>
        </View>
        
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.welcomeBox}>
            <Text style={styles.welcomeEmoji}>🏠</Text>
            <Text style={styles.welcomeTitle}>Bienvenue au refuge!</Text>
            <Text style={styles.welcomeDesc}>
              Ici, tu peux adopter un compagnon virtuel et en prendre soin. Chaque animal a sa personnalité et ses besoins uniques.
            </Text>
          </View>

          <View style={styles.rulesBox}>
            <Text style={styles.rulesTitle}>📋 Règles du jeu</Text>
            <Text style={styles.rule}>• <Text style={styles.ruleBold}>Adopte</Text> un animal avec tes pièces 🪙</Text>
            <Text style={styles.rule}>• <Text style={styles.ruleBold}>Incarne-toi</Text> en ton animal préféré pour changer d'avatar 🐾</Text>
            <Text style={styles.rule}>• <Text style={styles.ruleBold}>Nourris, joue et nettoie</Text> ton animal pour maintenir ses stats 💪</Text>
            <Text style={styles.rule}>• <Text style={styles.ruleBold}>Gagne de l'XP</Text> et fais monter ton animal de niveau ⭐</Text>
            <Text style={styles.ruleWarning}>⚠️ <Text style={styles.ruleBold}>Attention!</Text> Les stats baissent avec le temps - reviens régulièrement 🕐</Text>
            <Text style={styles.rule}>• Tu ne peux avoir qu'<Text style={styles.ruleBold}>une seule incarnation</Text> à la fois 🐾</Text>
          </View>

          <View style={styles.coinsBox}>
            <Text style={styles.coinsText}>💰 {coins} pièces disponibles</Text>
          </View>

          {/* Liste des animaux */}
          <View style={styles.animalsGrid}>
            {sortedAnimals.map(animal => {
              const canAfford = coins >= animal.cost;
              return (
                <TouchableOpacity
                  key={animal.id}
                  style={[
                    styles.animalCard,
                    { borderColor: rarityColors[animal.rarity] },
                    !canAfford && styles.animalCardDisabled
                  ]}
                  onPress={() => handleAdopt(animal)}
                  disabled={!canAfford}
                >
                  <View style={[styles.rarityBadge, { backgroundColor: rarityColors[animal.rarity] }]}>
                    <Text style={styles.rarityText}>{rarityNames[animal.rarity].toUpperCase()}</Text>
                  </View>
                  <Text style={styles.animalEmoji}>{animal.emoji}</Text>
                  <Text style={styles.animalName}>{animal.name}</Text>
                  <Text style={styles.animalPersonality}>{animal.personality}</Text>
                  <Text style={styles.animalFood}>Nourriture préférée: {animal.favoriteEmoji} {animal.favoriteFood}</Text>
                  <View style={styles.costRow}>
                    <Text style={[styles.animalCost, !canAfford && styles.costRed]}>🪙 {animal.cost} coins</Text>
                    {!canAfford && <Text style={styles.missingText}>Il te manque {animal.cost - coins} coins</Text>}
                  </View>
                  <View style={[styles.adoptBtn, !canAfford && styles.adoptBtnDisabled]}>
                    <Text style={styles.adoptBtnText}>{canAfford ? '🏠 Adopter' : 'Coins insuffisants'}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Écran avec animal adopté
  const currentAnimal = animals.find(a => a.id === pet.type);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🐾 {pet.name}</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {lastAction ? (
          <View style={styles.actionBox}>
            <Text style={styles.actionText}>{lastAction}</Text>
          </View>
        ) : null}

        <View style={styles.petDisplay}>
          <Text style={styles.petEmoji}>{pet.emoji}</Text>
          <Text style={styles.petName}>{pet.name}</Text>
          {currentAnimal && (
            <View style={[styles.rarityBadgePet, { backgroundColor: rarityColors[currentAnimal.rarity] }]}>
              <Text style={styles.rarityTextPet}>{rarityNames[currentAnimal.rarity]}</Text>
            </View>
          )}
          {currentAnimal && (
            <Text style={styles.petPersonality}>{currentAnimal.personality}</Text>
          )}
        </View>

        <View style={styles.statsContainer}>
          <StatBar label="Faim" value={pet.hunger} emoji="🍖" />
          <StatBar label="Bonheur" value={pet.happiness} emoji="😄" />
          <StatBar label="Propreté" value={pet.cleanliness} emoji="🚿" />
          <StatBar label="Énergie" value={pet.energy} emoji="⚡" />
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleFeed}>
            <Text style={styles.actionEmoji}>🍖</Text>
            <Text style={styles.actionLabel}>Nourrir</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBtn} onPress={handlePlay}>
            <Text style={styles.actionEmoji}>🎾</Text>
            <Text style={styles.actionLabel}>Jouer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBtn} onPress={handleClean}>
            <Text style={styles.actionEmoji}>🚿</Text>
            <Text style={styles.actionLabel}>Laver</Text>
          </TouchableOpacity>
        </View>

        {/* Bouton incarnation */}
        <TouchableOpacity style={styles.incarnateBtn}>
          <Text style={styles.incarnateEmoji}>✨</Text>
          <Text style={styles.incarnateText}>TU ES INCARNÉ</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E8D5B7' },
  backText: { fontSize: 16, color: '#8B6F47', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#3A2818' },
  subtitle: { fontSize: 14, color: '#8B6F47', marginTop: 4 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  
  // Welcome box
  welcomeBox: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center' },
  welcomeEmoji: { fontSize: 50, marginBottom: 10 },
  welcomeTitle: { fontSize: 20, fontWeight: '700', color: '#3A2818' },
  welcomeDesc: { fontSize: 14, color: '#5D4037', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  
  // Rules box
  rulesBox: { backgroundColor: '#FFFACD', borderRadius: 16, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#DAA520' },
  rulesTitle: { fontSize: 16, fontWeight: '700', color: '#3A2818', marginBottom: 10 },
  rule: { fontSize: 13, color: '#5D4037', marginBottom: 6, lineHeight: 20 },
  ruleBold: { fontWeight: '700' },
  ruleWarning: { fontSize: 13, color: '#E91E63', marginBottom: 6, lineHeight: 20 },
  
  // Coins
  coinsBox: { backgroundColor: '#FFD700', borderRadius: 12, padding: 12, marginBottom: 20, alignItems: 'center' },
  coinsText: { fontSize: 18, fontWeight: '700', color: '#3A2818' },
  
  // Animals grid
  animalsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  animalCard: { 
    width: '48%', 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    padding: 12, 
    marginBottom: 12, 
    alignItems: 'center',
    borderWidth: 3,
  },
  animalCardDisabled: { opacity: 0.7 },
  rarityBadge: { position: 'absolute', top: -1, right: -1, paddingHorizontal: 8, paddingVertical: 3, borderTopRightRadius: 13, borderBottomLeftRadius: 10 },
  rarityText: { fontSize: 8, fontWeight: '700', color: '#FFF' },
  animalEmoji: { fontSize: 50, marginBottom: 8, marginTop: 16 },
  animalName: { fontSize: 18, fontWeight: '700', color: '#3A2818' },
  animalPersonality: { fontSize: 11, color: '#5D4037', textAlign: 'center', marginTop: 4, height: 32 },
  animalFood: { fontSize: 10, color: '#8B6F47', marginTop: 4 },
  costRow: { marginTop: 8, alignItems: 'center' },
  animalCost: { fontSize: 14, fontWeight: '700', color: '#DAA520' },
  costRed: { color: '#E91E63' },
  missingText: { fontSize: 10, color: '#E91E63', marginTop: 2 },
  adoptBtn: { marginTop: 8, backgroundColor: '#4CAF50', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  adoptBtnDisabled: { backgroundColor: '#BDBDBD' },
  adoptBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  
  // Pet display
  petDisplay: { alignItems: 'center', backgroundColor: '#FFF', borderRadius: 24, padding: 30, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  petEmoji: { fontSize: 100 },
  petName: { fontSize: 24, fontWeight: '700', color: '#3A2818', marginTop: 10 },
  rarityBadgePet: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  rarityTextPet: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  petPersonality: { fontSize: 14, color: '#5D4037', marginTop: 8, textAlign: 'center' },
  
  // Action box
  actionBox: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 12, marginBottom: 16 },
  actionText: { fontSize: 16, fontWeight: '600', color: '#2E7D32', textAlign: 'center' },
  
  // Stats
  statsContainer: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 20 },
  statRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statEmoji: { fontSize: 20, width: 30 },
  statLabel: { width: 70, fontSize: 14, color: '#5D4037' },
  statBarBg: { flex: 1, height: 12, backgroundColor: '#E8D5B7', borderRadius: 6, overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: 6 },
  statValue: { width: 45, textAlign: 'right', fontSize: 12, fontWeight: '600', color: '#5D4037' },
  
  // Actions
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  actionBtn: { alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  actionEmoji: { fontSize: 32 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#5D4037', marginTop: 6 },
  
  // Incarnate
  incarnateBtn: { backgroundColor: '#E91E63', borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  incarnateEmoji: { fontSize: 18, marginRight: 8 },
  incarnateText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
