import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl, Alert, Image, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { getCurrentBottle, getInbox, acceptBottle, refuseBottle } from '../api/bottles';
import { BottleParchmentCard } from '../components/BottleParchmentCard';
import type { GetCurrentBottleResponse, InboxBottleDTO } from '../api/bottles';
import { useStore } from '../store/useStore';

const CREAM_BG = '#FBF8F3';
const BOTTLE_IMG = require('../../assets/images/bottle/BOTTLE.png');
const COLORS = { text: '#2B2B2B', textSecondary: '#6B6B6B', accent: '#8B2E3C', success: '#2E7D32', error: '#D32F2F' };

const BottleItem: React.FC<{ id: string; index: number; onPress: () => void; position: { left: string; top: string } }> = ({ id, index, onPress, position }) => {
  const floatAnim = useMemo(() => new Animated.Value(0), []);
  useEffect(() => { Animated.loop(Animated.sequence([Animated.timing(floatAnim, { toValue: 1, duration: 3000 + index * 200, easing: Easing.inOut(Easing.sine), useNativeDriver: true }), Animated.timing(floatAnim, { toValue: 0, duration: 3000 + index * 200, easing: Easing.inOut(Easing.sine), useNativeDriver: true })])).start(); }, [floatAnim, index]);
  const rotation = useMemo(() => { const rotations = [-12, 8, -6, 14, -9, 11]; return rotations[index % rotations.length]; }, [index]);
  const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  return (<Animated.View style={[styles.bottleItem, position, { transform: [{ rotateZ: `${rotation}deg` }, { translateY: floatY }] }]}>
    <TouchableOpacity onPress={onPress} style={styles.bottleTouchable} activeOpacity={0.7}>
      <Image source={BOTTLE_IMG} style={styles.bottleImage} resizeMode="contain" />
    </TouchableOpacity>
  </Animated.View>);
};

