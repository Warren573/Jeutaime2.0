import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Avatar } from '../avatar/png/Avatar';

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
    activeOpacity={0.85}
    pointerEvents="auto"
  >
    <View style={styles.magnet} pointerEvents="none" />
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
  } = useStore();

  const title = getCurrentTitle() || { title: '', emoji: '' };

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
    >
      <View style={[styles.board, { paddingTop: insets.top }]}>
        {/* Profile (top left) */}
        <Paper
          onPress={() => {
            console.log('Profile card pressed:', currentUser?.id);
            if (currentUser?.id) {
              router.push(`/profile/${currentUser.id}`);
            }
          }}
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
          onPress={() => {
            console.log('Lettres pressed');
            router.push('/(tabs)/letters');
          }}
          style={{
            position: 'absolute',
            top: 180,
            left: 16,
            width: 230,
            transform: [{ rotate: '-2deg' }],
          }}
        >
          <Text style={styles.sectionTitle}>✉️ Lettres Reçues</Text>
          {recentLetters.map((letter, idx) => (
            <Text key={idx} style={styles.letterFrom}>
              {letter.fromUserId}
            </Text>
          ))}
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
          <Text style={styles.animalIcon}>🐾</Text>
          {pet && <Text style={styles.animalName}>{pet.petName}</Text>}
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
          <Text style={styles.smilesCount}>12</Text>
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
          <Text style={styles.giftItem}>💐 Bouquet</Text>
          <Text style={styles.giftItem}>🍷 Grand Cru</Text>
          <Text style={styles.giftItem}>📸 Photo</Text>
        </Paper>

        {/* Mon Salon (bottom left) */}
        <Paper
          onPress={() => router.push('/salons-list')}
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
        <View style={{ height: 1050 }} />
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
});
