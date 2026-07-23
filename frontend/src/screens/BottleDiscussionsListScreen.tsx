import React, { useState, useCallback } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import { getInbox, InboxBottleDTO } from '../api/bottles';

const COLORS = {
  bg: '#F5F1E8',
  card: '#FFFFFF',
  text: '#2B2B2B',
  textSecondary: '#6B6B6B',
  border: '#D8D2C4',
  accent: '#8B2E3C',
};

export default function BottleDiscussionsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [acceptedBottles, setAcceptedBottles] = useState<InboxBottleDTO[]>([]);
  const [closedBottles, setClosedBottles] = useState<InboxBottleDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDiscussions = useCallback(async () => {
    try {
      const bottles = await getInbox();
      setAcceptedBottles(
        bottles.filter(b => b.status === 'ACCEPTED' || b.status === 'REVEALED'),
      );
      setClosedBottles(
        bottles.filter(b => b.status === 'EXPIRED' || b.status === 'BROKEN'),
      );
    } catch (error) {
      console.error('Failed to load discussions:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDiscussions();
    }, [loadDiscussions])
  );

  const handleViewDiscussion = (bottleId: string) => {
    router.push({
      pathname: '/bottles-discussion',
      params: { bottleId },
    });
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
            onRefresh={() => {
              setIsRefreshing(true);
              loadDiscussions();
            }}
            tintColor={COLORS.accent}
          />
        }
      >
        {/* Header */}
        <Text style={styles.title}>Discussions</Text>

        {/* ACTIVE Section */}
        {acceptedBottles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACTIVES ({acceptedBottles.length})</Text>

            {acceptedBottles.map(bottle => (
              <TouchableOpacity
                key={bottle.id}
                style={styles.discussionCard}
                onPress={() => handleViewDiscussion(bottle.id)}
              >
                <View style={styles.discussionHeader}>
                  <Text style={styles.discussionGender}>{bottle.targetGender}</Text>
                  <Text style={styles.discussionSubtext}>, {bottle.senderCity}</Text>
                </View>

                <Text style={styles.discussionPreview} numberOfLines={2}>
                  "{bottle.message}"
                </Text>

                <View style={styles.discussionMeta}>
                  <Text style={styles.discussionMetaText}>
                    (plusieurs messages)
                  </Text>
                </View>

                <Text style={styles.discussionAction}>[ Continuer ]</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {acceptedBottles.length === 0 && closedBottles.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucune discussion active</Text>
            <Text style={styles.emptyStateSubtext}>Cherche une bouteille!</Text>
          </View>
        )}

        {/* CLOSED Section */}
        {closedBottles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CLOSES ({closedBottles.length})</Text>

            {closedBottles.map(bottle => (
              <TouchableOpacity
                key={bottle.id}
                style={[styles.discussionCard, styles.discussionCardClosed]}
                onPress={() => handleViewDiscussion(bottle.id)}
              >
                <View style={styles.discussionHeader}>
                  <Text style={[styles.discussionGender, styles.closedText]}>
                    {bottle.targetGender}
                  </Text>
                  <Text style={[styles.discussionSubtext, styles.closedText]}>
                    , {bottle.senderCity}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Create Button */}
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/bottles-create')}
        >
          <Text style={styles.createBtnText}>+ Créer une bouteille</Text>
        </TouchableOpacity>
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  discussionCard: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  discussionCardClosed: {
    opacity: 0.6,
  },
  discussionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  discussionGender: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  discussionSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  closedText: {
    color: COLORS.textSecondary,
  },
  discussionPreview: {
    fontSize: 13,
    color: COLORS.text,
    fontStyle: 'italic',
    marginBottom: 10,
    lineHeight: 18,
  },
  discussionMeta: {
    marginBottom: 8,
  },
  discussionMetaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  discussionAction: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
    textAlign: 'center',
  },
  createBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    marginTop: 16,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.card,
    textAlign: 'center',
  },
});
