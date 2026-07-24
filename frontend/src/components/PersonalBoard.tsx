import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import type { Letter } from '../shared/types';
import { Avatar } from '../avatar/png/Avatar';
import { getReceivedOfferings, type OfferingSentDTO } from '../api/offerings';
import { getUnreadCount } from '../api/bottles';
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
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const {
    currentUser,
    points,
    matches,
    lettersByMatch,
    matchPartners,
    pet,
    currentSalonId,
  } = useStore();

  // Hauteur dispo calculée (pas mesurée via onLayout, peu fiable sur web) :
  // fenêtre − marge haute (insets.top, avec un minimum car certains WebViews
  // le renvoient à 0) − hauteur exacte de la CustomTabBar flottante du bas
  // (mêmes constantes que CustomTabBar.tsx : ACTIVE_LIFT+BAR_HEIGHT+BOTTOM_MARGIN+insets.bottom).
  const topPad = Math.max(insets.top, 24);
  const TAB_BAR_TOTAL = 24 + 64 + 10 + insets.bottom;
  const W = winWidth;
  const H = Math.max(500, winHeight - topPad - TAB_BAR_TOTAL);
  const px = (base: number, frac: number) => Math.round(base * frac);

  const [offerings, setOfferings] = useState<OfferingSentDTO[]>([]);
  const [hasBottle, setHasBottle] = useState(false);
  const [salonName, setSalonName] = useState<string | null>(null);
  const [refugeData, setRefugeData] = useState<{
    animalType: string;
    todaySubmitted: boolean;
    isActive: boolean;
  } | null>(null);

  const checkRefugeSession = useCallback(async () => {
    try {
      const response = await apiFetch('/refuge/active');
      if (response && response.data && response.data.animalType) {
        setRefugeData({
          animalType: response.data.animalType,
          todaySubmitted: response.data.todaySubmitted,
          isActive: response.data.isActive,
        });
      } else {
        setRefugeData(null);
      }
    } catch (error) {
    }
  }, []);

  useEffect(() => {
    const loadOfferings = async () => {
      try {
        const data = await getReceivedOfferings(1, 100, true);
        setOfferings(data);
      } catch (error) {
      }
    };
    loadOfferings();
  }, []);

  useEffect(() => {
    const loadBottles = async () => {
      try {
        const count = await getUnreadCount();
        setHasBottle(count > 0);
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

  useFocusEffect(
    useCallback(() => {
      checkRefugeSession();
    }, [checkRefugeSession])
  );

  const recentLetters = (() => {
    if (!currentUser?.id || !matches?.length) return [];

    // Filter matches to active/pending status (same as LettersScreen)
    const activeMatches = matches.filter(
      (m) => m.status === 'active' || m.status === 'pending'
    );

    // Collect received letters from lettersByMatch
    const allLetters: Letter[] = [];
    activeMatches.forEach((match) => {
      const matchLetters = lettersByMatch[match.id];
      if (matchLetters !== undefined) {
        allLetters.push(
          ...matchLetters.filter((l) => l.toUserId === currentUser.id)
        );
      }
    });

    // Sort by createdAt descending and return 3 most recent
    return allLetters
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 3);
  })();

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text style={{ color: '#999', textAlign: 'center', marginTop: 50 }}>
          Chargement...
        </Text>
      </View>
    );
  }

  // Toutes les positions/tailles sont des fractions de (W, H) mesurés, pour
  // que le tableau tienne SUR UN SEUL ÉCRAN FIXE (pas de scroll), quel que
  // soit l'appareil. H = hauteur dispo sous la barre de statut et au-dessus
  // de la barre de nav du bas (déjà exclue par le flex du Tabs navigator).
  const profileW = px(W, 0.27);
  const avatarSize = Math.round(profileW * 0.62);
  // Bouteille + Offrandes partagent la même rangée (côte à côte). La carte
  // postale retrouve sa taille d'origine (~180×120 sur un board 390×665) ;
  // seule Offrandes est réduite en largeur pour tenir à côté.
  const bouteilleW = px(W, 0.46);
  const bouteilleH = px(H, 0.18);
  const bottleImgH = Math.round(bouteilleH * 0.85);
  const bottleImgW = Math.round(bottleImgH * (96 / 116));

  return (
    <View
      style={[styles.container, styles.board, { paddingTop: topPad }]}
      pointerEvents="box-none"
    >
      {/* Profile (haut gauche) */}
      <Paper
        onPress={() => router.push(`/profile/${currentUser?.id}`)}
        style={{
          position: 'absolute',
          top: px(H, 0.03),
          left: px(W, 0.03),
          width: profileW,
          transform: [{ rotate: '-3deg' }],
        }}
      >
        {currentUser?.avatarConfig && (
          <Avatar
            size={avatarSize}
            {...currentUser.avatarConfig}
          />
        )}
        <Text style={styles.profileName}>{currentUser?.name || 'Vous'}</Text>
      </Paper>

      {/* Ton Compagnon (haut droite) */}
      <Paper
        onPress={() => router.push('/refuge')}
        style={{
          position: 'absolute',
          top: px(H, 0.03),
          right: px(W, 0.03),
          width: px(W, 0.38),
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
              {refugeData.isActive && refugeData.todaySubmitted ? "Tu t'en es déjà occupé aujourd'hui" : refugeData.isActive ? "Il est temps de t'en occuper aujourd'hui" : "En attente d'un adoptant"}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.animalIcon}>🐾</Text>
            {pet && <Text style={styles.animalName}>{pet.petName}</Text>}
          </>
        )}
      </Paper>

      {/* Lettres Reçues (gauche, sous le profil) */}
      <Paper
        onPress={() => router.push('/(tabs)/letters')}
        style={{
          position: 'absolute',
          top: px(H, 0.23),
          left: px(W, 0.03),
          width: px(W, 0.58),
          transform: [{ rotate: '-2deg' }],
        }}
      >
        <Text style={styles.sectionTitle}>✉️ Lettres Reçues</Text>
        {recentLetters.length > 0 ? (
          <View style={styles.lettersContainer}>
            {recentLetters.slice(0, 3).map((letter, idx) => {
              const senderName = matchPartners[letter.fromUserId]?.pseudo || letter.fromUserId;
              return (
                <View key={idx} style={styles.letterItem}>
                  <Text style={styles.letterEnvelope}>✉️</Text>
                  <Text style={styles.letterSenderName} numberOfLines={1}>{senderName}</Text>
                </View>
              );
            })}
            {recentLetters.length > 3 && (
              <Text style={styles.moreIndicator}>+{recentLetters.length - 3}</Text>
            )}
          </View>
        ) : (
          <Text style={styles.emptyLetters}>Aucune lettre</Text>
        )}
      </Paper>

      {/* Sourires (droite, sous Ton Compagnon) — réduit */}
      <Paper
        onPress={() => router.push('/(tabs)/profiles?filter=received-smiles')}
        style={{
          position: 'absolute',
          top: px(H, 0.28),
          right: px(W, 0.05),
          width: px(W, 0.22),
          transform: [{ rotate: '-2deg' }],
        }}
      >
        <Text style={styles.smilesTitle}>Sourires</Text>
        <Text style={styles.smilesCount}>
          {matches?.filter(m => m.initiatorId !== currentUser?.id).length ?? 0}
        </Text>
      </Paper>

      {/* Bouteille (gauche) — carte postale réduite, à côté des Offrandes */}
      <Paper
        onPress={() => {
          if (hasBottle) {
            router.push('/bottles-discussions');
          } else {
            router.push('/bottles-inbox');
          }
        }}
        style={{
          position: 'absolute',
          top: px(H, 0.48),
          left: px(W, 0.04),
          width: bouteilleW,
          height: bouteilleH,
          padding: 0,
          transform: [{ rotate: '2deg' }],
        }}
      >
        {/* Le cadre déborde de 2px sur chaque bord (au lieu de 0) : sur le web,
            un élément avec overflow:hidden + borderRadius + rotate laisse
            parfois un liseré d'un pixel visible sur un bord (bug de rendu
            WebKit/Chromium) — le léger débord couvre ce liseré. */}
        <View style={{ position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, overflow: 'hidden', borderRadius: 5, backfaceVisibility: 'hidden' }}>
          <Image
            source={require('../../assets/images/bottle/beach.png')}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        </View>
        {hasBottle && (
          <View style={styles.bottleWrapper} pointerEvents="none">
            <Image
              source={require('../../assets/images/bottle-message.png')}
              style={{ width: bottleImgW, height: bottleImgH, resizeMode: 'contain' }}
            />
          </View>
        )}
      </Paper>

      {/* Offrandes Reçues (droite, à côté de la Bouteille) — objets uniquement,
          largeur réduite pour tenir sur la même rangée que la carte postale. */}
      <Paper
        onPress={() => router.push('/offerings')}
        style={{
          position: 'absolute',
          top: px(H, 0.5),
          right: px(W, 0.04),
          width: px(W, 0.4),
          transform: [{ rotate: '-2deg' }],
        }}
      >
        <Text style={styles.giftsTitle}>Offrandes Reçues</Text>
        {offerings.length > 0 ? (
          <View style={styles.offeringsContainer}>
            {offerings.slice(0, 3).map((offering, idx) => {
              const offeringId = offering.offering.id;
              const pngUriMap: Record<string, any> = {
                'biere': require('../../public/offerings/off_biere_stage1.png'),
                'bonbons': require('../../public/offerings/off_bonbons_stage1.png'),
                'fraises': require('../../public/offerings/off_fraises_stage1.png'),
              };
              const pngAsset = pngUriMap[offeringId];
              return (
                <View key={idx} style={styles.offeringItem}>
                  {pngAsset ? (
                    <Image source={pngAsset} style={styles.offeringPNG} />
                  ) : (
                    <Text style={styles.offeringName} numberOfLines={1}>{offering.offering.name}</Text>
                  )}
                </View>
              );
            })}
            {offerings.length > 3 && (
              <Text style={styles.moreIndicator}>+{offerings.length - 3}</Text>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.giftItem}>Bouquet</Text>
            <Text style={styles.giftItem}>Grand Cru</Text>
            <Text style={styles.giftItem}>Photo</Text>
          </>
        )}
      </Paper>

      {/* Mon Salon (bas gauche) — remonté pour combler l'espace libéré par la
          rangée Bouteille + Offrandes désormais côte à côte. */}
      <Paper
        onPress={() => router.push(currentSalonId ? `/salon/${currentSalonId}` : '/(tabs)/salons-list')}
        style={{
          position: 'absolute',
          top: px(H, 0.78),
          left: px(W, 0.04),
          width: px(W, 0.36),
          transform: [{ rotate: '-3deg' }],
        }}
      >
        <Text style={styles.salonTitle}>Mon Salon</Text>
        <Text style={styles.salonIcon}>🎭</Text>
        {salonName && (
          <Text style={styles.salonName} numberOfLines={1}>{salonName}</Text>
        )}
      </Paper>

      {/* Stats (bas droite) */}
      <Paper
        style={{
          position: 'absolute',
          top: px(H, 0.78),
          right: px(W, 0.04),
          width: px(W, 0.33),
          transform: [{ rotate: '2deg' }],
        }}
      >
        <Text style={styles.statsTitle}>Stats</Text>
        <Text style={styles.statValue}>{points ?? 0} pts</Text>
        <Text style={styles.statValue}>{matches?.length ?? 0} matchs</Text>
      </Paper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: J.bgBoard,
  },
  // Tableau à taille fixe (pas de scroll) : occupe tout l'espace dispo
  // entre le haut de l'écran et la barre de navigation flottante du bas.
  board: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
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

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: J.textMain,
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  lettersContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },

  letterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 2,
  },

  letterEnvelope: {
    fontSize: 12,
    marginRight: 6,
  },

  letterSenderName: {
    fontSize: 9,
    color: J.textMain,
    fontWeight: '600',
    flex: 1,
  },

  emptyLetters: {
    fontSize: 9,
    color: J.textSecondary,
    textAlign: 'center',
  },

  moreIndicator: {
    fontSize: 9,
    color: J.accentPrimary,
    fontWeight: '600',
    marginTop: 2,
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
    fontSize: 22,
    fontWeight: '700',
    color: J.textMain,
    textAlign: 'center',
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

  offeringsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },

  offeringItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 2,
    gap: 6,
  },

  offeringPNG: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },

  offeringName: {
    fontSize: 9,
    color: J.textMain,
    fontWeight: '600',
    textAlign: 'center',
  },

  bottleWrapper: {
    position: 'absolute',
    bottom: 2,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },

  salonName: {
    fontSize: 8,
    color: J.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '500',
  },
});
