import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { getCurrentBottle, getInbox, acceptBottle } from '../api/bottles';
import { BottleParchmentCard } from '../components/BottleParchmentCard';
import { BottleCorrespondenceMenu } from '../components/BottleCorrespondenceMenu';
import type { GetCurrentBottleResponse, InboxBottleDTO } from '../api/bottles';
import { useStore } from '../store/useStore';

const CREAM_BG = '#FBF8F3';
const BOTTLE_IMG = require('../../assets/images/bottle/BOTTLE-22.png');
const OCEAN_BG = require('../../assets/images/ocean.png');
const COLORS = { text: '#2B2B2B', textSecondary: '#6B6B6B', accent: '#8B2E3C', success: '#2E7D32', error: '#D32F2F' };

const BottleItem: React.FC<{ id: string; index: number; onPress: () => void; position: { left: string; top: string }; isAccepting: boolean }> = ({ index, onPress, position, isAccepting }) => {
  const rotation = useMemo(() => [-12, 8, -6, 14, -9, 11][index % 6], [index]);
  const animDelay = useMemo(() => index * 200, [index]);
  return (
    <View style={[styles.bottleItem, position, { transform: [{ rotate: `${rotation}deg` }], animation: `float 3.5s ease-in-out infinite ${animDelay}ms` } as any]}>
      <TouchableOpacity onPress={onPress} style={styles.bottleTouchable} activeOpacity={0.7} disabled={isAccepting}>
        {isAccepting ? <ActivityIndicator size="small" color={COLORS.accent} /> : <Image source={BOTTLE_IMG} style={styles.bottleImage} resizeMode="contain" />}
      </TouchableOpacity>
    </View>
  );
};

