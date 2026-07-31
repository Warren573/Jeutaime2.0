import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getBottleMessages } from '../api/bottles';
import { BottleParchmentCard } from '../components/BottleParchmentCard';
import type { BottleMessageWithMetadata } from '../api/bottles';

const COLORS = {
  bg: '#F5F1E8',
  card: '#FFFFFF',
  text: '#2B2B2B',
  textSecondary: '#6B6B6B',
  border: '#D8D2C4',
  accent: '#8B2E3C',
};

export default function BottleHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const bottleId = params.bottleId as string;

  const [messages, setMessages] = useState<BottleMessageWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    if (!bottleId) return;
    try {
      setError(null);
      const result = await getBottleMessages(bottleId);
      setMessages(result);
    } catch (err: any) {
      console.error('[BottleHistoryScreen] Error:', err);
      setError(err?.message || 'Erreur de chargement');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [bottleId]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadMessages();
    }, [loadMessages])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadMessages();
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.headerBack}>← Retour</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Historique de la correspondance</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucun message</Text>
          </View>
        ) : (
          <View>
            <Text style={styles.messageCount}>
              {messages.length} message{messages.length > 1 ? 's' : ''}
            </Text>
            {messages.map((message, index) => (
              <TouchableOpacity
                key={message.id}
                onPress={() =>
                  router.push({
                    pathname: '/bottles-old-letter',
                    params: { bottleId, messageIndex: index.toString() },
                  })
                }
              >
                <View style={styles.messagePreview}>
                  <BottleParchmentCard
                    content={message.content}
                    createdAt={message.createdAt}
                    source={message.source}
                    isMine={message.isMine}
                    compact={true}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
    marginBottom: 16,
  },
  messageCount: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  messagePreview: {
    marginBottom: 4,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorBox: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#FDECEA',
    borderLeftWidth: 4,
    borderLeftColor: '#E5534B',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#B3261E',
    fontWeight: '600',
  },
});
