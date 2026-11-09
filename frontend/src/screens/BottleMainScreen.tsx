import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl, Alert, Image, Platform, useWindowDimensions, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModalKeyboardFrame } from '../components/ModalKeyboardFrame';
import { footerBottomPadding } from '../utils/composerFooter';
import { useRouter, useFocusEffect } from 'expo-router';
import { getCurrentBottle, getInbox, claimBottleWithReply, getSentBottles } from '../api/bottles';
import { BottleParchmentCard } from '../components/BottleParchmentCard';
import { BottleCorrespondenceMenu } from '../components/BottleCorrespondenceMenu';
import { AppBackButton } from '../components/AppBackButton';
import type { GetCurrentBottleResponse, InboxBottleDTO, SentBottleDTO } from '../api/bottles';
import { useStore } from '../store/useStore';
import { generateUUID } from '../utils/uuid';

const CREAM_BG = '#F6F0E4';
const BOTTLE_IMG = require('../../assets/images/bottle/BOTTLE-22.png');
// Parchemin rose en hauteur pour « Bouteille envoyée » (page pleine, Android).
const SENT_PARCHMENT_TALL = require('../../assets/images/bottle/bottle-letter-sent-full.png');
const TARGET_LABELS: Record<string, string> = { HOMME: 'Homme', FEMME: 'Femme', LES_DEUX: 'Les deux', AUTRE: 'Autre' };
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const OCEAN_BG = require('../../assets/images/ocean.png');
// Parchemin de la lettre dans la fenêtre « Une bouteille à la mer » (même papier que la lecture « Lettre en transit »).
const FIRST_REPLY_PARCHMENT = require('../../assets/images/bottle/bottle-letter-received.png');
const SEA_BG = require('../../assets/images/bottle/sea-bg.jpg');
const UI_ICONS = {
  transit: require('../../assets/ui-icons/transit.png'),
  book: require('../../assets/ui-icons/book.png'),
  bottle: require('../../assets/ui-icons/bottle.png'),
} as const;
const COLORS = { text: '#2C1A0E', textSecondary: '#7A5C3A', accent: '#8B2E3C', border: '#D4B896', paper: '#FEFAF0', success: '#466B4E', error: '#A43A3A' };

const BottleItem: React.FC<{ id: string; index: number; onPress: () => void; position: { left: string; top: string }; isAccepting: boolean }> = ({ index, onPress, position, isAccepting }) => {
  // Même inclinaison pour toutes les bouteilles (choix du propriétaire : celle de la 1re, −12°).
  // Auparavant [-12, 8, -6, 14, -9, 11] : les angles positifs remettaient le dessin presque à plat.
  const rotation = -12;
  const animDelay = useMemo(() => index * 200, [index]);
  return (
    <View style={[styles.bottleItem, position, { transform: [{ rotate: `${rotation}deg` }], animation: `float 3.5s ease-in-out infinite ${animDelay}ms` } as any]}>
      <TouchableOpacity onPress={onPress} style={styles.bottleTouchable} activeOpacity={0.7} disabled={isAccepting}>
        {isAccepting ? <ActivityIndicator size="small" color={COLORS.accent} /> : <Image source={BOTTLE_IMG} style={styles.bottleImage} resizeMode="contain" />}
      </TouchableOpacity>
    </View>
  );
};


const BottleHeader: React.FC<{
  title: string;
  onBack: () => void;
  onMenu?: () => void;
}> = ({ title, onBack, onMenu }) => (
  <View style={styles.header}>
    <AppBackButton onPress={onBack} />
    <View style={styles.headerTitle}>
      <Text style={styles.headerTitleText} numberOfLines={1}>{title}</Text>
    </View>
    {onMenu ? (
      <TouchableOpacity
        style={styles.menuButton}
        onPress={onMenu}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.menuDots}>⋯</Text>
      </TouchableOpacity>
    ) : (
      <View style={styles.headerSpacer} />
    )}
  </View>
);

