import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useStore } from '../src/store/useStore';
import { useRouteGuard } from '../src/components/FeatureGate';

export default function OfferingsPage() {
  const state = useRouteGuard('offrandes');
  if (state === 'hidden') return null;

  const { currentUser } = useStore();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>🎁 Offrandes Reçues</Text>
        <Text style={styles.subtitle}>Cadeaux reçus des autres joueurs</Text>

        <View style={styles.offeringsGrid}>
          <View style={styles.offeringCard}>
            <Text style={styles.offeringEmoji}>💐</Text>
            <Text style={styles.offeringName}>Bouquet de Fleurs</Text>
          </View>
          <View style={styles.offeringCard}>
            <Text style={styles.offeringEmoji}>🍷</Text>
            <Text style={styles.offeringName}>Grand Cru</Text>
          </View>
          <View style={styles.offeringCard}>
            <Text style={styles.offeringEmoji}>📸</Text>
            <Text style={styles.offeringName}>Photo Souvenir</Text>
          </View>
        </View>

        <Text style={styles.infoText}>
          Collectionnez les offrandes reçues des autres joueurs en interagissant dans les salons ! ✨
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2B2B2B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B6B6B',
    marginBottom: 20,
    textAlign: 'center',
  },
  offeringsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  offeringCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    width: '30%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  offeringEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  offeringName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2B2B2B',
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#6B6B6B',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 16,
  },
});
