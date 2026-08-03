import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getBottleMessages } from '../api/bottles';
import { BottleParchmentCard } from '../components/BottleParchmentCard';
import type { BottleMessageWithMetadata } from '../api/bottles';

const CREAM_BG = '#FBF8F3';

const COLORS = {
  text: '#2B2B2B',
  textSecondary: '#6B6B6B',
  accent: '#8B2E3C',
};

export default function BottleOldLetterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const bottleId = params.bottleId as string;
  const messageId = params.messageId as string;

  const [message, setMessage] = useState<BottleMessageWithMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMessage = async () => {
      if (!bottleId || !messageId) {
        setError('Paramètres manquants');
        setIsLoading(false);
        return;
      }
      try {
        const messages = await getBottleMessages(bottleId);
        const found = messages.find((m) => m.id === messageId);
        if (found) {
          setMessage(found);
        } else {
          setError('Cette lettre n\'existe plus');
        }
      } catch (err) {
        console.error('[BottleOldLetterScreen] Error:', err);
        setError('Erreur de chargement');
      } finally {
        setIsLoading(false);
      }
    };

    loadMessage();
  }, [bottleId, messageId]);

  if (isLoading) {
    return (
      <View style={[styles.bg, { backgroundColor: CREAM_BG }]}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </View>
    );
  }

  if (error || !message) {
    return (
      <View style={[styles.bg, { backgroundColor: CREAM_BG }]}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {error || 'Lettre non trouvée'}
            </Text>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.backBtnText}>Retour</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.bg, { backgroundColor: CREAM_BG }]}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.paddedSection}>
            <TouchableOpacity
              style={styles.back}
              onPress={() => router.back()}
            >
              <Text style={styles.backText}>← Retour</Text>
            </TouchableOpacity>
          </View>

          <BottleParchmentCard content={message.content} />
        </ScrollView>

        <View style={styles.spacer} />

        <View style={[styles.bannerContainer, { marginBottom: insets.bottom + 16 }]}>
          <View style={styles.readOnlyBox}>
            <Text style={styles.readOnlyText}>
              🔒 Lecture seule
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 0,
    paddingVertical: 16,
  },
  spacer: {
    flex: 1,
  },
  bannerContainer: {
    paddingHorizontal: 16,
  },
  paddedSection: {
    paddingHorizontal: 16,
    marginTop: 40,
  },
  back: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: '600',
  },
  readOnlyBox: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  readOnlyText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
