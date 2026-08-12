import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BouncyButton } from '../components/BouncyButton';
import { AppBackButton } from '../components/AppBackButton';

const REFUGE_BG = require('../../assets/images/refuge/refuge-bg.png');

/**
 * Écran d'accueil du Refuge.
 * Affiché uniquement lorsqu'aucune session Refuge n'est active.
 */
export function RefugeHomeScreen() {
  const router = useRouter();

  return (
    <ImageBackground source={REFUGE_BG} resizeMode="stretch" style={styles.background}>
      <SafeAreaView style={styles.container}>
        <AppBackButton style={styles.backButton} onPress={() => router.back()} />

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.subtitle}>Choisissez votre rôle</Text>
          </View>

          <View style={styles.buttonContainer}>
            <BouncyButton style={styles.button} onPress={() => router.push('/refuge/propose')}>
              <Text style={styles.buttonEmoji}>🎭</Text>
              <Text style={styles.buttonText}>Incarner</Text>
              <Text style={styles.buttonSubtext}>Proposer un compagnon</Text>
            </BouncyButton>

            <BouncyButton style={styles.button} onPress={() => router.push('/refuge/adopt')}>
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

          <BouncyButton style={styles.historyButton} onPress={() => router.push('/refuge/history')}>
            <Text style={styles.historyButtonText}>📖 Historique des adoptions</Text>
          </BouncyButton>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#E8D6B7',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 16,
    zIndex: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 112,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    minHeight: 36,
    paddingTop: 34,
  },
  subtitle: {
    fontFamily: 'Georgia',
    fontSize: 15,
    color: '#6B5138',
    fontStyle: 'italic',
  },
  buttonContainer: { gap: 14, marginVertical: 10 },
  button: {
    backgroundColor: 'rgba(255, 249, 237, 0.88)',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(125, 91, 57, 0.24)',
    shadowColor: '#5A3E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonEmoji: { fontSize: 34, marginBottom: 8 },
  buttonText: {
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: '600',
    color: '#3E2C1D',
    marginBottom: 4,
  },
  buttonSubtext: { fontSize: 12, color: '#735D48', marginTop: 2 },
  infoCard: {
    backgroundColor: 'rgba(255, 249, 237, 0.82)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(125, 91, 57, 0.22)',
    marginBottom: 14,
  },
  infoTitle: {
    fontFamily: 'Georgia',
    fontSize: 14,
    fontWeight: '600',
    color: '#5B402A',
    marginBottom: 7,
  },
  infoText: { fontSize: 12, color: '#6A513D', lineHeight: 18 },
  historyButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 249, 237, 0.78)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(125, 91, 57, 0.28)',
    alignItems: 'center',
  },
  historyButtonText: {
    fontFamily: 'Georgia',
    fontSize: 14,
    fontWeight: '600',
    color: '#6B4C31',
  },
});
