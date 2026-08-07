import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getReceivedOfferings } from '../api/offerings';
import type { OfferingSentDTO } from '../api/offerings';
import { useStore } from '../store/useStore';
import { AppBackButton } from '../components/AppBackButton';

const DESK_BG = require('../../assets/images/offerings/desk-bg.jpg');

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
      <View style={styles.deskBgLayer} pointerEvents="none">
        <Image source={DESK_BG} style={styles.deskBgImage} resizeMode="cover" />
      </View>

      <AppBackButton
        onPress={() => router.back()}
        tone="inverse"
        style={[styles.backBtn, { top: insets.top + 12 }]}
      />

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#F4E8CE" />
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
            { paddingTop: insets.top + 76, paddingBottom: insets.bottom + 36 },
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
    backgroundColor: '#171411',
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
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#F4E8CE',
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.72)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'flex-start',
    paddingHorizontal: 20,
    rowGap: 26,
    columnGap: 18,
  },
  offeringSlot: {
    width: 96,
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  offeringImage: {
    width: 64,
    height: 64,
    marginBottom: 7,
  },
  offeringEmoji: {
    fontSize: 44,
    lineHeight: 64,
    marginBottom: 7,
  },
  offeringName: {
    width: '100%',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: '#FFF8EA',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.82)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  offeringSender: {
    width: '100%',
    marginTop: 1,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500',
    color: '#DED0B6',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.82)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
