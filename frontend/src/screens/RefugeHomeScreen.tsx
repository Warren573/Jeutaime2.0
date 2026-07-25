import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BouncyButton } from '../components/BouncyButton';

/**
 * Écran d'accueil du Refuge.
 * Affiché uniquement lorsqu'aucune session Refuge n'est active.
 */
export function RefugeHomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>🏠</Text>
          <Text style={styles.title}>Refuge Temporaire</Text>
          <Text style={styles.subtitle}>Choisissez votre rôle</Text>
        </View>

        <View style={styles.buttonContainer}>
          <BouncyButton
            style={styles.button}
            onPress={() => router.push('/refuge/propose')}
          >
            <Text style={styles.buttonEmoji}>🎭</Text>
            <Text style={styles.buttonText}>Incarner</Text>
            <Text style={styles.buttonSubtext}>Proposer un compagnon</Text>
          </BouncyButton>

          <BouncyButton
            style={styles.button}
            onPress={() => router.push('/refuge/adopt')}
          >
            <Text style={styles.buttonEmoji}>🔍</Text>
            <Text style={styles.buttonText}>Adopter</Text>
            <Text style={styles.buttonSubtext}>Chercher un compagnon</Text>
          </BouncyButton>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Comment ça marche?</Text>
          <Text style={styles.infoText}>
            • Incarnez un compagnon en proposant un refuge temporaire{'\n'}
            • Adoptez un compagnon en le découvrant jour après jour{'\n'}
            • Durez 7 jours ensemble pour révéler vos vrais profils
          </Text>
        </View>

        <BouncyButton
          style={styles.historyButton}
          onPress={() => router.push('/refuge/history')}
        >
          <Text style={styles.historyButtonText}>📖 Historique des adoptions</Text>
        </BouncyButton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4ED',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2B2B2B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B6B6B',
  },
  buttonContainer: {
    gap: 16,
    marginVertical: 20,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2B2B2B',
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 13,
    color: '#6B6B6B',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#1565C0',
    lineHeight: 18,
  },
  historyButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0D5C8',
    alignItems: 'center',
  },
  historyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B6F47',
  },
});
