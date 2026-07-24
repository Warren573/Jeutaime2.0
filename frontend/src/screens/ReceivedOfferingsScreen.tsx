import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getReceivedOfferings } from '../api/offerings';
import type { OfferingSentDTO } from '../api/offerings';
import { useStore } from '../store/useStore';

// Bureau vu du dessus : fond plein écran sur lequel les offrandes sont posées.
const DESK_BG = require('../../assets/images/offerings/desk-bg.jpg');

// Illustrations dédiées pour les offrandes connues (mêmes assets que le
// tableau personnel). Repli sur l'emoji du catalogue pour les autres.
const OFFERING_IMAGES: Record<string, any> = {
  biere: require('../../public/offerings/off_biere_stage1.png'),
  bonbons: require('../../public/offerings/off_bonbons_stage1.png'),
  fraises: require('../../public/offerings/off_fraises_stage1.png'),
};

export default function ReceivedOfferingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const matches = useStore((s) => s.matches);

  const [offerings, setOfferings] = useState<OfferingSentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getReceivedOfferings(1, 50, true);
        setOfferings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const senderName = (fromUserId: string) => {
    const match = matches?.find(
      (m) => m.userAId === fromUserId || m.userBId === fromUserId
    );
    return match?.otherProfile?.pseudo || fromUserId;
  };

  return (
    <View style={styles.container}>
      {/* Bureau épinglé au viewport (fixed web / absolute natif). */}
      <View style={styles.deskBgLayer} pointerEvents="none">
        <Image source={DESK_BG} style={styles.deskBgImage} resizeMode="contain" />
      </View>

      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 12 }]}
        onPress={() => router.back()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#F3E7C6" />
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.feedbackText}>{error}</Text>
        </View>
      ) : offerings.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.feedbackText}>Le bureau est encore vide…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.grid,
            { paddingTop: insets.top + 70, paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {offerings.map((item) => {
            const image = OFFERING_IMAGES[item.offering.id];
            return (
              <View key={item.id} style={styles.offeringSlot}>
                {image ? (
                  <Image source={image} style={styles.offeringImage} resizeMode="contain" />
                ) : (
                  <Text style={styles.offeringEmoji}>{item.offering.emoji}</Text>
                )}
                <Text style={styles.offeringName} numberOfLines={1}>
                  {item.offering.name}
                </Text>
                <Text style={styles.offeringSender} numberOfLines={1}>
                  {senderName(item.fromUserId)}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Assorti aux coins sombres de la photo du bureau, pour que la marge
    // (au-dessus/en dessous si la photo ne remplit pas toute la hauteur)
    // se fonde avec l'image plutôt que de trancher dessus.
    backgroundColor: '#141210',
  },
  deskBgLayer:
    Platform.OS === 'web'
      ? ({ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 } as any)
      : { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  deskBgImage: {
    width: '100%',
    height: '100%',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 2,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F3E7C6',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  feedbackText: {
    fontSize: 14,
    color: '#F3E7C6',
    textAlign: 'center',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 20,
  },
  offeringSlot: {
    width: 88,
    alignItems: 'center',
  },
  offeringImage: {
    width: 56,
    height: 56,
    marginBottom: 6,
  },
  offeringEmoji: {
    fontSize: 40,
    marginBottom: 6,
  },
  offeringName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF7E6',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  offeringSender: {
    fontSize: 10,
    color: '#D9CBB0',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
