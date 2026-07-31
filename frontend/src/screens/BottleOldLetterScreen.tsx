import React, { useState, useEffect, useCallback } from 'react';
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

const COLORS = {
  bg: '#F5F1E8',
  text: '#2B2B2B',
  textSecondary: '#6B6B6B',
  accent: '#8B2E3C',
};

export default function BottleOldLetterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const bottleId = params.bottleId as string;
  const messageIndex = parseInt(params.messageIndex as string, 10);

  const [message, setMessage] = useState<BottleMessageWithMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMessage = async () => {
      if (!bottleId) return;
      try {
        const messages = await getBottleMessages(bottleId);
        if (messages[messageIndex]) {
          setMessage(messages[messageIndex]);
        }
      } catch (err) {
        console.error('[BottleOldLetterScreen] Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessage();
  }, [bottleId, messageIndex]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!message) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Lettre non trouvée</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 60 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.headerBack}>← Retour</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Lettre</Text>

        {/* Affiche la lettre en lecture seule */}
        <BottleParchmentCard
          content={message.content}
          createdAt={message.createdAt}
          source={message.source}
          isMine={message.isMine}
        />

        {/* Message de lecture seule */}
        <View style={styles.readOnlyBox}>
          <Text style={styles.readOnlyText}>
            🔒 Lecture seule — Aucune réponse depuis une ancienne lettre
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 8,
  },
  headerBack: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
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