export default function BottleMainScreen() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.textContent = '@keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-16px); } }';
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUser = useStore((s) => s.currentUser);
  const [state, setState] = useState<GetCurrentBottleResponse | null>(null);
  const [inbox, setInbox] = useState<InboxBottleDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const loadState = useCallback(async () => {
    try {
      setError(null);
      const [current, inboxData] = await Promise.all([getCurrentBottle(), getInbox()]);
      setState(current);
      setInbox(inboxData);
    } catch (err: any) {
      setError(err?.message || 'Erreur de chargement');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const getAvailableBottles = () => {
    if (!currentUser?.id) return [];
    return inbox.filter((b) => b.status === 'FLOATING' && b.acceptedById === null && b.senderId !== currentUser.id);
  };

  const bottlePositions = useMemo(() => [
    { left: '10%', top: '80px' },
    { left: '65%', top: '160px' },
    { left: '30%', top: '280px' },
    { left: '70%', top: '380px' },
    { left: '15%', top: '460px' },
    { left: '55%', top: '520px' },
  ], []);

  useFocusEffect(useCallback(() => { setIsLoading(true); loadState(); }, [loadState]));
  useFocusEffect(useCallback(() => { setShowMenu(false); }, []));

  const handleRefresh = () => { setIsRefreshing(true); loadState(); };

  const handleBottleClick = async (bottleId: string) => {
    setIsAccepting(true);
    try {
      await acceptBottle(bottleId);
      await loadState();
    } catch (err: any) {
      const code = err.code || err.message;
      if (code === 409 || code === 'P2002') {
        setError("Cette bouteille vient d'être récupérée. Choisissez-en une autre.");
        await loadState();
      } else {
        Alert.alert('Erreur', err?.message || "Impossible d'accepter la bouteille");
      }
    } finally {
      setIsAccepting(false);
    }
  };

  const getBottleToDisplay = () => {
    if (!currentUser?.id) return null;
    const availableBottles = getAvailableBottles();
    if (availableBottles.length > 0) return { type: 'received', bottles: availableBottles } as const;
    if (state?.bottle && (state.bottle.status === 'ACCEPTED' || state.bottle.status === 'REVEALED')) return { type: 'correspondence', bottle: state.bottle, latestLetter: state.latestLetter } as const;
    const sentFloating = inbox.find((b) => b.status === 'FLOATING' && b.senderId === currentUser.id);
    if (sentFloating) return { type: 'sent', bottle: sentFloating } as const;
    if (state?.canCreateBottle) return { type: 'create' } as const;
    return { type: 'quota' } as const;
  };

  const displayState = getBottleToDisplay();

  if (isLoading) return <View style={[styles.bg, styles.center, { backgroundColor: CREAM_BG, paddingTop: insets.top }]}><ActivityIndicator size="large" color={COLORS.accent} /></View>;

  if (displayState?.type === 'received') {
    const availableBottles = [...getAvailableBottles()].sort(() => Math.random() - 0.5).slice(0, 10);
    return (
      <View style={[styles.bg, { backgroundColor: CREAM_BG }]}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />}>
            {error && <View style={styles.paddedSection}><View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View></View>}
            <View style={styles.paddedSection}>
              <Text style={styles.selectionTitle}>Choisissez une bouteille</Text>
              <Text style={styles.selectionSubtitle}>Découvrez des messages anonymes</Text>
            </View>
            <View style={styles.bottlesContainer}>
              <Image source={OCEAN_BG} style={StyleSheet.absoluteFill} resizeMode="cover" />
              {availableBottles.map((bottle, index) => (
                <BottleItem key={bottle.id} id={bottle.id} index={index} position={bottlePositions[index % bottlePositions.length]} onPress={() => handleBottleClick(bottle.id)} isAccepting={isAccepting} />
              ))}
            </View>
            <View style={styles.paddedSection}>
              {state?.canCreateBottle && <TouchableOpacity style={styles.createAlternativeBtn} onPress={() => router.push('/bottles-create')}><Text style={styles.createAlternativeBtnText}>Ou créer une nouvelle bouteille</Text></TouchableOpacity>}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  if (displayState?.type === 'correspondence' && displayState.latestLetter && state?.bottle) {
    return (
      <View style={[styles.bg, { backgroundColor: CREAM_BG }]}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={styles.backText}>← Retour</Text></TouchableOpacity>
            <View style={styles.headerTitle}><Text style={styles.headerTitleText}>Lettre en transit</Text></View>
            <TouchableOpacity onPress={() => setShowMenu(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={styles.menuDots}>⋯</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />}>
            <BottleParchmentCard content={state.latestLetter.content} />
            <View style={styles.paddedSection}>
              {state.canReply && <TouchableOpacity style={styles.replyBtn} onPress={() => router.push({ pathname: '/bottles-discussion', params: { bottleId: state.bottle!.id } })}><Text style={styles.replyBtnText}>Écrire une réponse</Text></TouchableOpacity>}
              {state.waitingForReply && <View style={styles.waitingBox}><Text style={styles.waitingText}>✈️ Votre lettre est en voyage...</Text></View>}
              <TouchableOpacity style={styles.historyBtn} onPress={() => router.push({ pathname: '/bottles-history', params: { bottleId: state.bottle!.id } })}><Text style={styles.historyBtnText}>Relire notre correspondance</Text></TouchableOpacity>
            </View>
          </ScrollView>
          <BottleCorrespondenceMenu visible={showMenu} bottleId={state.bottle.id} canBreak={state.canBreak} onClose={() => setShowMenu(false)} onRefresh={loadState} onBroken={() => router.back()} />
        </View>
      </View>
    );
  }

  if (displayState?.type === 'sent') {
    return (
      <View style={[styles.bg, { backgroundColor: CREAM_BG }]}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />}>
            <BottleParchmentCard content={displayState.bottle?.message || ''} />
            <View style={styles.paddedSection}><View style={styles.infoBox}><Text style={styles.infoText}>Revenez bientôt pour voir si quelqu'un a répondu à votre lettre.</Text></View></View>
          </ScrollView>
        </View>
      </View>
    );
  }

  if (displayState?.type === 'create') {
    return (
      <View style={[styles.bg, { backgroundColor: CREAM_BG }]}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <TouchableOpacity style={styles.landingBackButton} onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}><Text style={styles.backText}>← Retour</Text></TouchableOpacity>
          <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
            <View style={styles.paddedSection}>
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🌊</Text>
                <Text style={styles.emptyTitle}>Lancez une bouteille</Text>
                <Text style={styles.emptySubtext}>Écrivez une lettre et laissez-la naviguer vers quelqu'un de spécial.</Text>
              </View>
              <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/bottles-create')}><Text style={styles.createBtnText}>Créer une nouvelle bouteille</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.bg, { backgroundColor: CREAM_BG }]}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />}>
          <View style={styles.paddedSection}>
            {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
            <View style={styles.quotaBox}>
              <Text style={styles.quotaEmoji}>⏳</Text>
              <Text style={styles.quotaTitle}>Patientez un instant</Text>
              <Text style={styles.quotaText}>Vous avez atteint le nombre maximum de bouteilles en attente.</Text>
              <Text style={styles.quotaSubtext}>Revenez quand une sera acceptée, refusée ou aura expiré.</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 0, paddingVertical: 0 },
  paddedSection: { paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  backText: { fontSize: 15, color: COLORS.accent, fontWeight: '700' },
  landingBackButton: { position: 'absolute', top: 8, left: 16, zIndex: 20, minHeight: 44, justifyContent: 'center' },
  headerTitle: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitleText: { fontSize: 15, fontWeight: '700', color: '#4A3A28' },
  menuDots: { fontSize: 24, color: COLORS.accent, fontWeight: '600' },
  replyBtn: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8, backgroundColor: COLORS.accent, marginBottom: 12 },
  replyBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF', textAlign: 'center' },
  waitingBox: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#FFF3E0', borderLeftWidth: 4, borderLeftColor: '#FF9800', marginBottom: 12 },
  waitingText: { fontSize: 14, color: '#E65100', fontWeight: '600', textAlign: 'center' },
  historyBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: COLORS.accent },
  historyBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.accent, textAlign: 'center' },
  emptyState: { paddingVertical: 48, alignItems: 'center', marginBottom: 24 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  createBtn: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8, backgroundColor: COLORS.accent, marginTop: 16 },
  createBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF', textAlign: 'center' },
  infoBox: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#E8F5E9', borderLeftWidth: 4, borderLeftColor: COLORS.success },
  infoText: { fontSize: 13, color: COLORS.success, fontWeight: '600' },
  errorBox: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#FDECEA', borderLeftWidth: 4, borderLeftColor: COLORS.error, marginBottom: 16 },
  errorText: { fontSize: 13, color: COLORS.error, fontWeight: '600' },
  selectionTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  selectionSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 40, fontStyle: 'italic' },
  bottlesContainer: { position: 'relative', height: 600, marginBottom: 40, paddingHorizontal: 16 },
  bottleItem: { position: 'absolute', width: 110, height: 160 },
  bottleTouchable: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  bottleImage: { width: '100%', height: '100%' },
  createAlternativeBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: 'rgba(139,46,60,0.1)', borderWidth: 1, borderColor: COLORS.accent, marginTop: 20 },
  createAlternativeBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.accent, textAlign: 'center' },
  quotaBox: { paddingVertical: 24, paddingHorizontal: 16, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)', marginBottom: 20, alignItems: 'center' },
  quotaEmoji: { fontSize: 48, marginBottom: 12 },
  quotaTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  quotaText: { fontSize: 14, color: COLORS.text, textAlign: 'center', marginBottom: 8 },
  quotaSubtext: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },
});