export default function BottleMainScreen() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.textContent = '@keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-16px); } }';
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const [showRetrieve, setShowRetrieve] = useState(false);
  const insets = useSafeAreaInsets();
  const currentUser = useStore((s) => s.currentUser);
  const [state, setState] = useState<GetCurrentBottleResponse | null>(null);
  const [inbox, setInbox] = useState<InboxBottleDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedBottle, setSelectedBottle] = useState<InboxBottleDTO | null>(null);
  const [firstReply, setFirstReply] = useState('');
  const [replyKey, setReplyKey] = useState(generateUUID());
  // « Bouteille envoyée » : date d'envoi, critères et date de fin de dérive de MA
  // bouteille en mer (GET /bottles/sent, déjà existant ; aucune donnée d'autrui).
  const [sentInfo, setSentInfo] = useState<SentBottleDTO | null>(null);
  const mySentFloatingId = useMemo(
    () => inbox.find((b) => b.status === 'FLOATING' && !!currentUser?.id && b.senderId === currentUser.id)?.id ?? null,
    [inbox, currentUser?.id],
  );
  useEffect(() => {
    if (!mySentFloatingId) { setSentInfo(null); return; }
    let active = true;
    getSentBottles()
      .then((list) => { if (active) setSentInfo(list.find((b) => b.id === mySentFloatingId) ?? null); })
      .catch(() => { if (active) setSentInfo(null); });
    return () => { active = false; };
  }, [mySentFloatingId]);

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

  // Reading never reserves a bottle. Only the first submitted answer does.
  const handleBottleClick = (bottleId: string) => {
    const bottle = getAvailableBottles().find((item) => item.id === bottleId);
    if (bottle) {
      setFirstReply('');
      setReplyKey(generateUUID());
      setSelectedBottle(bottle);
    }
  };

  const submitFirstReply = async () => {
    if (!selectedBottle || !firstReply.trim() || isAccepting) return;
    setIsAccepting(true);
    try {
      await claimBottleWithReply(selectedBottle.id, firstReply.trim(), replyKey);
      setSelectedBottle(null);
      setShowRetrieve(false);
      setFirstReply('');
      await loadState();
    } catch (err: any) {
      const code = err?.code || err?.message;
      if (code === 'BOTTLE_ALREADY_TAKEN' || code === 409) {
        Alert.alert('Bouteille déjà récupérée', "Une autre personne a répondu en premier. Choisis une autre bouteille.");
        setSelectedBottle(null);
        await loadState();
      } else {
        Alert.alert('Erreur', err?.message || "Impossible d'envoyer ta réponse");
      }
    } finally {
      setIsAccepting(false);
    }
  };

  const firstReplyDialog = (
    <Modal transparent visible={selectedBottle !== null} animationType="fade" onRequestClose={() => setSelectedBottle(null)}>
      <ModalKeyboardFrame>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.firstReplyBackdrop}>
        {/* La carte (~550-610 dp) dépasse la zone visible au-dessus du clavier :
            elle défile. "handled" : un appui sur « Envoyer » agit dès le premier
            toucher, même clavier ouvert. Clavier fermé, rendu identique (centré). */}
        <ScrollView contentContainerStyle={styles.firstReplyScrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.firstReplyCard}>
          <Text style={styles.firstReplyTitle}>Une bouteille à la mer</Text>
          <View style={styles.firstReplyParchment}>
            {/* width/height 100 % obligatoires : sinon <Image> prend la taille du fichier
                (1536×1024) que React Native lui donne par défaut, et déborde de la fenêtre.
                Même règle que BottleParchmentCard (paperImage). */}
            <Image source={FIRST_REPLY_PARCHMENT} style={[StyleSheet.absoluteFill, styles.firstReplyParchmentImage]} resizeMode="stretch" />
            {/* Lettre longue : elle défile à l'intérieur du parchemin (rien n'est coupé). */}
            <ScrollView style={styles.firstReplyParchmentScroll} nestedScrollEnabled><Text style={styles.firstReplyLetter}>{selectedBottle?.message ?? ''}</Text></ScrollView>
          </View>
          <Text style={styles.firstReplyHelp}>Lire n'engage à rien. La correspondance commence uniquement si tu réponds en premier.</Text>
          <TextInput value={firstReply} onChangeText={setFirstReply} multiline maxLength={500} placeholder="Écris ta première réponse…" style={styles.firstReplyInput} />
          <Text style={styles.firstReplyCount}>{firstReply.length}/500</Text>
          <TouchableOpacity style={styles.firstReplySubmit} onPress={() => void submitFirstReply()} disabled={!firstReply.trim() || isAccepting}>
            {isAccepting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.firstReplySubmitText}>Envoyer ma réponse</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedBottle(null)} disabled={isAccepting}><Text style={styles.firstReplyCancel}>Refermer sans répondre</Text></TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </ModalKeyboardFrame>
    </Modal>
  );

  const getBottleToDisplay = () => {
    if (!currentUser?.id) return null;
    const availableBottles = getAvailableBottles();
    // An established exchange takes precedence over other floating bottles.
    if (state?.bottle && (state.bottle.status === 'ACCEPTED' || state.bottle.status === 'REVEALED')) return { type: 'correspondence', bottle: state.bottle, latestLetter: state.latestLetter } as const;
    if (availableBottles.length > 0) return { type: 'received', bottles: availableBottles } as const;
    const sentFloating = inbox.find((b) => b.status === 'FLOATING' && b.senderId === currentUser.id);
    if (sentFloating) return { type: 'sent', bottle: sentFloating } as const;
    if (state?.canCreateBottle) return { type: 'create' } as const;
    return { type: 'quota' } as const;
  };

  const displayState = getBottleToDisplay();

  if (isLoading) return <View style={[styles.bg, styles.center, { backgroundColor: CREAM_BG, paddingTop: insets.top }]}><ActivityIndicator size="large" color={COLORS.accent} /></View>;

  if (displayState?.type === 'received' || showRetrieve) {
    const availableBottles = [...getAvailableBottles()].sort(() => Math.random() - 0.5).slice(0, 10);
    // Android et iOS, au moins une bouteille : page fixe. La mer remplit l'espace entre
    // le titre et le bouton du bas (plus de vide, plus besoin de défiler). Bouteilles
    // inchangées (taille, position, inclinaison). Web et état « aucune bouteille » : inchangés.
    const androidSeaFill = Platform.OS !== 'web' && availableBottles.length > 0;
    return (
      <View style={[styles.bg, { backgroundColor: CREAM_BG }]}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {firstReplyDialog}
          <BottleHeader title="Bouteille à la mer" onBack={() => router.back()} />
          <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, androidSeaFill ? { flexGrow: 1, paddingBottom: footerBottomPadding(Platform.OS, insets.bottom, 0) } : { paddingBottom: insets.bottom + 100 }]} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />}>
            {error && <View style={styles.paddedSection}><View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View></View>}
            <View style={styles.selectionHeader}>
              <Text style={styles.selectionTitle}>Choisissez une bouteille</Text>
              <Text style={styles.selectionSubtitle}>Découvrez des messages anonymes</Text>
            </View>
            {availableBottles.length === 0 ? (
              <View style={styles.emptyBottles}><Image source={OCEAN_BG} style={StyleSheet.absoluteFill} resizeMode="cover" /><View style={styles.emptyBottlesOverlay}><Text style={styles.emptyBottlesTitle}>Aucune bouteille à récupérer pour le moment</Text><Text style={styles.emptyBottlesText}>Les bouteilles proposées dépendent des critères de rencontre et des disponibilités.</Text><TouchableOpacity style={styles.emptyRefreshBtn} onPress={handleRefresh} disabled={isRefreshing}><Text style={styles.emptyRefreshText}>{isRefreshing ? 'Recherche en cours…' : 'Actualiser les bouteilles'}</Text></TouchableOpacity></View></View>
            ) : <View style={[styles.bottlesContainer, androidSeaFill && styles.bottlesContainerFill]}>
              <Image source={OCEAN_BG} style={StyleSheet.absoluteFill} resizeMode="cover" />
              {androidSeaFill && (
                <View style={styles.seaCountChip} pointerEvents="none">
                  <Text style={styles.seaCountChipText}>
                    {availableBottles.length === 1 ? '1 bouteille dérive près de toi' : `${availableBottles.length} bouteilles dérivent près de toi`}
                  </Text>
                </View>
              )}
              {availableBottles.map((bottle, index) => (
                <BottleItem key={bottle.id} id={bottle.id} index={index} position={bottlePositions[index % bottlePositions.length]} onPress={() => handleBottleClick(bottle.id)} isAccepting={isAccepting} />
              ))}
            </View>}
            {androidSeaFill && (
              <View style={styles.paddedSection}>
                <View style={styles.seaTip}>
                  <Text style={styles.seaTipText}><Text style={styles.seaTipStrong}>Touche une bouteille</Text> pour la repêcher et lire son message.</Text>
                </View>
              </View>
            )}
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
          <BottleHeader
            title="Lettre en transit"
            onBack={() => router.back()}
            onMenu={() => setShowMenu(true)}
          />
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              state.waitingForReply ? styles.correspondenceWaitingContent : styles.content,
              { paddingBottom: insets.bottom + 100 },
            ]}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />}
            showsVerticalScrollIndicator={false}
          >
            {state.waitingForReply ? (
              <>
                <View style={styles.correspondenceWaitingIntro}>
                  <Text style={styles.sentEyebrow}>LETTRE ENVOYÉE</Text>
                  <Text style={styles.sentTitle}>Votre réponse est partie</Text>
                  <Text style={styles.sentSubtitle}>
                    Elle poursuit maintenant son voyage. Vous pourrez répondre à nouveau dès qu’une nouvelle lettre arrivera.
                  </Text>
                </View>

                <View style={styles.sentParchmentCard}>
                  <BottleParchmentCard
                    content={state.latestLetter?.content ?? ""}
                    compact
                    variant={state.latestLetter?.isMine ? 'sent' : 'received'}
                    label={state.latestLetter?.isMine ? 'TA LETTRE' : 'LETTRE REÇUE'}
                  />
                </View>

                <View style={styles.sentStatusCard}>
                  <View style={styles.sentStatusIcon}>
                    <Image source={UI_ICONS.transit} style={styles.sentStatusIconImage} resizeMode="contain" />
                  </View>
                  <View style={styles.sentStatusCopy}>
                    <Text style={styles.sentStatusTitle}>En attente de la prochaine lettre</Text>
                    <Text style={styles.sentStatusText}>
                      Revenez plus tard pour poursuivre la correspondance.
                    </Text>
                  </View>
                </View>

                <View style={styles.waitingHistoryWrap}>
                  <TouchableOpacity
                    style={styles.historyBtn}
                    onPress={() => router.push({ pathname: '/bottles-history', params: { bottleId: state.bottle!.id } })}
                  >
                    <View style={styles.historyBtnContent}><Image source={UI_ICONS.book} style={styles.historyBtnIcon} resizeMode="contain"/><Text style={styles.historyBtnText}>Relire notre correspondance</Text></View>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <BottleParchmentCard
                  content={state.latestLetter?.content ?? ''}
                  variant={state.latestLetter?.isMine ? 'sent' : 'received'}
                  label={state.latestLetter?.isMine ? 'TA LETTRE' : 'LETTRE REÇUE'}
                  // Android : lettre longue lisible en entier (défilement dans le parchemin).
                  scrollableContent={Platform.OS === 'android'}
                />
                <View style={styles.paddedSection}>
                  {state.canReply && (
                    <TouchableOpacity
                      style={styles.replyBtn}
                      onPress={() => router.push({ pathname: '/bottles-discussion', params: { bottleId: state.bottle!.id } })}
                    >
                      <Text style={styles.replyBtnText}>Écrire une réponse</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.historyBtn}
                    onPress={() => router.push({ pathname: '/bottles-history', params: { bottleId: state.bottle!.id } })}
                  >
                    <Text style={styles.historyBtnText}>Relire notre correspondance</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
          <BottleHeader title="Lettre en transit" onBack={() => router.back()} />
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.sentContent,
              // Android : page pleine, le parchemin prend la hauteur restante.
              Platform.OS === 'android'
                ? { flexGrow: 1, paddingBottom: footerBottomPadding('android', insets.bottom, 0) }
                : { paddingBottom: insets.bottom + 80 },
            ]}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sentIntro}>
              <Text style={styles.sentEyebrow}>BOUTEILLE ENVOYÉE</Text>
              <Text style={styles.sentTitle}>Votre lettre est à la mer</Text>
              <Text style={styles.sentSubtitle}>
                Elle attend qu’une personne la découvre et décide d’y répondre.
              </Text>
            </View>

            {Platform.OS === 'android' ? (
              <View style={styles.sentParchmentTall}>
                {/* width/height 100 % : sinon <Image> prend la taille du fichier (cf. #167). */}
                <Image source={SENT_PARCHMENT_TALL} style={[StyleSheet.absoluteFill, styles.sentParchmentTallImage]} resizeMode="stretch" />
                <ScrollView style={styles.sentParchmentTallScroll} nestedScrollEnabled>
                  <Text style={styles.sentParchmentTallText}>{displayState.bottle?.message || ''}</Text>
                </ScrollView>
              </View>
            ) : (
              <View style={styles.sentParchmentCard}>
                <BottleParchmentCard
                  content={displayState.bottle?.message || ''}
                  compact
                  variant="sent"
                  label="TA LETTRE"
                />
              </View>
            )}

            {sentInfo && (
              <View style={styles.sentDetails}>
                <Text style={styles.sentDetailsText}>
                  Envoyée le <Text style={styles.sentDetailsStrong}>{shortDate(sentInfo.createdAt)}</Text>
                  {' · '}Pour : <Text style={styles.sentDetailsStrong}>{TARGET_LABELS[sentInfo.targetGender] ?? sentInfo.targetGender}, {sentInfo.ageMin}–{sentInfo.ageMax} ans</Text>
                </Text>
                <Text style={styles.sentDetailsText}>
                  Elle dérive jusqu’au <Text style={styles.sentDetailsStrong}>{shortDate(sentInfo.expiresAt)}</Text>
                </Text>
              </View>
            )}

            <View style={styles.sentStatusCard}>
              <View style={styles.sentStatusIcon}>
                <Image source={UI_ICONS.bottle} style={styles.sentStatusIconImage} resizeMode="contain" />
              </View>
              <View style={styles.sentStatusCopy}>
                <Text style={styles.sentStatusTitle}>En attente d’une réponse</Text>
                <Text style={styles.sentStatusText}>
                  Revenez plus tard pour voir si quelqu’un a récupéré votre bouteille.
                </Text>
              </View>
            </View>

            <Text style={styles.sentHint}>
              Tirez vers le bas pour actualiser l’état de votre bouteille.
            </Text>
          </ScrollView>
        </View>
      </View>
    );
  }

  if (displayState?.type === 'create') {
    return (
      <View style={[styles.bg, { backgroundColor: CREAM_BG }]}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <BottleHeader title="Bouteille à la mer" onBack={() => router.back()} />
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.createContent,
              // Android et iOS : page pleine. Le panneau reste en bas, au-dessus de la barre
              // Android (marge sûre + 8 dp) ou de la barre d'accueil iOS ; l'image prend la
              // hauteur restante. Web : inchangé.
              { paddingBottom: Platform.OS !== 'web' ? footerBottomPadding(Platform.OS, insets.bottom, 0) : insets.bottom + 14, flexGrow: 1 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.createHero,
                Platform.OS !== 'web'
                  ? { flex: 1, height: undefined, minHeight: 180 }
                  : { height: Math.max(180, Math.min(390, screenHeight * 0.40)) },
              ]}
            >
              <Image
                source={SEA_BG}
                style={styles.createHeroImage}
                resizeMode="cover"
              />
              <View style={styles.createHeroVeil} />
            </View>
            <View style={styles.createPaperPanel}>
              <Text style={styles.createTitle}>Lancez une bouteille</Text>
              <View style={styles.createDividerRow}>
                <View style={styles.createDivider} />
                <Text style={styles.createHeart}>♥</Text>
                <View style={styles.createDivider} />
              </View>
              <Text style={styles.createSubtitle}>
                Écrivez une lettre et laissez-la naviguer vers quelqu'un de spécial.
              </Text>
              <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/bottles-create')}>
                <View style={styles.createBtnContent}>
                  <Image source={UI_ICONS.bottle} style={styles.createBtnIcon} resizeMode="contain" />
                  <Text style={styles.createBtnText}>Créer une nouvelle bouteille</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.retrieveBottleBtn}
                onPress={() => setShowRetrieve(true)}
                accessibilityRole="button"
                accessibilityLabel="Récupérer une bouteille à la mer"
              >
                <Text style={styles.retrieveBottleBtnText}>Récupérer une bouteille à la mer</Text>
              </TouchableOpacity>
              <Text style={styles.retrieveBottleHint}>
                {getAvailableBottles().length === 0
                  ? "Aucune bouteille compatible disponible pour le moment. Réessaie plus tard."
                  : "Choisis une bouteille parmi celles disponibles."}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.bg, { backgroundColor: CREAM_BG }]}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <BottleHeader title="Bouteille à la mer" onBack={() => router.back()} />
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
  firstReplyBackdrop: { flex: 1, backgroundColor: 'rgba(25,15,10,0.6)' },
  firstReplyScrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  firstReplyCard: { borderRadius: 20, backgroundColor: COLORS.paper, padding: 20, gap: 12 },
  firstReplyTitle: { fontSize: 21, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  firstReplyLetter: { fontSize: 17, lineHeight: 25, fontStyle: 'italic', color: '#3A281A', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  // Image du parchemin 1536×1024 → ratio 1.5 ; marges pour rester dans le papier, hors des bords déchirés.
  // Pas de padding sur le cadre : avec le moteur de mise en page de React Native, le 100 % de
  // l'image serait calculé SANS le padding (image trop petite). Les marges sont sur la zone de texte.
  firstReplyParchment: { width: '100%', aspectRatio: 1.5 },
  firstReplyParchmentScroll: { flex: 1, marginHorizontal: 30, marginTop: 26, marginBottom: 24 },
  firstReplyParchmentImage: { width: '100%', height: '100%' },
  firstReplyHelp: { fontSize: 13, lineHeight: 19, color: COLORS.textSecondary },
  firstReplyInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, minHeight: 100, maxHeight: 160, padding: 12, color: COLORS.text, textAlignVertical: 'top' },
  firstReplyCount: { textAlign: 'right', color: COLORS.textSecondary, fontSize: 12 },
  firstReplySubmit: { borderRadius: 12, minHeight: 46, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  firstReplySubmitText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  firstReplyCancel: { textAlign: 'center', color: COLORS.textSecondary, padding: 10 },
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 0, paddingVertical: 0 },
  paddedSection: { paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 58, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E7D9C6', backgroundColor: 'rgba(254,250,240,0.94)' },
  headerSpacer: { width: 42, height: 42 },
  headerTitle: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitleText: { fontSize: 17, fontWeight: '700', color: COLORS.text, letterSpacing: 0.2 },
  menuButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139,46,60,0.07)' },
  menuDots: { fontSize: 23, color: COLORS.accent, fontWeight: '700', marginTop: -5 },
  replyBtn: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 14, backgroundColor: COLORS.accent, marginBottom: 12, shadowColor: '#5A3A1A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 7, elevation: 4 },
  replyBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF', textAlign: 'center' },
  waitingBox: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#F4E7D2', borderWidth: 1, borderColor: '#DEC6A5', marginBottom: 12 },
  waitingText: { fontSize: 14, color: '#7A5C3A', fontWeight: '600', textAlign: 'center' },
  historyBtn: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 14, backgroundColor: COLORS.paper, borderWidth: 1.5, borderColor: '#B8956A' },
  historyBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  historyBtnIcon: { width: 22, height: 22 },
  historyBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.accent, textAlign: 'center' },
  createContent: { paddingHorizontal: 0, paddingTop: 0 },
  createHero: {
    height: 390,
    overflow: 'hidden',
    backgroundColor: '#DCC7A8',
  },
  createHeroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web'
      ? ({ objectFit: 'cover', objectPosition: 'center top' } as any)
      : {}),
  },
  createHeroVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245,241,232,0.16)',
  },
  createPaperPanel: {
    marginTop: -22,
    paddingTop: 17,
    paddingHorizontal: 24,
    paddingBottom: 14,
    backgroundColor: '#F8F0DF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderColor: '#D8BF98',
  },
  createTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: 'Georgia',
    fontWeight: '700',
    color: '#2D1B0F',
    textAlign: 'center',
  },
  createDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: 12,
  },
  createDivider: { width: 62, height: 1, backgroundColor: '#C9A777' },
  createHeart: { marginHorizontal: 12, color: '#C9A777', fontSize: 15 },
  createSubtitle: {
    maxWidth: 330,
    alignSelf: 'center',
    fontSize: 17,
    lineHeight: 24,
    color: '#6E543A',
    textAlign: 'center',
    fontFamily: 'Georgia',
  },
  createBtn: {
    minHeight: 58,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    marginTop: 14,
    shadowColor: '#5A3A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 9,
    elevation: 5,
  },
  retrieveBottleBtn: { minHeight: 44, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.accent, backgroundColor: '#FFF9F0', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, marginTop: 8 },
  retrieveBottleBtnText: { fontSize: 15, color: COLORS.accent, fontWeight: '700', textAlign: 'center' },
  retrieveBottleHint: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginTop: 5, lineHeight: 16 },
  emptyBottles: { marginHorizontal: 16, height: 340, borderRadius: 18, overflow: 'hidden', justifyContent: 'center' },
  emptyBottlesOverlay: { margin: 18, padding: 18, borderRadius: 15, backgroundColor: 'rgba(254,250,240,0.94)', alignItems: 'center' },
  emptyBottlesTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  emptyBottlesText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  emptyRefreshBtn: { borderColor: COLORS.accent, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 16 },
  emptyRefreshText: { color: COLORS.accent, fontWeight: '700' },
  createBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  createBtnIcon: { width: 24, height: 24, tintColor: '#FFF9EF' },
  createBtnText: { fontSize: 17, fontWeight: '700', color: '#FFF9EF', textAlign: 'center', fontFamily: 'Georgia' },
  infoBox: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#EEF2EA', borderWidth: 1, borderColor: '#CAD7C7' },
  infoText: { fontSize: 13, color: COLORS.success, fontWeight: '600', lineHeight: 19 },
  sentContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  correspondenceWaitingContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  correspondenceWaitingIntro: {
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 18,
  },
  waitingHistoryWrap: {
    marginTop: 14,
  },
  sentIntro: {
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 18,
  },
  sentEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: COLORS.accent,
    marginBottom: 6,
  },
  sentTitle: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  sentSubtitle: {
    maxWidth: 320,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  sentParchmentCard: {
    marginBottom: 12,
  },
  // Page pleine (Android) : parchemin en hauteur, sans padding sur le cadre (cf. #167).
  sentParchmentTall: { flex: 1, minHeight: 200, marginBottom: 12 },
  sentParchmentTallImage: { width: '100%', height: '100%' },
  sentParchmentTallScroll: { flex: 1, marginHorizontal: 34, marginTop: 40, marginBottom: 36 },
  sentParchmentTallText: { fontSize: 18, lineHeight: 27, fontStyle: 'italic', color: '#3A281A', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  sentDetails: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0D6C6', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12, gap: 2 },
  sentDetailsText: { fontSize: 13, lineHeight: 19, color: COLORS.text },
  sentDetailsStrong: { fontWeight: '700', color: COLORS.accent },
  sentStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#FFF9F0',
    borderWidth: 1,
    borderColor: '#DEC6A5',
  },
  sentStatusIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4E7D2',
    marginRight: 12,
  },
  sentStatusIconText: {
    fontSize: 22,
  },
  sentStatusIconImage: {
    width: 30,
    height: 30,
  },
  sentStatusCopy: {
    flex: 1,
  },
  sentStatusTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 3,
  },
  sentStatusText: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  sentHint: {
    marginTop: 14,
    fontSize: 11.5,
    color: '#9B856D',
    textAlign: 'center',
  },
  errorBox: { paddingVertical: 13, paddingHorizontal: 15, borderRadius: 14, backgroundColor: '#F8E8E5', borderWidth: 1, borderColor: '#E7C0BA', marginBottom: 16 },
  errorText: { fontSize: 13, color: COLORS.error, fontWeight: '600', lineHeight: 19 },
  selectionHeader: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 18, alignItems: 'center' },
  selectionTitle: { fontSize: 25, fontWeight: '800', color: COLORS.text, marginBottom: 6, textAlign: 'center' },
  selectionSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', fontStyle: 'italic' },
  bottlesContainer: { position: 'relative', height: 600, marginHorizontal: 16, marginBottom: 28, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(184,149,106,0.55)', shadowColor: '#5A3A1A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 12, elevation: 5 },
  // Page fixe (Android) : la mer prend la hauteur restante au lieu de 600 fixes.
  bottlesContainerFill: { flex: 1, height: undefined, minHeight: 320, marginBottom: 12 },
  seaCountChip: { position: 'absolute', top: 12, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5, zIndex: 2 },
  seaCountChipText: { fontSize: 12, fontWeight: '700', color: COLORS.accent },
  seaTip: { backgroundColor: COLORS.paper, borderWidth: 1, borderStyle: 'dashed', borderColor: '#C8A873', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 8 },
  seaTipText: { fontSize: 12.5, color: COLORS.text, textAlign: 'center' },
  seaTipStrong: { fontWeight: '700', color: COLORS.accent },
  bottleItem: { position: 'absolute', width: 110, height: 160 },
  bottleTouchable: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  bottleImage: { width: '100%', height: '100%' },
  createAlternativeBtn: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 14, backgroundColor: COLORS.paper, borderWidth: 1.5, borderColor: '#B8956A', marginTop: 4 },
  createAlternativeBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.accent, textAlign: 'center' },
  quotaBox: { paddingVertical: 30, paddingHorizontal: 20, borderRadius: 18, backgroundColor: COLORS.paper, marginTop: 30, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, shadowColor: '#5A3A1A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 4 },
  quotaEmoji: { fontSize: 46, marginBottom: 14 },
  quotaTitle: { fontSize: 19, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  quotaText: { fontSize: 14, color: COLORS.text, textAlign: 'center', marginBottom: 8, lineHeight: 20 },
  quotaSubtext: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19 },
});