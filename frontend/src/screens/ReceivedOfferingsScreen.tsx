import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { getReceivedOfferings } from '../api/offerings';
import type { OfferingSentDTO } from '../api/offerings';

export default function ReceivedOfferingsScreen() {
  const [offerings, setOfferings] = useState<OfferingSentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getReceivedOfferings(1, 50, true);
      setOfferings(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de chargement';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderOfferingItem = ({ item }: { item: OfferingSentDTO }) => (
    <View style={styles.offeringCard}>
      <View style={styles.offeringHeader}>
        <Text style={styles.emoji}>{item.offering.emoji}</Text>
        <View style={styles.offeringInfo}>
          <Text style={styles.offeringName}>{item.offering.name}</Text>
          <Text style={styles.fromUser}>De {item.fromUserId}</Text>
        </View>
      </View>
      <View style={styles.offeringDetails}>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        {item.isActive ? (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Actif</Text>
          </View>
        ) : (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveBadgeText}>Expiré</Text>
          </View>
        )}
      </View>
      {item.expiresAt && (
        <Text style={styles.expiresAt}>
          Expire le {formatDate(item.expiresAt)}
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#8B2E3C" />
          <Text style={styles.loadingText}>Chargement des offrandes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>❌ Erreur</Text>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎁 Offrandes Reçues</Text>
      </View>

      {offerings.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyText}>Vous n'avez pas encore reçu d'offrandes</Text>
          <Text style={styles.emptySubtext}>
            Les offrandes reçues des autres joueurs apparaîtront ici
          </Text>
        </View>
      ) : (
        <FlatList
          data={offerings}
          renderItem={renderOfferingItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6F2',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5DDD3',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2B2B2B',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  offeringCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  offeringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 32,
    marginRight: 12,
  },
  offeringInfo: {
    flex: 1,
  },
  offeringName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B2B2B',
    marginBottom: 2,
  },
  fromUser: {
    fontSize: 12,
    color: '#6B6B6B',
  },
  offeringDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  date: {
    fontSize: 11,
    color: '#999',
  },
  activeBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inactiveBadge: {
    backgroundColor: '#CCC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  expiresAt: {
    fontSize: 10,
    color: '#FF9800',
    fontStyle: 'italic',
    marginTop: 4,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B6B6B',
    marginTop: 12,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D32F2F',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B6B6B',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2B2B',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6B6B6B',
    textAlign: 'center',
  },
});
