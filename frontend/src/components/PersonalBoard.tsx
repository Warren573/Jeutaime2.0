/**
 * PersonalBoard — Tableau magnétique personnel de l'accueil.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import type { Letter } from '../shared/types';
import { Avatar } from '../avatar/png/Avatar';
import { getReceivedOfferings, type OfferingSentDTO } from '../api/offerings';
import { getUnreadCount } from '../api/bottles';
import { getSalon } from '../api/salons';
import { salonsData } from '../data/salonsData';
import { getAnimalImage } from '../data/refugeAnimalImages';
import { ANIMAL_LABELS } from '../data/refugeAnimals';
import { apiFetch } from '../api/client';
import { APP_COLORS, APP_RADIUS, APP_SPACING } from '../theme/appTheme';
import { CoinIcon } from './CoinIcon';
import Svg, { Path, Circle } from 'react-native-svg';

const WOOD_BG = require('../../assets/images/home/board-wood-bg.png');
const J = { bgBoard: APP_COLORS.background, textMain: APP_COLORS.ink, textSecondary: APP_COLORS.muted, accentPrimary: APP_COLORS.burgundy };
const KIND_TO_SLUG: Record<string, string> = { PISCINE: 'piscine', CAFE_DE_PARIS: 'cafe_paris', ILE_PIRATES: 'pirates', THEATRE: 'theatre', BAR_COCKTAILS: 'cocktails', METAL: 'metal', PSY: 'psy' };
const SALON_UI_ICONS: Record<string, any> = {
  piscine: require('../../assets/ui-icons/pool.png'),
  cafe_paris: require('../../assets/ui-icons/coffee.png'),
  pirates: require('../../assets/ui-icons/pirate.png'),
  theatre: require('../../assets/ui-icons/theatre.png'),
  cocktails: require('../../assets/ui-icons/cocktail.png'),
  metal: require('../../assets/ui-icons/metal.png'),
  psy: require('../../assets/ui-icons/psy.png'),
};

// Le contour est vectoriel et son centre est réellement transparent : la plage reste visible.
const POSTCARD_FRAME_PATH = (() => {
  const parts = ['M 20 15'];
  for (let x = 20; x < 880; x += 20) parts.push(`Q ${x + 10} 0 ${x + 20} 15`);
  parts.push('L 885 20');
  for (let y = 20; y < 580; y += 20) parts.push(`Q 900 ${y + 10} 885 ${y + 20}`);
  parts.push('L 880 585');
  for (let x = 880; x > 20; x -= 20) parts.push(`Q ${x - 10} 600 ${x - 20} 585`);
  parts.push('L 15 580');
  for (let y = 580; y > 20; y -= 20) parts.push(`Q 0 ${y - 10} 15 ${y - 20}`);
  // Trou central : ne jamais recouvrir l'image de la plage.
  parts.push('Z M 32 30 H 868 V 570 H 32 Z');
  return parts.join(' ');
})();

interface PaperProps { children: React.ReactNode; onPress?: () => void; style?: any; }
const Paper: React.FC<PaperProps> = ({ children, onPress, style }) => (
  <View style={[styles.paperWrap, style]}>
    <TouchableOpacity style={styles.paper} onPress={onPress} activeOpacity={0.78}>
      {onPress && <View style={styles.magnet} pointerEvents="none" />}{children}
    </TouchableOpacity>
  </View>
);

export function PersonalBoard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const { currentUser, points, coins, matches, lettersByMatch, matchPartners, pet, currentSalonId, currentSalonKind } = useStore();
  const topPad = Math.max(insets.top, 24);
  const TAB_BAR_TOTAL = 24 + 64 + 10 + insets.bottom;
  const W = winWidth;
  const H = Math.max(500, winHeight - topPad - TAB_BAR_TOTAL);
  const px = (base: number, frac: number) => Math.round(base * frac);
  const y = (frac: number) => topPad + px(H, frac);
  const [offerings, setOfferings] = useState<OfferingSentDTO[]>([]);
  const [hasBottle, setHasBottle] = useState(false);
  const [salonName, setSalonName] = useState<string | null>(null);
  const [refugeData, setRefugeData] = useState<{ animalType: string; todaySubmitted: boolean; isActive: boolean } | null>(null);

  const checkRefugeSession = useCallback(async () => { try { const response = await apiFetch('/refuge/active'); if (response && response.data && response.data.animalType) setRefugeData({ animalType: response.data.animalType, todaySubmitted: response.data.todaySubmitted, isActive: response.data.isActive }); else setRefugeData(null); } catch {} }, []);
  useEffect(() => { (async () => { try { setOfferings(await getReceivedOfferings(1, 100, true)); } catch {} })(); }, []);
  useEffect(() => { (async () => { try { setHasBottle((await getUnreadCount()) > 0); } catch {} })(); }, []);
  useEffect(() => { if (!currentSalonId) { setSalonName(null); return; } (async () => { try { const data = await getSalon(currentSalonId); setSalonName(data.name); } catch {} })(); }, [currentSalonId]);
  useFocusEffect(useCallback(() => { checkRefugeSession(); }, [checkRefugeSession]));

  const recentLetters = (() => {
    if (!currentUser?.id || !matches?.length) return [];
    const activeMatches = matches.filter((m) => m.status === 'active' || m.status === 'pending');
    const allLetters: Letter[] = [];
    activeMatches.forEach((match) => { const matchLetters = lettersByMatch[match.id]; if (matchLetters !== undefined) allLetters.push(...matchLetters.filter((l) => l.toUserId === currentUser.id)); });
    return allLetters.sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
  })();

  if (!currentUser) return <View style={styles.container}><Text style={styles.loadingText}>Chargement...</Text></View>;
  const currentSalonSlug = currentSalonKind ? KIND_TO_SLUG[currentSalonKind] : undefined;
  const currentSalonIcon = currentSalonSlug ? SALON_UI_ICONS[currentSalonSlug] : undefined;
  const profileW = px(W, 0.27);
  const avatarSize = Math.round(profileW * 0.62);
  const bouteilleW = 180, bouteilleH = 120;
  const bottleImgH = Math.round(bouteilleH * 0.85), bottleImgW = Math.round(bottleImgH * (96 / 116));

  return (
    <View style={styles.board} pointerEvents="box-none">
      <View style={styles.backgroundLayer} pointerEvents="none">
        <Image source={WOOD_BG} resizeMode="stretch" style={styles.woodBackground} />
      </View>
      <Paper onPress={() => router.push(`/profile/${currentUser.id}`)} style={{ position: 'absolute', top: y(0.03), left: px(W, 0.03), width: profileW, transform: [{ rotate: '-3deg' }] }}>{currentUser.avatarConfig && <Avatar size={avatarSize} {...currentUser.avatarConfig} />}<Text style={styles.profileName}>{currentUser.name || 'Vous'}</Text></Paper>
      <Paper onPress={() => router.push('/refuge')} style={{ position: 'absolute', top: y(0.03), right: px(W, 0.14), width: px(W, 0.38), transform: [{ rotate: '3deg' }] }}><Text style={styles.animalTitle}>Ton Compagnon</Text>{refugeData?.animalType ? <>{getAnimalImage(refugeData.animalType) ? <Image source={getAnimalImage(refugeData.animalType)} style={styles.animalImage} /> : <Text style={styles.animalIcon}>{ANIMAL_LABELS[refugeData.animalType] || '🐾'}</Text>}<Text style={styles.animalStatus}>{refugeData.isActive && refugeData.todaySubmitted ? "Tu t'en es déjà occupé aujourd'hui" : refugeData.isActive ? "Il est temps de t'en occuper aujourd'hui" : "En attente d'un adoptant"}</Text></> : <><Text style={styles.animalIcon}>🐾</Text>{pet && <Text style={styles.animalName}>{pet.petName}</Text>}</>}</Paper>
      <TouchableOpacity onPress={() => router.push('/settings')} activeOpacity={0.65} style={[styles.settingsButton, { top: y(0.045), right: px(W, 0.018) }]} accessibilityRole="button" accessibilityLabel="Paramètres"><Ionicons name="settings-outline" size={27} color={J.textMain} /></TouchableOpacity>
      <Paper onPress={() => router.push('/(tabs)/letters')} style={{ position: 'absolute', top: y(0.23), left: px(W, 0.03), width: px(W, 0.58), transform: [{ rotate: '-2deg' }] }}><View style={styles.sectionTitleRow}><Ionicons name="mail-outline" size={16} color={J.textMain} /><Text style={styles.sectionTitle}>Lettres Reçues</Text></View>{recentLetters.length > 0 ? <View style={styles.lettersContainer}>{recentLetters.map((letter, idx) => { const senderName = matchPartners[letter.fromUserId]?.pseudo || letter.fromUserId; return <View key={`${letter.id}-${idx}`} style={styles.letterItem}><Ionicons name="mail-outline" size={13} color={J.textSecondary} style={{ marginRight: 5 }} /><Text style={styles.letterSenderName} numberOfLines={1}>{senderName}</Text></View>; })}</View> : <Text style={styles.emptyLetters}>Aucune lettre</Text>}</Paper>
      <Paper onPress={() => router.push('/(tabs)/profiles?filter=received-smiles')} style={{ position: 'absolute', top: y(0.28), right: px(W, 0.05), width: px(W, 0.22), transform: [{ rotate: '-2deg' }] }}><Text style={styles.smilesTitle}>Sourires</Text><Text style={styles.smilesCount}>{matches?.filter((m) => m.initiatorId !== currentUser.id).length ?? 0}</Text></Paper>
      <View style={[styles.postcardWrap, { position: 'absolute', top: y(0.48), left: px(W, 0.05), width: bouteilleW, height: bouteilleH }]}>
        <View style={styles.magnet} pointerEvents="none" />
        <TouchableOpacity onPress={() => router.push('/bottles-main')} activeOpacity={0.78} style={styles.postcardTouchable}>
          <View style={styles.postcardPaper}>
            <Image source={require('../../assets/images/bottle/beach.png')} style={styles.postcardImage} resizeMode="cover" />
            <Svg viewBox="0 0 900 600" preserveAspectRatio="none" style={styles.postcardFrame} pointerEvents="none">
              <Path d={POSTCARD_FRAME_PATH} fill="#F4E7CE" fillRule="evenodd" stroke="#E3D0A7" strokeWidth={2} />
              <Circle cx={783} cy={514} r={37} stroke="#5D4739" strokeWidth={4} fill="#F4E7CE" fillOpacity={0.65} />
              <Circle cx={783} cy={514} r={29} stroke="#5D4739" strokeWidth={2} fill="none" strokeDasharray="2 10" />
              <Path d="M 783 531 C 760 514 761 497 774 497 C 779 497 782 500 783 504 C 784 500 788 497 793 497 C 807 497 805 514 783 531 Z" fill="#FFF9EA" stroke="#5D4739" strokeWidth={2} />
              <Path d="M 663 496 Q 685 488 708 496 T 752 496 M 663 508 Q 685 500 708 508 T 752 508 M 663 520 Q 685 512 708 520 T 752 520 M 663 532 Q 685 524 708 532 T 752 532" stroke="#5D4739" strokeWidth={3} fill="none" strokeLinecap="round" />
            </Svg>
            {hasBottle && <View style={styles.bottleWrapper} pointerEvents="none"><Image source={require('../../assets/images/bottle-message.png')} style={{ width: bottleImgW, height: bottleImgH, resizeMode: 'contain' }} /></View>}
          </View>
        </TouchableOpacity>
      </View>
      <Paper onPress={() => router.push('/offerings')} style={{ position: 'absolute', top: y(0.5), right: px(W, 0.06), width: px(W, 0.4), transform: [{ rotate: '-2deg' }] }}><Text style={styles.giftsTitle}>Offrandes Reçues</Text>{offerings.length > 0 ? <View style={styles.offeringsContainer}>{offerings.slice(0, 3).map((offering, idx) => { const pngUriMap: Record<string, any> = { biere: require('../../public/offerings/off_biere_stage1.png'), bonbons: require('../../public/offerings/off_bonbons_stage1.png'), fraises: require('../../public/offerings/off_fraises_stage1.png') }; const pngAsset = pngUriMap[offering.offering.id]; return <View key={`${offering.id}-${idx}`} style={styles.offeringItem}>{pngAsset ? <Image source={pngAsset} style={styles.offeringPNG} /> : <Text style={styles.offeringName} numberOfLines={1}>{offering.offering.name}</Text>}</View>; })}{offerings.length > 3 && <Text style={styles.moreIndicator}>+{offerings.length - 3}</Text>}</View> : <><Text style={styles.giftItem}>Bouquet</Text><Text style={styles.giftItem}>Grand Cru</Text><Text style={styles.giftItem}>Photo</Text></>}</Paper>
      <Paper onPress={() => router.push(currentSalonSlug ? `/salon/${currentSalonSlug}` : '/(tabs)/salons-list')} style={{ position: 'absolute', top: y(0.78), left: px(W, 0.11), width: px(W, 0.36), transform: [{ rotate: '-3deg' }] }}><Text style={styles.salonTitle}>Mon Salon</Text>{currentSalonIcon ? <Image source={currentSalonIcon} style={styles.salonIconImage} resizeMode="contain" /> : null}{salonName && <Text style={styles.salonName} numberOfLines={1}>{salonName}</Text>}</Paper>
      <Paper onPress={() => router.push('/coins')} style={{ position: 'absolute', top: y(0.78), right: px(W, 0.09), width: px(W, 0.33), transform: [{ rotate: '2deg' }] }}><Text style={styles.statsTitle}>Pièces & Stats</Text><View style={styles.statCoinRow}><CoinIcon size={14} /><Text style={styles.statValue}>{coins ?? 0}</Text></View><Text style={styles.statValue}>{points ?? 0} pts</Text><Text style={styles.statValue}>{matches?.length ?? 0} matchs</Text></Paper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: J.bgBoard }, loadingText: { color: APP_COLORS.muted, textAlign: 'center', marginTop: 50 }, board: { flex: 1, position: 'relative', width: '100%', overflow: 'hidden', backgroundColor: J.bgBoard }, backgroundLayer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' }, woodBackground: { width: '100%', height: '100%' }, paperWrap: { borderRadius: APP_RADIUS.sm, shadowColor: '#2F2118', shadowOpacity: 0.14, shadowRadius: 5, shadowOffset: { width: 2, height: 4 }, elevation: 4 }, paper: { width: '100%', backgroundColor: APP_COLORS.paper, borderRadius: APP_RADIUS.sm, borderWidth: 1, borderColor: APP_COLORS.border, padding: APP_SPACING.sm, alignItems: 'center' }, magnet: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: '#666', top: -7, left: '50%', marginLeft: -7, zIndex: 10 },
  settingsButton: { position: 'absolute', width: 36, height: 36, alignItems: 'center', justifyContent: 'center', zIndex: 30 },
  profileName: { fontSize: 14, fontWeight: '700', color: J.textMain, marginTop: 2 }, animalTitle: { fontSize: 13, fontWeight: '700', color: J.textMain, marginBottom: 4 }, animalImage: { width: 54, height: 54, resizeMode: 'contain' }, animalIcon: { fontSize: 30, marginVertical: 4 }, animalName: { fontSize: 13, color: J.textMain }, animalStatus: { fontSize: 10, color: J.accentPrimary, fontWeight: '600', textAlign: 'center', marginTop: 3 }, sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, sectionTitle: { fontSize: 14, fontWeight: '700', color: J.textMain }, lettersContainer: { marginTop: 5, width: '100%' }, letterItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 2 },  letterSenderName: { fontSize: 11, color: J.textSecondary, maxWidth: '75%' }, emptyLetters: { fontSize: 12, color: J.textSecondary, marginTop: 7 }, smilesTitle: { fontSize: 12, fontWeight: '700', color: J.textMain }, smilesCount: { fontSize: 25, fontWeight: '700', color: J.accentPrimary, marginTop: 5 }, postcardWrap: { shadowColor: '#2F2118', shadowOpacity: 0.22, shadowRadius: 6, shadowOffset: { width: 2, height: 5 }, elevation: 5, transform: [{ rotate: '-2deg' }] }, postcardTouchable: { flex: 1, overflow: 'visible' }, postcardPaper: { flex: 1, position: 'relative', overflow: 'visible' }, postcardImage: { position: 'absolute', left: '3.5%', right: '3.5%', top: '5%', bottom: '5%', width: '93%', height: '90%' }, postcardFrame: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', zIndex: 3 }, bottleWrapper: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 5 }, giftsTitle: { fontSize: 14, fontWeight: '700', color: J.textMain, marginBottom: 5 }, giftItem: { fontSize: 11, color: J.textMain, marginTop: 4 }, offeringsContainer: { width: '100%', alignItems: 'center' }, offeringItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 2, minHeight: 20 }, offeringPNG: { width: 28, height: 28, resizeMode: 'contain' }, offeringName: { fontSize: 11, color: J.textMain }, moreIndicator: { fontSize: 10, color: J.textSecondary, marginTop: 2 }, salonTitle: { fontSize: 12, fontWeight: '700', color: J.textMain }, salonIconImage: { width: 32, height: 32, marginVertical: 4 }, salonName: { fontSize: 11, color: J.textSecondary }, statsTitle: { fontSize: 12, fontWeight: '700', color: J.textMain, marginBottom: 5 }, statCoinRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }, statValue: { fontSize: 11, color: J.textMain, marginTop: 2 },
});