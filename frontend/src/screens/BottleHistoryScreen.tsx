import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getBottleMessages } from '../api/bottles';
import { BottleParchmentCard } from '../components/BottleParchmentCard';
import type { BottleMessageWithMetadata } from '../api/bottles';
import { AppBackButton } from '../components/AppBackButton';

const CREAM_BG = '#FBF8F3';

const COLORS = {
  text: '#2B2B2B',
  textSecondary: '#6B6B6B',
  accent: '#8B2E3C',
};

export default function BottleHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const bottleId = params.bottleId as string;
  const safeTop = Math.max(insets.top, Platform.OS === 'web' ? 44 : 0);

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
      <View style={[styles.bg, { backgroundColor: CREAM_BG }]}>
        <View style={[styles.container, { paddingTop: safeTop }]}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.bg, { backgroundColor: CREAM_BG }]}>
      <View style={[styles.container, { paddingTop: safeTop }]}>
        <View style={styles.header}>
          <AppBackButton onPress={() => router.back()} />
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Notre correspondance</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 60 },
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
          <View style={styles.paddedSection}>
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {messages.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Aucune lettre</Text>
              </View>
            )}
          </View>

          {messages.length > 0 && (
            <View style={styles.stackWrap}>
              {messages.map((message, index) => {
                const isLatest = index === messages.length - 1;
                return (
                  <TouchableOpacity
                    key={message.id}
                    onPress={() =>
                      router.push({
                        pathname: '/bottles-old-letter',
                        params: { bottleId, messageId: message.id },
                      })
                    }
                    style={[
                      styles.letterTouchable,
                      !isLatest && styles.letterBehind,
                      index % 2 === 0 ? styles.letterTiltLeft : styles.letterTiltRight,
                      { zIndex: index + 1 },
                    ]}
                  >
                    <BottleParchmentCard
                      content={message.content}
                      compact={true}
                      variant={message.isMine ? 'sent' : 'received'}
                      label={message.isMine ? 'TA LETTRE' : 'LETTRE REÇUE'}
                      dateLabel={new Date(message.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
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
    paddingTop: 16,
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E7D9C6',
    backgroundColor: 'rgba(254,250,240,0.94)',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 42,
    height: 42,
  },
  paddedSection: {
    paddingHorizontal: 16,
  },
  stackWrap: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  letterTouchable: {
    marginBottom: 8,
    position: 'relative',
  },
  // Les anciennes lettres passent sous la suivante : seul leur haut reste visible.
  // La dernière lettre, rendue en dernier avec le zIndex le plus élevé, reste entière devant.
  letterBehind: {
    marginBottom: -236,
  },
  letterTiltLeft: { transform: [{ rotate: '-0.7deg' }] },
  letterTiltRight: { transform: [{ rotate: '0.7deg' }] },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
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
    color: '#D32F2F',
    fontWeight: '600',
  },
});
