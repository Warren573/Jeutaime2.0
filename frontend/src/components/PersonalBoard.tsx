import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Avatar } from '../avatar/png/Avatar';
import { getReceivedOfferings } from '../api/offerings';
import { getInbox } from '../api/bottles';
import { getSalon } from '../api/salons';
import { getAnimalImage } from '../data/refugeAnimalImages';
import { ANIMAL_LABELS } from '../data/refugeAnimals';
import { apiFetch } from '../api/client';

const J = {
  bgBoard: '#D9CFC2',
  textMain: '#2B2B2B',
  textSecondary: '#6B6B6B',
  accentPrimary: '#8B2E3C',
};

interface PaperProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
}

const Paper: React.FC<PaperProps> = ({ children, onPress, style }) => (
  <TouchableOpacity
    style={[styles.paper, style]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {onPress && <View style={styles.magnet} pointerEvents="none" />}
    {children}
  </TouchableOpacity>
);

export function PersonalBoard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    currentUser,
    points,
    matches,
    letters,
    getCurrentTitle,
    pet,
    currentSalonId,
  } = useStore();

  const title = getCurrentTitle() || { title: '', emoji: '' };

  const [offeringsCount, setOfferingsCount] = useState(0);
  const [bottlesCount, setBottlesCount] = useState(0);
  const [salonName, setSalonName] = useState<string | null>(null);
  const [refugeData, setRefugeData] = useState<{
    animalType: string;
    todaySubmitted: boolean;
  } | null>(null);

  useEffect(() => {
    const loadOfferings = async () => {
      try {
        const data = await getReceivedOfferings(1, 100, true);
        setOfferingsCount(data.length);
      } catch (error) {
      }
    };
    loadOfferings();
  }, []);

  useEffect(() => {
    const loadBottles = async () => {
      try {
        const data = await getInbox();
        const pending = data.filter(b => b.status === 'FLOATING');
        setBottlesCount(pending.length);
      } catch (error) {
      }
    };
    loadBottles();
  }, []);

  useEffect(() => {
    if (currentSalonId) {
      const loadSalon = async () => {
        try {
          const data = await getSalon(currentSalonId);
          setSalonName(data.name);
        } catch (error) {
        }
      };
      loadSalon();
    }
  }, [currentSalonId]);

  useEffect(() => {
    const checkRefugeSession = async () => {
      try {
        const response = await apiFetch('/refuge/session');
        if (response && response.data) {
          setRefugeData({
            animalType: response.data.animalType,
            todaySubmitted: response.data.todaySubmitted,
          });
        }
      } catch (error) {
      }
    };
    checkRefugeSession();
  }, []);

  const recentLetters = letters
    ? [...letters]
        .sort((a, b) => b.createdAt - a.createdAt)
        .filter(l => l.toUserId === (currentUser?.id || 'me'))
        .slice(0, 3)
    : [];

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text style={{ color: '#999', textAlign: 'center', marginTop: 50 }}>
          Chargement...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      nestedScrollEnabled={true}
    >
      <View style={[styles.board, { paddingTop: insets.top }]} pointerEvents="box-none">
        {/* Profile (top left) */}
        <Paper
          onPress={() => router.push(`/profile/${currentUser?.id}`)}
          style={{
            position: 'absolute',
            top: 16,
            left: 12,
            width: 110,
            height: 140,
            transform: [{ rotate: '-3deg' }],
          }}
        >
          {currentUser?.avatarConfig && (
            <Avatar
              size={56}
              {...currentUser.avatarConfig}
            />
          )}
          <Text style={styles.profileName}>{currentUser?.name || 'Vous'}</Text>
          <Text style={styles.profileTitle}>{title.title}</Text>
        </Paper>

        {/* Bienvenue (top right) */}
        <Paper
          style={{
            position: 'absolute',
            top: 32,
            right: 16,
            width: 135,
            height: 85,
            transform: [{ rotate: '4deg' }],
          }}
        >
          <Text style={styles.welcomeText}>
            Bienvenue{'\n'}{currentUser?.name || 'Vous'} ♥
          </Text>
        </Paper>

        {/* Lettres (left, below profile) */}
        <Paper
          onPress={() => router.push('/(tabs)/letters')}
          style={{
            position: 'absolute',
            top: 180,
            left: 16,
            width: 230,
            transform: [{ rotate: '-2deg' }],
          }}
        >
          <Text style={styles.sectionTitle}>✉️ Lettres Reçues</Text>
          {recentLetters.length > 0 ? (
            <Text style={styles.letterCount}>{recentLetters.length} lettre{recentLetters.length > 1 ? 's' : ''}</Text>
          ) : (
            recentLetters.map((letter, idx) => (
              <Text key={idx} style={styles.letterFrom}>
                {letter.fromUserId}
              </Text>
            ))
          )}
        </Paper>

        {/* Animal (right side) */}
        <Paper
          onPress={() => router.push('/refuge')}
          style={{
            position: 'absolute',
            top: 210,
            right: 12,
            width: 145,
            transform: [{ rotate: '3deg' }],
          }}
        >
          <Text style={styles.animalTitle}>Ton Compagnon</Text>
          {refugeData?.animalType ? (
            <>
              {getAnimalImage(refugeData.animalType) ? (
                <Image
                  source={getAnimalImage(refugeData.animalType)}
                  style={styles.animalImage}
                />
              ) : (
                <Text style={styles.animalIcon}>{ANIMAL_LABELS[refugeData.animalType] || '🐾'}</Text>
              )}
              <Text style={styles.animalStatus}>
                {refugeData.todaySubmitted ? "Tu l'as soigné 🎉" : "Il t'attend 💕"}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.animalIcon}>🐾</Text>
              {pet && <Text style={styles.animalName}>{pet.petName}</Text>}
            </>
          )}
        </Paper>

        {/* Sourires (left, middle) */}
        <Paper
          onPress={() => router.push('/(tabs)/profiles')}
          style={{
            position: 'absolute',
            top: 420,
            left: 8,
            width: 125,
            transform: [{ rotate: '-2deg' }],
          }}
        >
          <Text style={styles.smilesTitle}>Sourires</Text>
          <Text style={styles.smilesCount}>{matches?.length ?? 0}</Text>
        </Paper>

        {/* Bouteille (right, middle) */}
        <Paper
          onPress={() => router.push('/bottle')}
          style={{
            position: 'absolute',
            top: 435,
            right: 8,
            width: 135,
            transform: [{ rotate: '2deg' }],
          }}
        >
          <Text style={styles.bottleTitle}>Bouteille à la Mer</Text>
          <Image
            source={require('../../assets/images/bottle-message.png')}
            style={styles.bottleImage}
          />
          {bottlesCount > 0 && (
            <Text style={styles.bottleBadge}>{bottlesCount} en attente</Text>
          )}
        </Paper>

        {/* Offrandes (center, largest) */}
        <Paper
          onPress={() => router.push('/offerings')}
          style={{
            position: 'absolute',
            top: 570,
            left: '50%',
            marginLeft: -115,
            width: 230,
            transform: [{ rotate: '1deg' }],
          }}
        >
          <Text style={styles.giftsTitle}>🎁 Offrandes Reçues</Text>
          {offeringsCount > 0 ? (
            <Text style={styles.giftCount}>{offeringsCount} offrande{offeringsCount > 1 ? 's' : ''}</Text>
          ) : (
            <>
              <Text style={styles.giftItem}>💐 Bouquet</Text>
              <Text style={styles.giftItem}>🍷 Grand Cru</Text>
              <Text style={styles.giftItem}>📸 Photo</Text>
            </>
          )}
        </Paper>

        {/* Mon Salon (bottom left) */}
        <Paper
          onPress={() => router.push(currentSalonId ? `/salon/${currentSalonId}` : '/(tabs)/salons-list')}
          style={{
            position: 'absolute',
            top: 820,
            left: 20,
            width: 155,
            transform: [{ rotate: '-3deg' }],
          }}
        >
          <Text style={styles.salonTitle}>Mon Salon</Text>
          <Text style={styles.salonIcon}>🎭</Text>
          {salonName && (
            <Text style={styles.salonName} numberOfLines={1}>{salonName}</Text>
          )}
        </Paper>

        {/* Stats (bottom right) */}
        <Paper
          style={{
            position: 'absolute',
            top: 830,
            right: 12,
            width: 140,
            transform: [{ rotate: '2deg' }],
          }}
        >
          <Text style={styles.statsTitle}>Stats</Text>
          <Text style={styles.statValue}>{points ?? 0} pts</Text>
          <Text style={styles.statValue}>{matches?.length ?? 0} matchs</Text>
        </Paper>

        {/* Spacer for scroll height */}
        <View style={{ height: 1050 }} pointerEvents="none" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: J.bgBoard,
  },
  scrollContent: {
    flexGrow: 1,
  },
  board: {
    position: 'relative',
    width: '100%',
  },

  paper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  magnet: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#5A5A5A',
    top: -7,
    left: '50%',
    marginLeft: -7,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    zIndex: 10,
  },

  profileName: {
    fontSize: 10,
    fontWeight: '700',
    color: J.textMain,
    marginBottom: 2,
    textAlign: 'center',
  },

  profileTitle: {
    fontSize: 12,
    textAlign: 'center',
  },

  welcomeText: {
    fontSize: 13,
    fontWeight: '300',
    color: J.textMain,
    textAlign: 'center',
    lineHeight: 20,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: J.textMain,
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  letterFrom: {
    fontSize: 9,
    color: J.textMain,
    marginBottom: 2,
    fontWeight: '600',
  },

  letterCount: {
    fontSize: 10,
    fontWeight: '600',
    color: J.textMain,
    textAlign: 'center',
  },

  animalTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: J.textMain,
    marginBottom: 6,
    textAlign: 'center',
  },

  animalIcon: {
    fontSize: 32,
    marginBottom: 4,
    textAlign: 'center',
  },

  animalName: {
    fontSize: 9,
    color: J.textMain,
    textAlign: 'center',
  },

  animalImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginVertical: 4,
  },

  animalStatus: {
    fontSize: 8,
    color: J.accentPrimary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },

  smilesTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: J.textMain,
    marginBottom: 8,
    textAlign: 'center',
  },

  smilesCount: {
    fontSize: 28,
    fontWeight: '700',
    color: J.textMain,
    textAlign: 'center',
  },

  bottleTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: J.textMain,
    marginBottom: 6,
    textAlign: 'center',
  },

  bottleImage: {
    width: 45,
    height: 60,
    resizeMode: 'contain',
    marginVertical: 4,
  },

  salonTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: J.textMain,
    marginBottom: 6,
    textAlign: 'center',
  },

  salonIcon: {
    fontSize: 24,
    textAlign: 'center',
  },

  statsTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: J.textMain,
    marginBottom: 8,
    textAlign: 'center',
  },

  statValue: {
    fontSize: 9,
    color: J.textMain,
    textAlign: 'center',
    marginBottom: 2,
  },

  giftsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: J.textMain,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  giftItem: {
    fontSize: 9,
    color: J.textMain,
    marginBottom: 6,
    textAlign: 'center',
  },

  giftCount: {
    fontSize: 10,
    fontWeight: '600',
    color: J.textMain,
    textAlign: 'center',
  },

  bottleBadge: {
    fontSize: 8,
    color: '#FF6B6B',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },

  salonName: {
    fontSize: 8,
    color: J.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '500',
  },
});
