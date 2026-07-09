import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { refugeApi } from '../../src/api/refuge-api';
import { BouncyButton } from '../../src/components/BouncyButton';

export default function RefugePage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const sessionIdParam = typeof params.sessionId === 'string' ? params.sessionId : null;

  const [loading, setLoading] = useState(!sessionIdParam);
  const [sessionId, setSessionId] = useState<string | null>(sessionIdParam);

  // Load or fetch active session
  useEffect(() => {
    if (sessionIdParam) {
      // Session ID provided in params - go straight to game
      setSessionId(sessionIdParam);
      setLoading(false);
      return;
    }

    // No session ID in params - try to fetch active session
    const fetchActiveSession = async () => {
      try {
        const activeSession = await refugeApi.getActive();
        if (activeSession) {
          setSessionId(activeSession.id);
        }
      } catch (error) {
        console.error('Error fetching active Refuge session:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveSession();
  }, [sessionIdParam]);

  // Navigate to game route when session found
  useEffect(() => {
    if (sessionId) {
      router.replace(`/refuge/${sessionId}`);
    }
  }, [sessionId, router]);

  // Show loading while fetching or navigating
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  // If session ID exists, show loading while navigating to game
  if (sessionId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  // No active session - show landing screen with choices
  return (
    <SafeAreaView style={styles.container}>
      <View style={{ backgroundColor: '#FF0000', padding: 20, zIndex: 9999 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' }}>
          ✅ TEST REFUGE INDEX.TSX ACTIVE
        </Text>
        <Text style={{ fontSize: 16, color: '#FFFFFF', textAlign: 'center', marginTop: 10 }}>
          Commit: 989b7176 (Landing Screen)
        </Text>
      </View>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4ED',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});
