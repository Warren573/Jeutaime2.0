import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { animals } from '../data/gameData';

export default function PetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pet, adoptPet, feedPet, playWithPet, cleanPet, coins, removeCoins } = useStore();
  const [showAdoptModal, setShowAdoptModal] = useState(false);

  // Diminution des stats avec le temps
  useEffect(() => {
    if (!pet) return;
    const interval = setInterval(() => {
      // Les stats diminuent légèrement toutes les minutes
    }, 60000);
    return () => clearInterval(interval);
  }, [pet]);

  const handleAdopt = (animal: typeof animals[0]) => {
    if (!removeCoins(animal.cost)) {
      alert('Pas assez de pièces!');
      return;
    }
    adoptPet(animal.id, animal.name, animal.emoji);
    setShowAdoptModal(false);
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

  if (!pet) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🐾 Animal Virtuel</Text>
        </View>
        
        <View style={styles.noPetContainer}>
          <Text style={styles.noPetEmoji}>🐣</Text>
          <Text style={styles.noPetTitle}>Adoptez un compagnon!</Text>
          <Text style={styles.noPetSubtitle}>Prenez soin de lui et regardez-le évoluer</Text>
          
          <TouchableOpacity style={styles.adoptBtn} onPress={() => setShowAdoptModal(true)}>
            <Text style={styles.adoptBtnText}>Adopter un animal</Text>
          </TouchableOpacity>
        </View>

        {/* Modal adoption */}
        <Modal visible={showAdoptModal} transparent animationType="slide">
          <View style={styles.modalBg}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🐾 Choisir un animal</Text>
                <TouchableOpacity onPress={() => setShowAdoptModal(false)}>
                  <Text style={styles.closeX}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.coinsAvailable}>💰 {coins} pièces disponibles</Text>
              
              <ScrollView style={styles.animalsList}>
                {animals.map(animal => (
                  <TouchableOpacity
                    key={animal.id}
                    style={[styles.animalCard, coins < animal.cost && styles.animalCardDisabled]}
                    onPress={() => handleAdopt(animal)}
                    disabled={coins < animal.cost}
                  >
                    <Text style={styles.animalEmoji}>{animal.emoji}</Text>
                    <View style={styles.animalInfo}>
                      <Text style={styles.animalName}>{animal.name}</Text>
                      <Text style={styles.animalCost}>{animal.cost} 💰</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🐾 {pet.name}</Text>
      </View>

      <View style={styles.petContainer}>
        <View style={styles.petDisplay}>
          <Text style={styles.petEmoji}>{pet.emoji}</Text>
          <Text style={styles.petName}>{pet.name}</Text>
        </View>

        <View style={styles.statsContainer}>
          <StatBar label="Faim" value={pet.hunger} emoji="🍖" />
          <StatBar label="Bonheur" value={pet.happiness} emoji="😄" />
          <StatBar label="Propreté" value={pet.cleanliness} emoji="🚿" />
          <StatBar label="Énergie" value={pet.energy} emoji="⚡" />
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={feedPet}>
            <Text style={styles.actionEmoji}>🍖</Text>
            <Text style={styles.actionLabel}>Nourrir</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBtn} onPress={playWithPet}>
            <Text style={styles.actionEmoji}>🎾</Text>
            <Text style={styles.actionLabel}>Jouer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBtn} onPress={cleanPet}>
            <Text style={styles.actionEmoji}>🚿</Text>
            <Text style={styles.actionLabel}>Laver</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E8D5B7' },
  backText: { fontSize: 16, color: '#8B6F47', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#3A2818' },
  
  // No pet
  noPetContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  noPetEmoji: { fontSize: 80, marginBottom: 20 },
  noPetTitle: { fontSize: 24, fontWeight: '700', color: '#3A2818' },
  noPetSubtitle: { fontSize: 16, color: '#8B6F47', textAlign: 'center', marginTop: 8 },
  adoptBtn: { marginTop: 30, backgroundColor: '#4CAF50', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 25 },
  adoptBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  
  // Pet display
  petContainer: { flex: 1, padding: 20 },
  petDisplay: { alignItems: 'center', backgroundColor: '#FFF', borderRadius: 24, padding: 30, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  petEmoji: { fontSize: 100 },
  petName: { fontSize: 24, fontWeight: '700', color: '#3A2818', marginTop: 10 },
  
  // Stats
  statsContainer: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 20 },
  statRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statEmoji: { fontSize: 20, width: 30 },
  statLabel: { width: 70, fontSize: 14, color: '#5D4037' },
  statBarBg: { flex: 1, height: 12, backgroundColor: '#E8D5B7', borderRadius: 6, overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: 6 },
  statValue: { width: 45, textAlign: 'right', fontSize: 12, fontWeight: '600', color: '#5D4037' },
  
  // Actions
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  actionBtn: { alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  actionEmoji: { fontSize: 32 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#5D4037', marginTop: 6 },
  
  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#FFF8E7', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E8D5B7' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#3A2818' },
  closeX: { fontSize: 22, color: '#8B6F47' },
  coinsAvailable: { textAlign: 'center', fontSize: 16, color: '#DAA520', fontWeight: '600', marginTop: 10 },
  animalsList: { padding: 16 },
  animalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12 },
  animalCardDisabled: { opacity: 0.5 },
  animalEmoji: { fontSize: 40, marginRight: 16 },
  animalInfo: { flex: 1 },
  animalName: { fontSize: 18, fontWeight: '700', color: '#3A2818' },
  animalCost: { fontSize: 14, color: '#DAA520', marginTop: 4 },
});