export default function BottleMainScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUser = useStore((s) => s.currentUser);
  const [state, setState] = useState<GetCurrentBottleResponse | null>(null);
  const [inbox, setInbox] = useState<InboxBottleDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBottleId, setSelectedBottleId] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    try {
      setError(null);
      const [current, inboxData] = await Promise.all([getCurrentBottle(), getInbox()]);
      setState(current);
      setInbox(inboxData);
      setSelectedBottleId(null);
    } catch (err: any) {
      console.error('[BottleMainScreen] Error:', err);
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

  useFocusEffect(useCallback(() => {
    setIsLoading(true);
    loadState();
  }, [loadState]));

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadState();
  };

  const getBottleToDisplay = () => {
    if (!currentUser?.id) return null;
    const receivedPending = inbox.find((b) => b.status === 'FLOATING' && b.acceptedById === null && b.senderId !== currentUser.id);
    if (receivedPending) return { type: 'received', bottle: receivedPending };
    if (state?.bottle && (state.bottle.status === 'ACCEPTED' || state.bottle.status === 'REVEALED')) return { type: 'correspondence', bottle: state.bottle, latestLetter: state.latestLetter };
    const sentFloating = inbox.find((b) => b.status === 'FLOATING' && b.senderId === currentUser.id);
    if (sentFloating) return { type: 'sent', bottle: sentFloating };
    if (state?.canCreateBottle) return { type: 'create', bottle: null };
    return { type: 'quota', bottle: null };
  };

  const displayState = getBottleToDisplay();

  const handleAccept = async () => {
    const bottleToAccept = selectedBottleId ? getAvailableBottles().find((b) => b.id === selectedBottleId) : displayState?.bottle;
    if (!bottleToAccept) return;
    setIsAccepting(true);
    try {
      await acceptBottle(bottleToAccept.id);
      await loadState();
      Alert.alert('Succès', 'Bouteille acceptée!');
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible d\'accepter');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRefuse = async () => {
    const bottleToRefuse = selectedBottleId ? getAvailableBottles().find((b) => b.id === selectedBottleId) : displayState?.bottle;
    if (!bottleToRefuse) return;
    Alert.alert('Refuser cette bouteille?', 'Vous ne pourrez plus revenir sur cette lettre.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Refuser', style: 'destructive', onPress: async () => { try { await refuseBottle(bottleToRefuse.id); await loadState(); Alert.alert('Succès', 'Bouteille refusée'); } catch (err: any) { Alert.alert('Erreur', err?.message || 'Impossible de refuser'); } } },
    ]);
  };

  if (isLoading) return (<View style={[styles.bg, { backgroundColor: CREAM_BG, paddingTop: insets.top }]}><ActivityIndicator size="large" color={COLORS.accent} /></View>);

  if (displayState?.type === 'received') {
    const availableBottles = getAvailableBottles();
    const selectedBottle = selectedBottleId ? availableBottles.find((b) => b.id === selectedBottleId) : null;
    return (<View style={[styles.bg, { backgroundColor: CREAM_BG }]}><View style={[styles.container, { paddingTop: insets.top }]}><ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />}>
      {!selectedBottle ? (<><View style={styles.paddedSection}><Text style={styles.selectionTitle}>Choisissez une bouteille</Text><Text style={styles.selectionSubtitle}>Découvrez des messages anonymes</Text></View><View style={styles.bottlesContainer}>{availableBottles.map((bottle, index) => (<BottleItem key={bottle.id} id={bottle.id} index={index} position={bottlePositions[index % bottlePositions.length]} onPress={() => setSelectedBottleId(bottle.id)} />))}</View></>) : (<><View style={styles.paddedSection}><TouchableOpacity style={styles.backSelection} onPress={() => setSelectedBottleId(null)}><Text style={styles.backSelectionText}>← Choisir une autre</Text></TouchableOpacity></View><BottleParchmentCard content={selectedBottle.message || ''} /><View style={styles.paddedSection}><View style={styles.actionBox}><TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]} onPress={handleAccept} disabled={isAccepting}><Text style={styles.actionBtnText}>{isAccepting ? 'Acceptation...' : '✓ Accepter'}</Text></TouchableOpacity><TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.error }]} onPress={handleRefuse}><Text style={styles.actionBtnText}>✗ Refuser</Text></TouchableOpacity></View></View></>)}
    </ScrollView></View></View>);
  }

  if (displayState?.type === 'correspondence' && displayState.latestLetter) {
    return (<View style={[styles.bg, { backgroundColor: CREAM_BG }]}><View style={[styles.container, { paddingTop: insets.top }]}><ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />}>
      <BottleParchmentCard content={state.latestLetter!.content} />
      <View style={styles.paddedSection}>
        {state.canReply && (<TouchableOpacity style={styles.replyBtn} onPress={() => router.push({ pathname: '/bottles-discussion', params: { bottleId: state.bottle!.id } })}><Text style={styles.replyBtnText}>Écrire une réponse</Text></TouchableOpacity>)}
        {state.waitingForReply && (<View style={styles.waitingBox}><Text style={styles.waitingText}>✈️ Votre lettre est en voyage...</Text></View>)}
        <TouchableOpacity style={styles.historyBtn} onPress={() => router.push({ pathname: '/bottles-history', params: { bottleId: state.bottle!.id } })}><Text style={styles.historyBtnText}>Relire notre correspondance</Text></TouchableOpacity>
      </View>
    </ScrollView></View></View>);
  }

  if (displayState?.type === 'sent') {
    const bottle = displayState.bottle;
    return (<View style={[styles.bg, { backgroundColor: CREAM_BG }]}><View style={[styles.container, { paddingTop: insets.top }]}><ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />}>
      <BottleParchmentCard content={bottle?.message || ''} />
      <View style={styles.paddedSection}><View style={styles.infoBox}><Text style={styles.infoText}>Revenez bientôt pour voir si quelqu'un a répondu à votre lettre.</Text></View></View>
    </ScrollView></View></View>);
  }

  if (displayState?.type === 'create') {
    return (<View style={[styles.bg, { backgroundColor: CREAM_BG }]}><View style={[styles.container, { paddingTop: insets.top }]}><ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.paddedSection}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🌊</Text>
          <Text style={styles.emptyTitle}>Lancez une bouteille</Text>
          <Text style={styles.emptySubtext}>Écrivez une lettre et laissez-la naviguer vers quelqu'un de spécial.</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/bottles-create')}><Text style={styles.createBtnText}>Créer une nouvelle bouteille</Text></TouchableOpacity>
      </View>
    </ScrollView></View></View>);
  }

  return (<View style={[styles.bg, { backgroundColor: CREAM_BG }]}><View style={[styles.container, { paddingTop: insets.top }]}><ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />}>
    <View style={styles.paddedSection}>
      {error && (<View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>)}
      <View style={styles.quotaBox}>
        <Text style={styles.quotaEmoji}>⏳</Text>
        <Text style={styles.quotaTitle}>Patientez un instant</Text>
        <Text style={styles.quotaText}>Vous avez atteint le nombre maximum de bouteilles en attente.</Text>
        <Text style={styles.quotaSubtext}>Revenez quand une sera acceptée, refusée ou aura expiré.</Text>
      </View>
    </View>
  </ScrollView></View></View>);
}

const styles = StyleSheet.create({
  bg: { flex: 1 }, container: { flex: 1 }, scroll: { flex: 1 }, content: { paddingHorizontal: 0, paddingVertical: 0 }, paddedSection: { paddingHorizontal: 16 },
  replyBtn: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8, backgroundColor: COLORS.accent, marginBottom: 12 }, replyBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF', textAlign: 'center' },
  waitingBox: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#FFF3E0', borderLeftWidth: 4, borderLeftColor: '#FF9800', marginBottom: 12 }, waitingText: { fontSize: 14, color: '#E65100', fontWeight: '600', textAlign: 'center' },
  historyBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: COLORS.accent }, historyBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.accent, textAlign: 'center' },
  floatingBox: { paddingVertical: 20, paddingHorizontal: 16, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)', marginBottom: 16, alignItems: 'center' }, floatingEmoji: { fontSize: 48, marginBottom: 8 }, floatingTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 }, floatingText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  receivedBox: { paddingVertical: 20, paddingHorizontal: 16, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)', marginBottom: 16, alignItems: 'center' }, receivedEmoji: { fontSize: 48, marginBottom: 8 }, receivedTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 }, receivedText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  actionBox: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  acceptBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: COLORS.success, justifyContent: 'center' }, acceptBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF', textAlign: 'center' },
  refuseBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: COLORS.error, justifyContent: 'center' }, refuseBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.error, textAlign: 'center' },
  btnDisabled: { opacity: 0.6 },
  emptyState: { paddingVertical: 48, alignItems: 'center', marginBottom: 24 }, emptyEmoji: { fontSize: 64, marginBottom: 16 }, emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 }, emptySubtext: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  createBtn: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8, backgroundColor: COLORS.accent, marginTop: 16 }, createBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF', textAlign: 'center' },
  quotaBox: { paddingVertical: 24, paddingHorizontal: 16, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)', marginBottom: 20, alignItems: 'center' }, quotaEmoji: { fontSize: 48, marginBottom: 12 }, quotaTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 }, quotaText: { fontSize: 14, color: COLORS.text, textAlign: 'center', marginBottom: 8 }, quotaSubtext: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },
  infoBox: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#E8F5E9', borderLeftWidth: 4, borderLeftColor: COLORS.success }, infoText: { fontSize: 13, color: COLORS.success, fontWeight: '600' },
  errorBox: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#FDECEA', borderLeftWidth: 4, borderLeftColor: COLORS.error, marginBottom: 16 }, errorText: { fontSize: 13, color: COLORS.error, fontWeight: '600' },
  selectionTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginBottom: 8, textAlign: 'center' }, selectionSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 40, fontStyle: 'italic' },
  bottlesContainer: { position: 'relative', height: 600, marginBottom: 40, paddingHorizontal: 16 },
  bottleItem: { position: 'absolute', width: 90, height: 130, shadowColor: '#000', shadowOffset: { width: 2, height: 6 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 }, bottleTouchable: { width: '100%', height: '100%' }, bottleImage: { width: '100%', height: '100%' },
  backSelection: { marginBottom: 16 }, backSelectionText: { fontSize: 16, color: COLORS.accent, fontWeight: '600' },
  actionBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center' }, actionBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF', textAlign: 'center' },
});
