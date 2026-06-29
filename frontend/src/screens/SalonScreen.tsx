import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  useWindowDimensions,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
  Image,
  Alert,
} from 'react-native';

// Transformations multi-étapes : power id → [étape1, étape2, étape3, ...]
// Ajouter un PNG = déposer dans assets/avatar/transformations/ et l'ajouter ici
const TRANSFO_STAGES: Partial<Record<string, any[]>> = {
  ane: [
    require('../../assets/avatar/transformations/ane_1.png'),
    // ane_2.png et ane_3.png à ajouter quand disponibles
  ],
};

/**
 * Retourne l'image PNG correspondant à l'étape actuelle de la transformation.
 * Si plusieurs étapes : divise la durée totale en parts égales.
 * Si une étape manque : utilise la dernière disponible.
 */
function getTransfoImage(
  powerId: string,
  expiresAt: number,
  durationMinutes: number,
): any | null {
  const id = powerId.startsWith('mag_') ? powerId.slice(4) : powerId;
  const stages = TRANSFO_STAGES[id];
  if (!stages || stages.length === 0) return null;
  if (stages.length === 1) return stages[0];
  const totalMs = durationMinutes * 60 * 1000;
  const startTime = expiresAt - totalMs;
  const elapsed = Date.now() - startTime;
  const stageIndex = Math.min(
    Math.floor((elapsed / totalMs) * stages.length),
    stages.length - 1,
  );
  return stages[Math.max(0, stageIndex)];
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SalonParticipant } from '../data/salonsData';
import { useStore, Message } from '../store/useStore';
import { allOfferings, allPowers } from '../data/offerings';
import { OfferingBadge } from '../components/OfferingBadge';
import { ConsumptionActionButton } from '../components/ConsumptionActionButton';
import { ParticipantProfileModal } from '../components/ParticipantProfileModal';
import { sendSmile } from '../api/interactions';
import {
  listSalons,
  listMessages as apiListMessages,
  postMessage as apiPostMessage,
  getActiveSessions,
  getSessionDetail,
  joinSession,
  leaveSession,
  getCurrentSalonSession,
  performDrinkAction,
  performEatAction,
  type SalonMessageDTO,
  type SalonSessionDTO,
} from '../api/salons';
import {
  getOfferingsCatalog,
  getReceivedOfferings,
  getSalonOfferings,
  sendOffering,
  sendOfferingToSession,
  type OfferingCatalogItemDTO,
  type OfferingSentDTO,
  type SalonOfferingDTO,
} from '../api/offerings';
import {
  getMagiesCatalog,
  getActiveMagies,
  getSalonMagies,
  castSpell,
  breakSpell,
  type MagieCatalogItemDTO,
  type MagieCatalogDTO,
  type MagieCastDTO,
  type SalonMagieDTO,
} from '../api/magies';
import { isTestMode } from '../core/testMode';

// Correspondance slug frontend → kind backend
const SLUG_TO_KIND: Record<string, string> = {
  piscine: 'PISCINE',
  cafe_paris: 'CAFE_DE_PARIS',
  pirates: 'ILE_PIRATES',
  theatre: 'THEATRE',
  cocktails: 'BAR_COCKTAILS',
  metal: 'METAL',
  psy: 'PSY',
};

// Helper: Format message time
function formatMessageTime(createdAt: string): { time: string; dateSeparator?: string } {
  const msgDate = new Date(createdAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDateOnly = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());

  const time = msgDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  let dateSeparator: string | undefined;
  if (msgDateOnly.getTime() === today.getTime()) {
    dateSeparator = 'Aujourd\'hui';
  } else if (msgDateOnly.getTime() === yesterday.getTime()) {
    dateSeparator = 'Hier';
  } else if (msgDateOnly.getTime() < yesterday.getTime()) {
    dateSeparator = msgDate.toLocaleDateString('fr-FR', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  return { time, dateSeparator };
}

// Miroir du backend : breakConditionId → id de l'anti-sort
const BREAK_CONDITION_TO_ANTISPELL: Readonly<Record<string, string>> = {
  kiss: 'mag_bisou',
  compliment: 'mag_compliment',
  water: 'mag_eau',
  dance: 'mag_danse',
  laughter: 'mag_rire',
  music: 'mag_musique',
};
import { Avatar } from '../avatar/png/Avatar';
import { DEFAULT_AVATAR_FEMALE, DEFAULT_AVATAR_MALE } from '../avatar/png/defaults';
import { resolveAvatarConfig } from '../avatar/resolveAvatarConfig';
import ConfirmationModal from '../components/ConfirmationModal';

// ============================================
// COMPOSANT AVATAR AVEC ANIMATION BREATHING
// ============================================
interface SalonAvatarProps {
  participant: SalonParticipant & { isMe?: boolean; avatarConfig?: object };
  size: number;
  showBadges?: boolean;
  onPress?: () => void;
  isSelected?: boolean;
  showName?: boolean;
}

const AnimatedAvatar: React.FC<SalonAvatarProps> = ({
  participant,
  size,
  showBadges = true,
  onPress,
  isSelected,
  showName = true
}) => {
  const breathAnim = useRef(new Animated.Value(1)).current;
  const poofScale  = useRef(new Animated.Value(1)).current;
  const poofOp     = useRef(new Animated.Value(1)).current;

  // Breathing idle
  useEffect(() => {
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(breathAnim, { toValue: 1,    duration: 2000, useNativeDriver: true }),
      ])
    );
    breathing.start();
    return () => breathing.stop();
  }, []);

  // Poof d'entrée quand une transformation apparaît
  useEffect(() => {
    const isActive = !!(
      participant.transformation &&
      participant.transformationExpiresAt &&
      Date.now() < participant.transformationExpiresAt
    );
    if (isActive) {
      poofScale.setValue(0.2);
      poofOp.setValue(0);
      Animated.parallel([
        Animated.spring(poofScale, { toValue: 1, tension: 180, friction: 7, useNativeDriver: true }),
        Animated.timing(poofOp,    { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    }
  }, [participant.transformation]);

  const resolution = resolveAvatarConfig(
    participant.id,
    participant.avatarConfig,
    participant.gender,
    'SalonScreen.AnimatedAvatar'
  );
  const avatarConfig = resolution.config;

  const isTestUser = participant.name?.includes('TestUser') || participant.name?.includes('testuser');

  // DEBUG LOG - Proof that pseudo and avatar come from same userId
  const resolveLog = {
    participantId: participant.id,
    pseudo: participant.name,
    gender: participant.gender,
    isMe: (participant as any).isMe,
    currentUserId: participant.id === 'me' ? 'is-me' : participant.id,
    receivedAvatarConfig: participant.avatarConfig,
    receivedAvatarConfigType: typeof participant.avatarConfig,
    receivedAvatarConfigEmpty: !participant.avatarConfig || (typeof participant.avatarConfig === 'object' && Object.keys(participant.avatarConfig as any).length === 0),
    avatarResolutionSource: resolution.source,
    avatarResolutionUserId: resolution.userId,
    avatarResolutionGender: resolution.gender,
    resolvedAvatarHair: (avatarConfig as any).hair,
    resolvedAvatarPilosite: (avatarConfig as any).pilosite,
    resolvedAvatarEarrings: (avatarConfig as any).earrings,
    matchVerification: {
      pseudoMatches: participant.name !== undefined,
      userIdMatches: participant.id === resolution.userId,
      genderMatches: participant.gender === resolution.gender,
    },
  };

  if (isTestUser) {
    console.log(`[AnimatedAvatar-MAPPING-PROOF] Verifying pseudo/avatar match:`, resolveLog);
  }

  console.log(`[AnimatedAvatar-RENDER] ${participant.name}:`, resolveLog);

  // Transformation active ?
  const isTransformed = !!(
    participant.transformation &&
    participant.transformationExpiresAt &&
    Date.now() < participant.transformationExpiresAt
  );
  const localTransfoId = participant.transformation?.startsWith('mag_')
    ? participant.transformation.slice(4)
    : participant.transformation;
  const activePower = isTransformed
    ? allPowers.find(p => p.id === localTransfoId)
    : null;

  return (
    <>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.avatarWrapper}>
        {/* Cercle avatar — wrapper non-clippé pour le point en ligne */}
        <View style={{ width: size, height: size }}>
          <Animated.View style={[
            styles.avatarContainer,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              overflow: 'hidden',
              transform: [{ scale: isTransformed ? poofScale : breathAnim }],
            },
            isSelected && styles.avatarSelected,
          ]}>
            {isTransformed && activePower ? (
              /* ── Mode REPLACE : image ou emoji de transformation ── */
              <Animated.View style={[
                styles.transfoContainer,
                { opacity: poofOp },
              ]}>
                {(() => {
                  const img = getTransfoImage(
                    activePower.id,
                    participant.transformationExpiresAt ?? 0,
                    activePower.duration,
                  );
                  return img ? (
                    <Image
                      source={img}
                      style={{ width: size, height: size }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={[styles.transfoEmoji, { fontSize: size * 0.52 }]}>
                      {activePower.emoji}
                    </Text>
                  );
                })()}
              </Animated.View>
            ) : (
              /* ── Mode NORMAL : avatar ── */
              <Avatar size={size - 8} {...(avatarConfig as any)} />
            )}
          </Animated.View>
          {participant.online && (
            <View style={[styles.onlineDot, { width: size * 0.2, height: size * 0.2, borderRadius: size * 0.1 }]} />
          )}
        </View>

        {participant.isMe && (
          <View style={styles.meBadge}>
            <Text style={styles.meBadgeText}>Moi</Text>
          </View>
        )}
        {showName && (
          <Text style={[styles.avatarName, { maxWidth: size + 20 }]} numberOfLines={1}>
            {participant.name}
          </Text>
        )}
        {/* Indice de rupture du sort */}
        {isTransformed && activePower?.breakHint && (
          <Text style={[styles.breakHint, { maxWidth: size + 30 }]} numberOfLines={2}>
            {activePower.breakHint}
          </Text>
        )}
      </TouchableOpacity>

      {showBadges && participant.offerings && participant.offerings.length > 0 && (
        <View style={styles.badgesColumn}>
          {(() => {
            const visibleOfferings = participant.offerings.slice(-3);
            return (
              <View style={styles.badgesRow}>
                {visibleOfferings.map((o, idx) => (
                  <OfferingBadge key={idx} offering={o} size={28} />
                ))}
              </View>
            );
          })()}
        </View>
      )}
    </>
  );
};

// ============================================
// COMPOSANT PRINCIPAL SALON
// ============================================
export default function SalonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  
  // Détection de l'orientation - plus fiable
  const isLandscape = width > height;
  

  const flatListRef = useRef<FlatList>(null);
  // Timers de transformation (un par participant) — nettoyés automatiquement
  const transfoTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const { currentUser, isAuthenticated, coins, removeCoins, addMessage, messagesBySalon, loadMessages, avatarPngConfig, loadWallet, setCurrentSalonSession, clearCurrentSalonSession, currentSessionId, currentSalonKind } = useStore();

  // Gestion de la sortie du salon
  const handleLeaveSession = () => {

    if (!screenSessionId) {
      Alert.alert('Erreur', 'Impossible de quitter: aucune session active.');
      return;
    }

    setShowLeaveModal(true);
  };

  const handleConfirmLeave = async () => {
    if (!screenSessionId) return;

    try {
      await leaveSession(screenSessionId);
      clearCurrentSalonSession();
      setShowLeaveModal(false);
      router.back();
    } catch (e) {
      setShowLeaveModal(false);
      Alert.alert('Erreur', 'Impossible de quitter le salon. Veuillez réessayer.');
    }
  };

  // Récupérer le salon
  const rawSalonId = params.id as string;
  const salonId = rawSalonId === 'cafe-paris' ? 'cafe_paris' : (rawSalonId || 'cafe_paris');


  // Salon metadata (layout, gradient, etc.) - ainda usamos estrutura local mas carregaremos quando auth
  const [salonMeta, setSalonMeta] = useState<any>(null);
  const [activeSessions, setActiveSessions] = useState<SalonSessionDTO[]>([]);
  const [screenSessionId, setScreenSessionId] = useState<string | null>(null);

  // États
  const [messageInput, setMessageInput] = useState('');
  const [showOfferingsModal, setShowOfferingsModal] = useState(false);
  const [showPowersModal, setShowPowersModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedParticipantForProfile, setSelectedParticipantForProfile] = useState<SalonParticipant | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<SalonParticipant | null>(null);
  const [showProfileTargetMenu, setShowProfileTargetMenu] = useState(false);
  const [showOfferingTargetMenu, setShowOfferingTargetMenu] = useState(false);
  const [showMagieTargetMenu, setShowMagieTargetMenu] = useState(false);
  const [recentInteractions, setRecentInteractions] = useState<Array<{
    id: string;
    from: string;
    to: string;
    emoji: string;
    name: string;
    timestamp: number;
  }>>([]);

  // Modal target selection (in test mode, can select self even with others present)
  const [modalTargetId, setModalTargetId] = useState<string | null>(null);

  // Participants
  const [participants, setParticipants] = useState<(SalonParticipant & { isMe?: boolean })[]>([]);

  // ID réel du salon côté backend (cuid), résolu via kind
  const [apiSalonId, setApiSalonId] = useState<string | null>(null);
  // Messages chargés depuis l'API
  const [apiMessages, setApiMessages] = useState<SalonMessageDTO[]>([]);
  // Flag : participants déjà initialisés depuis l'API (pour ne pas écraser les badges locaux)
  const participantsReady = useRef(false);

  // Reset participants when entering a new salon session
  useEffect(() => {
    participantsReady.current = false;
  }, [screenSessionId]);

  // Offrandes reçues par le user courant (backend, sondées toutes les 15s)
  const [myReceivedOfferings, setMyReceivedOfferings] = useState<OfferingSentDTO[]>([]);
  // Offrandes du salon entier (clé pour les badges de tous les participants)
  const [salonOfferings, setSalonOfferings] = useState<SalonOfferingDTO[]>([]);
  // Sorts actifs dans le salon entier (source de vérité pour les transformations)
  const [salonMagies, setSalonMagies] = useState<SalonMagieDTO[]>([]);
  // Magies actives ciblant le user courant (backend, sondées toutes les 15s)
  const [activeMagiesOnMe, setActiveMagiesOnMe] = useState<MagieCastDTO[]>([]);
  // Sorts envoyés par le user courant (castId trackés pour break spell)
  const sentCastsRef = useRef<Map<string, MagieCastDTO>>(new Map());
  // Last spell result tracking
  const lastSpellResultRef = useRef<any>(null);
  const lastSpellTypeRef = useRef<string | null>(null);
  const lastSpellTargetIdRef = useRef<string | null>(null);
  const lastSpellTargetNameRef = useRef<string | null>(null);
  // handleSendPower execution tracing
  const handleSendPowerCalledRef = useRef<boolean>(false);
  const selectedTargetIdAtCallRef = useRef<string | null>(null);
  const spellIdRef = useRef<string | null>(null);
  const requestBodyRef = useRef<any>(null);
  const responseStatusRef = useRef<string | null>(null);
  const responseBodyRef = useRef<any>(null);
  const errorRef = useRef<string | null>(null);
  // handleSendOffering execution tracing
  const handleSendOfferingCalledRef = useRef<boolean>(false);
  const offeringTargetIdAtCallRef = useRef<string | null>(null);
  const offeringIdRef = useRef<string | null>(null);
  const offeringRequestBodyRef = useRef<any>(null);
  const offeringResponseStatusRef = useRef<string | null>(null);
  const offeringResponseBodyRef = useRef<any>(null);
  const offeringErrorRef = useRef<string | null>(null);
  // Sorts actifs sur la cible sélectionnée (chargés à l'ouverture du modal magie)
  const [targetActiveCasts, setTargetActiveCasts] = useState<MagieCastDTO[]>([]);

  // Catalogues backend (chargés une fois quand authentifié)
  const [offeringsCatalog, setOfferingsCatalog] = useState<OfferingCatalogItemDTO[]>([]);
  const [magiesCatalog, setMagiesCatalog] = useState<MagieCatalogDTO | null>(null);

  const [actionNotice, setActionNotice] = useState("");

  // Test mode: allow self-targeting when alone (excluding self from count)
  const allowSelfTarget = isTestMode() && participants.filter(p => !p.isMe).length === 0;
  const effectiveSelectedPlayer = selectedPlayer || (allowSelfTarget && currentUser ? {
    id: currentUser.id,
    name: currentUser.name || 'Moi',
    isMe: true,
  } as any : null);
  useEffect(() => {
    if (!isAuthenticated) return;
    getOfferingsCatalog().then(setOfferingsCatalog).catch(() => {});
    getMagiesCatalog().then(setMagiesCatalog).catch(() => {});
  }, [isAuthenticated]);

  // Items affichés dans les modals (API si auth, local sinon)
  const displayOfferings = useMemo(
    () => (isAuthenticated && offeringsCatalog.length > 0 ? offeringsCatalog : allOfferings),
    [isAuthenticated, offeringsCatalog],
  );
  const displayPowers = useMemo(() => {
    if (isAuthenticated && magiesCatalog) {
      // Anti-sorts nécessitent un castId — on n'expose que les vrais sorts
      return magiesCatalog.spells;
    }
    return allPowers;
  }, [isAuthenticated, magiesCatalog]);

  // Résolution slug → cuid backend via GET /api/salons
  useEffect(() => {
    if (!isAuthenticated) return;
    const kind = SLUG_TO_KIND[salonId];
    if (!kind) return;
    listSalons()
      .then((list) => {
        const match = list.find((s) => s.kind === kind);
        if (match) setApiSalonId(match.id);
      })
      .catch(() => {});
  }, [salonId, isAuthenticated]);

  // Chargement messages API + polling 3s
  const loadApiMessages = useCallback(() => {
    if (!apiSalonId) return;
    apiListMessages(apiSalonId)
      .then((msgs) => setApiMessages(msgs))
      .catch(() => {});
  }, [apiSalonId]);

  // Load session participants/details for polling
  const loadSessionParticipants = useCallback(() => {
    if (!screenSessionId) return;
    getSessionDetail(screenSessionId)
      .then((session) => {
        setActiveSessions([session]);
        // Force refresh of participants next render
        participantsReady.current = false;
      })
      .catch(() => {});
  }, [screenSessionId]);

  // Consolidated salon content polling (messages + participants + offrandes + magies)
  const loadSalonContent = useCallback(async () => {
    console.log('[LOAD SALON] loadSalonContent called', { caller: new Error().stack?.split('\n')[2] });
    if (!apiSalonId || !screenSessionId || !isAuthenticated || !currentUser?.id) {
      console.log('[LOAD-AUDIT] SKIP: missing params', { apiSalonId, screenSessionId, isAuthenticated, userId: currentUser?.id });
      return;
    }

    try {
      console.log('[LOAD-AUDIT] Loading salon data...');
      // Load all in parallel
      const [msgs, session, offers, magies, myOffers, activeMag] = await Promise.all([
        apiListMessages(apiSalonId, 50, screenSessionId),
        getSessionDetail(screenSessionId),
        getSalonOfferings(apiSalonId),
        getSalonMagies(apiSalonId),
        getReceivedOfferings(1, 50, true),
        getActiveMagies(currentUser.id),
      ]);

      // Update all state
      console.log('[LOAD-AUDIT] Updating state...');
      setActiveSessions([session]);
      setSalonOfferings(offers);
      setSalonMagies(magies);
      setMyReceivedOfferings(myOffers);
      setActiveMagiesOnMe(activeMag);
      console.log('[MAGIES-DEBUG] loadSalonContent loaded:', {
        salonMagiesCount: magies.length,
        activeMagiesOnMeCount: activeMag.length,
        salonMagies: magies.map(m => ({ castId: m.castId, magieId: m.magieId, actorId: m.actorId, toUserId: m.toUserId, expiresAt: m.expiresAt })),
        activeMagiesOnMe: activeMag.map(m => ({ id: m.id, magieId: m.magieId, expiresAt: m.expiresAt })),
      });
      // DO NOT reset participantsReady.current here - it would destroy local UI state
      // (offerings added by handleSendOffering, avatar changes, etc).
      // Participants are initialized once in the effect at line ~580 and should stay stable.

      // Set messages from API (now includes system messages created by backend)
      msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const glouglou = msgs.filter(m => m.content?.includes('Glouglou')).length;
      const miam = msgs.filter(m => m.content?.includes('Miam')).length;
      console.log('[SET MESSAGES] Setting', msgs.length, 'messages. Glouglou count:', glouglou, 'Miam count:', miam);
      if (glouglou > 0 || miam > 0) {
        console.log('[SET MESSAGES] FOUND GLOUGLOU/MIAM:', msgs.filter(m => m.content?.includes('Glouglou') || m.content?.includes('Miam')).map(m => ({ id: m.id, content: m.content, createdAt: m.createdAt })));
      }
      setApiMessages(msgs);
    } catch (err) {
      console.log('[LOAD-AUDIT] ERROR:', err);
    }
  }, [apiSalonId, screenSessionId, isAuthenticated, currentUser?.id]);

  // Sondage offrandes reçues + magies actives sur moi + données salon
  const refreshMagiesAndOfferings = useCallback(async () => {
    if (!isAuthenticated || !currentUser?.id) return;
    try {
      const [offers, magies, salonOff, salonMag] = await Promise.all([
        getReceivedOfferings(1, 50, true),
        getActiveMagies(currentUser.id),
        apiSalonId ? getSalonOfferings(apiSalonId) : Promise.resolve([]),
        apiSalonId ? getSalonMagies(apiSalonId) : Promise.resolve([]),
      ]);
      setMyReceivedOfferings(offers);
      setActiveMagiesOnMe(magies);
      setSalonOfferings(salonOff);
      setSalonMagies(salonMag);
      console.log('[MAGIES-DEBUG] polling refreshed:', {
        salonMagiesCount: salonMag.length,
        activeMagiesOnMeCount: magies.length,
        salonMagies: salonMag.map(m => ({ castId: m.castId, magieId: m.magieId, actorId: m.actorId, toUserId: m.toUserId, expiresAt: m.expiresAt })),
        activeMagiesOnMe: magies.map(m => ({ id: m.id, magieId: m.magieId, expiresAt: m.expiresAt })),
      });
    } catch {
      // silent — ne pas bloquer l'UI si le backend est indisponible
    }
  }, [isAuthenticated, currentUser?.id, apiSalonId]);

  // Consolidated polling: messages + participants + offrandes + magies every 3 seconds
  useEffect(() => {
    console.log('[POLLING] Starting 3s polling interval');
    loadSalonContent();
    const interval = setInterval(() => {
      console.log('[POLLING] 3s interval tick - calling loadSalonContent');
      loadSalonContent();
    }, 3000);
    return () => {
      console.log('[POLLING] Clearing interval');
      clearInterval(interval);
    };
  }, [loadSalonContent]);

  // Participants : depuis les auteurs récents de l'API (une seule fois au premier load)
  // puis fallback mock si non authentifié
  // Carregar SalonSessions ativas e entrar em uma sessão
  useEffect(() => {
    if (!isAuthenticated) return;
    const kind = SLUG_TO_KIND[salonId];
    if (!kind) {
      return;
    }

    (async () => {
      try {
        const session = await joinSession(kind);
        console.log(`[DEBUG-SESSION] joinSession returned:`, {
          id: session.id,
          salonKind: session.salonKind,
          salonId: session.salonId,
          salonName: session.salonName,
          participants: session.participants?.length || 0,
          status: session.status,
        });
        setScreenSessionId(session.id);
        setActiveSessions([session]);
        // Persist to store
        setCurrentSalonSession(session.id, session.salonKind, session.salonId, session.salonName);
      } catch (e) {
        console.error(`[DEBUG-SESSION] ERROR calling joinSession:`, {
          kind,
          error: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined,
        });
      }
    })();
  }, [isAuthenticated, salonId, setCurrentSalonSession]);

  // Atualizar participants a partir da SalonSession ativa (dados REAIS)
  useEffect(() => {
    if (!isAuthenticated || activeSessions.length === 0 || !screenSessionId) {
      return;
    }
    if (participantsReady.current) {
      return;
    }

    participantsReady.current = true;
    const session = activeSessions.find(s => s.id === screenSessionId) || activeSessions[0];
    if (!session) {
      return;
    }

    console.log(`[SalonScreen-ParticipantsMapping] Starting mapping:`, {
      currentUserId: currentUser?.id,
      currentUserPseudo: currentUser?.name,
      currentUserGender: currentUser?.gender,
      serverParticipantsCount: session.participants.length,
      serverParticipantIds: session.participants.map(p => ({ userId: p.userId, pseudo: p.pseudo, gender: p.gender, hasAvatarConfig: !!p.avatarConfig, avatarConfigKeys: p.avatarConfig ? Object.keys(p.avatarConfig) : [] })),
    });

    const seen = new Map<string, SalonParticipant & { isMe?: boolean }>();
    for (const p of session.participants) {
      const gender = p.gender === 'FEMME' || p.gender === 'F' ? 'F' : 'M';
      const isCurrentUser = p.userId === currentUser?.id;
      const avatarToUse = p.avatarConfig; // Use server avatar, even for current user

      const isTestUser = p.pseudo?.includes('TestUser') || p.pseudo?.includes('testuser');

      if (isTestUser) {
        console.log(`[SalonScreen-DEBUG-TESTUSER] Processing:`, {
          pseudo: p.pseudo,
          userId: p.userId,
          gender: p.gender,
          rawGender: p.gender,
          mappedGender: gender,
          serverAvatarConfig: p.avatarConfig,
          avatarConfigType: typeof p.avatarConfig,
          avatarConfigKeys: p.avatarConfig ? Object.keys(p.avatarConfig) : [],
          avatarConfigEmpty: !p.avatarConfig || Object.keys(p.avatarConfig).length === 0,
        });
      }

      console.log(`[SalonScreen-ParticipantsMapping] Processing participant:`, {
        userId: p.userId,
        pseudo: p.pseudo,
        gender: p.gender,
        isCurrentUser,
        serverAvatarConfig: p.avatarConfig,
        willUseAvatar: avatarToUse,
      });

      seen.set(p.userId, {
        id: p.userId,
        name: p.pseudo,
        gender,
        age: 25,
        online: true,
        offerings: [],
        avatarConfig: avatarToUse,
        isMe: isCurrentUser,
      } as SalonParticipant & { isMe?: boolean; avatarConfig?: object });
    }

    if (!seen.has(currentUser?.id ?? 'me') && currentUser?.id) {
      console.log(`[SalonScreen-ParticipantsMapping] Current user NOT in server participants, adding manually:`, {
        userId: currentUser.id,
        pseudo: currentUser.name,
        gender: currentUser.gender,
      });

      seen.set(currentUser.id, {
        id: currentUser.id,
        name: currentUser.name || 'Você',
        gender: (currentUser.gender ?? 'M') as 'M' | 'F',
        age: currentUser.age ?? 25,
        online: true,
        offerings: [],
        isMe: true,
        avatarConfig: currentUser.profile?.avatarConfig ?? avatarPngConfig,
      } as SalonParticipant & { isMe: boolean; avatarConfig?: object });
    } else {
      console.log(`[SalonScreen-ParticipantsMapping] Current user IS in server participants`);
    }

    const finalParticipants = Array.from(seen.values());

    console.log(`[SalonScreen-ParticipantsMapping] Final mapping:`, {
      totalParticipants: finalParticipants.length,
      participants: finalParticipants.map(p => ({
        id: p.id,
        name: p.name,
        isMe: p.isMe,
        gender: p.gender,
        avatarConfig: p.avatarConfig,
      })),
    });

    setParticipants(finalParticipants);
  }, [isAuthenticated, activeSessions, screenSessionId, currentUser, avatarPngConfig]);

  // Mettre à jour les badges d'offrandes de TOUS les participants depuis le salon
  useEffect(() => {
    if (!isAuthenticated) return;
    setParticipants(prev => {
      const updated = prev.map(p => {
        const forP = salonOfferings.filter(o => o.toUserId === p.id).slice(-6);
        const backendOfferings = forP.map(o => ({
          id: o.id,
          offeringId: o.offeringId,
          emoji: o.emoji,
          from: o.fromPseudo,
          timestamp: new Date(o.createdAt).getTime(),
          isActive: o.isActive,
          consumptionCount: o.consumptionCount,
          consumptionMode: o.consumptionMode,
          toUserId: o.toUserId,
          currentStage: o.currentStage,
        }));
        return {
          ...p,
          offerings: backendOfferings,
        };
      });
      return updated;
    });
  }, [salonOfferings, isAuthenticated]);

  // Appliquer la transformation active (provenant du backend) sur le user courant
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) return;
    const myId = currentUser.id;
    const topCast = activeMagiesOnMe[0]; // trié par expiresAt asc
    console.log('[TRANSFORMATION-APPLY-ME] activeMagiesOnMe changed:', {
      myId,
      activeMagiesOnMeCount: activeMagiesOnMe.length,
      topCast: topCast ? { id: topCast.id, magieId: topCast.magieId, expiresAt: topCast.expiresAt } : null,
      willApplyTransformation: !!topCast,
    });
    setParticipants(prev => prev.map(p => {
      if (p.id !== myId) return p;
      if (topCast) {
        if (transfoTimers.current[myId]) {
          clearTimeout(transfoTimers.current[myId]);
          delete transfoTimers.current[myId];
        }
        return {
          ...p,
          transformation: topCast.magieId,
          transformationExpiresAt: new Date(topCast.expiresAt).getTime(),
        };
      }
      // If activeMagiesOnMe is empty, keep existing transformation (don't erase it)
      // Only erase if no local timer is running (local transformation has expired)
      if (p.transformation && !transfoTimers.current[myId]) {
        return { ...p, transformation: null, transformationExpiresAt: undefined };
      }
      return p;
    }));
  }, [activeMagiesOnMe, currentUser?.id, isAuthenticated]);

  // Appliquer les transformations de TOUS les participants depuis le salon
  // Y compris user courant si activeMagiesOnMe est vide (self-target fallback)
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) return;
    const myId = currentUser.id;
    const byTarget = new Map<string, SalonMagieDTO>();
    for (const m of salonMagies) {
      if (!byTarget.has(m.toUserId)) byTarget.set(m.toUserId, m); // premier = expirant le plus tôt
    }
    console.log('[TRANSFORMATION-APPLY-OTHERS] salonMagies changed:', {
      salonMagiesCount: salonMagies.length,
      byTargetMap: Array.from(byTarget.entries()).map(([toUserId, m]) => ({
        toUserId,
        castId: m.castId,
        magieId: m.magieId,
        actorId: m.actorId,
        expiresAt: m.expiresAt,
      })),
    });
    setParticipants(prev => prev.map(p => {
      // For current user: apply self-target magies from salonMagies only if activeMagiesOnMe is empty
      if ((p as any).isMe) {
        if (activeMagiesOnMe.length > 0) {
          return p; // activeMagiesOnMe is the source of truth for self-targets
        }
        // If activeMagiesOnMe is empty, apply self-target magie from salonMagies if present
        const selfTargetMagie = byTarget.get(myId);
        if (selfTargetMagie) {
          if (transfoTimers.current[myId]) {
            clearTimeout(transfoTimers.current[myId]);
            delete transfoTimers.current[myId];
          }
          return {
            ...p,
            transformation: selfTargetMagie.magieId,
            transformationExpiresAt: new Date(selfTargetMagie.expiresAt).getTime(),
          };
        }
        // No self-target magie and no activeMagiesOnMe - keep existing transformation if timer is running
        if (p.transformation && !transfoTimers.current[myId]) {
          return { ...p, transformation: null, transformationExpiresAt: undefined };
        }
        return p;
      }
      // For other participants: apply transformation from salonMagies
      const cast = byTarget.get(p.id);
      if (cast) {
        // Le backend confirme un sort actif — annuler le timer local si présent
        if (transfoTimers.current[p.id]) {
          clearTimeout(transfoTimers.current[p.id]);
          delete transfoTimers.current[p.id];
        }
        return {
          ...p,
          transformation: cast.magieId,
          transformationExpiresAt: new Date(cast.expiresAt).getTime(),
        };
      }
      // Pas de sort actif côté backend — effacer uniquement si aucun timer local en cours
      if (p.transformation && !transfoTimers.current[p.id]) {
        return { ...p, transformation: null, transformationExpiresAt: undefined };
      }
      return p;
    }));
  }, [salonMagies, activeMagiesOnMe, isAuthenticated, currentUser?.id]);

  // Source des messages : API si authentifié, store local sinon
  const messages: Message[] = isAuthenticated && apiMessages.length > 0
    ? apiMessages.map((msg) => ({
        id: msg.id,
        salonId: msg.salonId,
        userId: msg.userId,
        userName: msg.pseudo,
        username: msg.pseudo,
        content: msg.content,
        text: msg.content,
        timestamp: new Date(msg.createdAt).getTime(),
        type: (msg.kind as Message['type']),
      }))
    : (messagesBySalon[salonId] || []);

  // Fallback store local (non authentifié)
  useEffect(() => {
    if (!isAuthenticated && salonId) loadMessages(salonId);
  }, [salonId, isAuthenticated]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Envoyer un message
  const sendMessage = async () => {
    const content = messageInput.trim();
    if (!content) return;

    if (isAuthenticated && apiSalonId) {
      try {
        const msg = await apiPostMessage(apiSalonId, content);
        setApiMessages((prev) => [...prev, msg]);
        setMessageInput('');
        scrollToEnd();
        // Refresh all salon content immediately after sending
        loadSalonContent();
      } catch {
        alert('Message non envoyé. Vérifie ta connexion.');
      }
      return;
    }

    // Fallback local (non authentifié)
    const newMessage: Message = {
      id: Date.now().toString(),
      salonId: salonId,
      userId: currentUser?.id || 'me',
      userName: currentUser?.name || 'Vous',
      username: currentUser?.name || 'Vous',
      content,
      text: content,
      timestamp: Date.now(),
      type: 'message',
    };
    addMessage(salonId, newMessage);
    setMessageInput('');
    scrollToEnd();
  };

  // Perform drink action
  const handleDrink = async () => {
    if (!screenSessionId) {
      alert('Erreur: screenSessionId manquant');
      return;
    }

    try {
      const result = await performDrinkAction(screenSessionId);

      if (result.success && currentUser?.id) {
        if (!result.offeringConsumed) {
          setActionNotice('Rien à boire, commandez d\'abord.');
          setTimeout(() => setActionNotice(''), 2000);
          return;
        }

        loadSalonContent();
      }
    } catch (e) {
      // Silently handle error - user will see no response
    }
  };

  // Perform eat action
  const handleEat = async () => {
    if (!screenSessionId) {
      alert('Erreur: screenSessionId manquant');
      return;
    }

    try {
      const result = await performEatAction(screenSessionId);

      if (result.success && currentUser?.id) {
        if (!result.offeringConsumed) {
          setActionNotice('Rien à manger, commandez d\'abord.');
          setTimeout(() => setActionNotice(''), 2000);
          return;
        }

        loadSalonContent();
      }
    } catch (e) {
      // Silently handle error - user will see no response
    }
  };

  // Envoyer une offrande
  const handleSendOffering = async (item: any) => {
    // Mark function called
    handleSendOfferingCalledRef.current = true;
    offeringErrorRef.current = null;

    // Check if this is "Tournée générale!" mode
    if (modalTargetId === '__ALL_SESSION__') {
      if (!isAuthenticated || !screenSessionId) return;

      try {
        await sendOfferingToSession({ offeringId: item.id, sessionId: screenSessionId });
        offeringResponseStatusRef.current = 'success';
        await loadWallet();
        await loadSalonContent();
        setShowOfferingsModal(false);
      } catch (e: any) {
        const msg: string = e?.message ?? '';
        offeringErrorRef.current = msg;
        if (/insuffisant|insufficient|coins/i.test(msg)) {
          alert('Pas assez de pièces pour une tournée générale !');
        } else {
          alert('Tournée générale échouée. Réessaie.');
        }
      }
      return;
    }

    // Regular single-target offering
    let target = null;
    if (modalTargetId) {
      target = participants.find(p => p.id === modalTargetId);
    }
    if (!target) {
      target = effectiveSelectedPlayer;
    }
    if (!target) return;

    const targetUserId = target.id;
    const isSelf = target.id === currentUser?.id;

    // Store pre-API call values
    offeringTargetIdAtCallRef.current = targetUserId;
    offeringIdRef.current = item.id;
    offeringRequestBodyRef.current = { offeringId: item.id, toUserId: targetUserId, salonId: apiSalonId };


    if (isAuthenticated && apiSalonId) {
      try {
        const offeringResult = await sendOffering({ offeringId: item.id, toUserId: targetUserId, salonId: apiSalonId });
        // Store post-API call response
        offeringResponseStatusRef.current = 'success';
        offeringResponseBodyRef.current = offeringResult;
        await loadWallet();
        // Backend is now source of truth - fetch updated offerings
        await loadSalonContent();
      } catch (e: any) {
        const msg: string = e?.message ?? '';
        offeringResponseStatusRef.current = 'error';
        offeringResponseBodyRef.current = { message: msg, error: e };
        offeringErrorRef.current = msg;
        if (/insuffisant|insufficient|coins/i.test(msg)) {
          alert('Pas assez de pièces !');
          return;
        } else if (/toi-même/i.test(msg)) {
          // En mode test, allow self-targeting silently - continue with local UI update
        } else {
          alert('Offrande non envoyée. Réessaie.');
          return;
        }
      }
    } else {
      if (!removeCoins(item.cost)) {
        alert('Pas assez de pièces!');
        return;
      }
    }

    setRecentInteractions(prev => [{
      id: Date.now().toString(),
      from: currentUser?.name || 'Vous',
      to: isSelf ? 'Moi' : target.name,
      emoji: item.emoji,
      name: item.name,
      timestamp: Date.now(),
    }, ...prev].slice(0, 10));

    const sysMsg: Message = {
      id: Date.now().toString(),
      salonId: salonId,
      userId: 'system',
      userName: 'Système',
      username: 'Système',
      content: isSelf
        ? `${currentUser?.name || 'Vous'} s'offre ${item.emoji}!`
        : `${currentUser?.name || 'Vous'} a envoyé ${item.emoji} à ${target.name}!`,
      text: isSelf
        ? `${currentUser?.name || 'Vous'} s'offre ${item.emoji}!`
        : `${currentUser?.name || 'Vous'} a envoyé ${item.emoji} à ${target.name}!`,
      timestamp: Date.now(),
      type: 'offering',
      isSystem: true,
      giftData: item,
    };
    addMessage(salonId, sysMsg);

    setShowOfferingsModal(false);
    setSelectedPlayer(null);
    setModalTargetId(null);
  };

  // Envoyer un pouvoir
  const handleSendPower = async (item: any) => {
    // Mark function called
    handleSendPowerCalledRef.current = true;
    errorRef.current = null;

    // Determine target from modal selection or fallback
    let target = null;
    if (modalTargetId) {
      target = participants.find(p => p.id === modalTargetId);
    }
    if (!target) {
      target = effectiveSelectedPlayer;
    }
    if (!target) return;

    const targetId = target.id;
    const isSelf = target.id === currentUser?.id;

    // Store pre-API call values
    selectedTargetIdAtCallRef.current = targetId;
    spellIdRef.current = item.id;
    requestBodyRef.current = { magieId: item.id, toUserId: targetId, salonId: apiSalonId };


    const isBackendSpell = isAuthenticated && magiesCatalog && !item.cancels;

    if (isBackendSpell && apiSalonId) {
      // ── Chemin backend : cast réel via API ───────────────────────────────
      try {
        const castResult = await castSpell({ magieId: item.id, toUserId: targetId, salonId: apiSalonId });
        // Store post-API call response
        responseStatusRef.current = 'success';
        responseBodyRef.current = castResult;
        console.log('[SPELL-CAST-RESULT] Backend response:', {
          isSelf,
          castId: castResult.id,
          magieId: castResult.magieId,
          targetId,
          expiresAt: castResult.expiresAt,
          durationSec: castResult.magie.durationSec,
        });
        // Store for debug panel visibility
        lastSpellResultRef.current = castResult;
        lastSpellTypeRef.current = 'success';
        lastSpellTargetIdRef.current = targetId;
        lastSpellTargetNameRef.current = target.name;
        sentCastsRef.current.set(targetId, castResult);
        await loadWallet();
        // Do NOT call loadSalonContent() immediately - let the normal polling (every 2s) handle it
        // Appliquer transformation locale à partir du résultat backend
        const durationMs = castResult.magie.durationSec * 1000;
        const expiresAt = Date.now() + durationMs;
        if (transfoTimers.current[targetId]) clearTimeout(transfoTimers.current[targetId]);
        console.log('[SPELL-LOCAL-UPDATE] Applying local transformation:', {
          isSelf,
          targetId,
          magieId: castResult.magieId,
          expiresAt,
        });
        setParticipants(prev => prev.map(p =>
          p.id === targetId ? { ...p, transformation: castResult.magieId, transformationExpiresAt: expiresAt } : p
        ));
        transfoTimers.current[targetId] = setTimeout(() => {
          setParticipants(prev => prev.map(p =>
            p.id === targetId ? { ...p, transformation: null, transformationExpiresAt: undefined } : p
          ));
          delete transfoTimers.current[targetId];
          sentCastsRef.current.delete(targetId);
        }, durationMs);
      } catch (e: any) {
        const msg: string = e?.message ?? '';
        responseStatusRef.current = 'error';
        responseBodyRef.current = { message: msg, error: e };
        errorRef.current = msg;
        if (/insuffisant|insufficient|coins/i.test(msg)) {
          alert('Pas assez de pièces !');
          return;
        } else if (/toi-même/i.test(msg)) {
          // En mode test, allow self-casting silently - continue with local UI update
        } else {
          alert('Sort non lancé. Réessaie.');
          return;
        }
      }
    } else {
      // ── Chemin local : mode non authentifié ou anti-sort local ───────────
      if (!removeCoins(item.cost)) {
        alert('Pas assez de pièces!');
        return;
      }
      // Transformation locale (items locaux de type 'transformation' seulement)
      if (item.type === 'transformation') {
        const durationMs = (item.durationMs ?? item.duration * 1000) as number;
        const expiresAt  = Date.now() + durationMs;
        if (transfoTimers.current[targetId]) clearTimeout(transfoTimers.current[targetId]);
        setParticipants(prev => prev.map(p =>
          p.id === targetId ? { ...p, transformation: item.id, transformationExpiresAt: expiresAt } : p
        ));
        transfoTimers.current[targetId] = setTimeout(() => {
          setParticipants(prev => prev.map(p =>
            p.id === targetId ? { ...p, transformation: null, transformationExpiresAt: undefined } : p
          ));
          delete transfoTimers.current[targetId];
        }, durationMs);
      }
      // Annulateur local (items locaux avec `cancels`)
      if (item.cancels && Array.isArray(item.cancels)) {
        setParticipants(prev => prev.map(p => {
          if (p.id !== targetId) return p;
          if (!p.transformation || !item.cancels.includes(p.transformation)) return p;
          if (transfoTimers.current[targetId]) {
            clearTimeout(transfoTimers.current[targetId]);
            delete transfoTimers.current[targetId];
          }
          return { ...p, transformation: null, transformationExpiresAt: undefined };
        }));
      }
    }

    setRecentInteractions(prev => [{
      id: Date.now().toString(),
      from: currentUser?.name || 'Vous',
      to: isSelf ? 'Moi' : target.name,
      emoji: item.emoji,
      name: item.name,
      timestamp: Date.now(),
    }, ...prev].slice(0, 10));

    const sysMsg: Message = {
      id: Date.now().toString(),
      salonId: salonId,
      userId: 'system',
      userName: 'Système',
      username: 'Système',
      content: isSelf
        ? `${currentUser?.name || 'Vous'} s'est transformé(e) en ${item.name}!`
        : `${currentUser?.name || 'Vous'} a lancé ${item.emoji} sur ${target.name}!`,
      text: isSelf
        ? `${currentUser?.name || 'Vous'} s'est transformé(e) en ${item.name}!`
        : `${currentUser?.name || 'Vous'} a lancé ${item.emoji} sur ${target.name}!`,
      timestamp: Date.now(),
      type: 'power',
      isSystem: true,
      giftData: item,
    };
    addMessage(salonId, sysMsg);

    setShowPowersModal(false);
    setSelectedPlayer(null);
    setModalTargetId(null);
  };

  // Envoyer un sourire à un participant
  const handleSendSmile = async (toUserId: string) => {
    try {
      await sendSmile(toUserId);
      const userName = selectedParticipantForProfile?.name || 'X';
      setActionNotice(`💚 Sourire envoyé à ${userName}!`);
      setTimeout(() => setActionNotice(''), 2000);
      setShowProfileModal(false);
    } catch (e) {
      setActionNotice('Erreur lors de l\'envoi du sourire');
      setTimeout(() => setActionNotice(''), 2000);
    }
  };

  // Ouvrir le menu d'actions d'un participant
  // Naviguer vers la fiche profil complète du participant sélectionné
  // Casser un sort actif via le backend
  const handleBreakSpell = async (cast: MagieCastDTO, antiSpell: MagieCatalogItemDTO) => {
    try {
      await breakSpell(cast.id, antiSpell.id);
      await Promise.all([loadWallet(), refreshMagiesAndOfferings()]);
      const targetId = cast.toUserId;
      if (transfoTimers.current[targetId]) {
        clearTimeout(transfoTimers.current[targetId]);
        delete transfoTimers.current[targetId];
      }
      setParticipants(prev => prev.map(p =>
        p.id === targetId ? { ...p, transformation: null, transformationExpiresAt: undefined } : p
      ));
      sentCastsRef.current.delete(targetId);
      setTargetActiveCasts([]);
    } catch (e: any) {
      const msg: string = e?.message ?? '';
      if (/insuffisant|insufficient|coins/i.test(msg)) {
        alert('Pas assez de pièces !');
      } else if (/expir/i.test(msg)) {
        alert('Ce sort est déjà expiré.');
        setTargetActiveCasts([]);
      } else if (/bris/i.test(msg)) {
        alert('Ce sort vient d\'être brisé.');
        setTargetActiveCasts([]);
      } else {
        alert('Sort non cassé. Réessaie.');
      }
    }
  };

  // Ouvrir le modal magie — sorts actifs sur la cible depuis salonMagies (ou fetch frais en fallback)
  const openPowersModal = useCallback(async (targetId?: string) => {
    let target = null;

    // En mode test, permettre l'ouverture avec une cible spécifique (y compris soi-même)
    if (targetId) {
      if (targetId === currentUser?.id) {
        target = { id: currentUser.id, name: currentUser.name, isMe: true };
      } else {
        target = participants.find(p => p.id === targetId);
      }
    } else {
      target = effectiveSelectedPlayer;
    }

    if (!target) {
      return;
    }

    const targetUserId = target.id;

    if (isAuthenticated && target.transformation && target.transformationExpiresAt && Date.now() < target.transformationExpiresAt) {
      const fromSalon = salonMagies.filter(m => m.toUserId === targetUserId);
      if (fromSalon.length > 0) {
        // Mapper SalonMagieDTO → MagieCastDTO (shape attendue par breakOptions)
        setTargetActiveCasts(fromSalon.map(m => ({
          id: m.castId,
          magieId: m.magieId,
          magie: {
            id: m.magieId,
            emoji: m.emoji,
            name: m.name,
            cost: 0,
            durationSec: 0,
            type: m.type,
            breakConditionId: m.breakConditionId,
          },
          fromUserId: m.fromUserId,
          toUserId: m.toUserId,
          salonId: m.salonId,
          castAt: m.castAt,
          expiresAt: m.expiresAt,
          brokenAt: null,
          brokenBy: null,
        })));
      } else {
        // Fallback : fetch frais si salonMagies n'a pas encore chargé
        try {
          const casts = await getActiveMagies(targetUserId);
          setTargetActiveCasts(casts);
        } catch {
          setTargetActiveCasts([]);
        }
      }
    } else {
      setTargetActiveCasts([]);
    }
    setShowPowersModal(true);
  }, [isAuthenticated, effectiveSelectedPlayer, salonMagies]);

  // Options de rupture disponibles pour la cible sélectionnée
  const breakOptions = useMemo(() => {
    if (!magiesCatalog || targetActiveCasts.length === 0) return [];
    return targetActiveCasts.flatMap(cast => {
      const condId = cast.magie.breakConditionId;
      if (!condId) return [];
      const antiSpellId = BREAK_CONDITION_TO_ANTISPELL[condId];
      if (!antiSpellId) return [];
      const antiSpell = magiesCatalog.antiSpells.find(a => a.id === antiSpellId);
      if (!antiSpell) return [];
      return [{ cast, antiSpell }];
    });
  }, [magiesCatalog, targetActiveCasts]);

  // Salon metadata (layout, gradient, emoji, etc.) — dados estáticos, não participantes
  const salonMetadata: Record<string, any> = {
    piscine: { emoji: '🏊', name: 'Piscine', layout: 'vertical', gradient: ['#4FC3F7', '#0288D1'] },
    cafe_paris: { emoji: '☕', name: 'Café de Paris', layout: 'horizontal', gradient: ['#8D6E63', '#5D4037'] },
    pirates: { emoji: '🏴‍☠️', name: 'Île des pirates', layout: 'horizontal', gradient: ['#FFD54F', '#5D4037'] },
    theatre: { emoji: '🎭', name: 'Théâtre improvisé', layout: 'vertical', gradient: ['#CE93D8', '#7B1FA2'] },
    cocktails: { emoji: '🍸', name: 'Bar à cocktails', layout: 'horizontal', gradient: ['#F48FB1', '#C2185B'] },
    metal: { emoji: '🤘', name: 'Métal', layout: 'horizontal', gradient: ['#424242', '#212121'] },
    psy: { emoji: '🛋️', name: 'Cabinet du Psy', layout: 'vertical', gradient: ['#00BCD4', '#0097A7'] },
  };

  const salon = salonMetadata[salonId];
  if (!salon) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Salon introuvable</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calcul de la taille des avatars en fonction de l'écran
  const avatarSizePortrait = Math.min((width - 40) / participants.length, 70);
  const avatarSizeLandscape = Math.min(100, (height - 150) / 2.5);

  // ============================================
  // RENDU MODE PORTRAIT (DISCUSSION)
  // ============================================
  const renderPortraitMode = () => (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header avec gradient */}
      <LinearGradient
        colors={salon.gradient || ['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>{salon.emoji}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{salon.name}</Text>
        </View>
        <TouchableOpacity onPress={handleLeaveSession} style={styles.leaveButton}>
          <Text style={styles.leaveText}>Quitter</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Barre des participants - GRANDE sur toute la largeur */}
      <View style={styles.participantStrip}>
        <View style={styles.participantsRow}>
          {participants.map((p, index) => {
            // Log detailed mapping for each participant
            const mappingLog = {
              renderIndex: index,
              keyReact: p.id,
              participantId: p.id,
              participantUserId: p.id,
              pseudo: p.name,
              gender: p.gender,
              isMe: (p as any).isMe,
              currentUserId: currentUser?.id,
              isCurrentUserMatch: p.id === currentUser?.id,
              avatarConfigReceived: p.avatarConfig,
              avatarConfigEmpty: !p.avatarConfig || (typeof p.avatarConfig === 'object' && Object.keys(p.avatarConfig as any).length === 0),
              avatarConfigKeys: p.avatarConfig ? Object.keys(p.avatarConfig as any) : [],
            };

            const isTestUser = p.name?.includes('TestUser') || p.name?.includes('testuser');
            if (isTestUser || index === 0) {
              console.log(`[SalonScreen-RENDER-MAPPING] Index=${index}:`, mappingLog);
            }

            return (
              <View
                key={p.id}
                style={styles.participantItem}
              >
                <AnimatedAvatar
                  participant={p}
                  size={avatarSizePortrait}
                  isSelected={false}
                  showBadges={true}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* Zone de messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={scrollToEnd}
        renderItem={({ item, index }) => {
          const isOwn = item.userId === 'me' || item.userId === currentUser?.id;
          const isSystem = item.kind === 'system';
          const { time, dateSeparator } = formatMessageTime(item.createdAt);

          // Check if we need to show date separator
          const prevItem = index > 0 ? messages[index - 1] : null;
          const prevDate = prevItem ? formatMessageTime(prevItem.createdAt).dateSeparator : undefined;
          const showDateSeparator = dateSeparator && (dateSeparator !== prevDate);

          return (
            <View>
              {showDateSeparator && (
                <View style={styles.dateSeparator}>
                  <Text style={styles.dateSeparatorText}>{dateSeparator}</Text>
                </View>
              )}
              {isSystem ? (
                <View style={styles.systemMessage}>
                  <Text style={styles.systemText}>{item.content || item.text}</Text>
                </View>
              ) : (
                <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
                  {!isOwn && <Text style={styles.messageSender}>{item.userName || item.username}</Text>}
                  <View style={[styles.messageBubble, isOwn && styles.messageBubbleOwn]}>
                    <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
                      {item.content || item.text}
                    </Text>
                    <Text style={[styles.messageTime, isOwn && styles.messageTimeOwn]}>
                      {time}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyText}>Commencez la conversation!</Text>
          </View>
        }
      />

      {/* Action notice toast */}
      {actionNotice && (
        <View style={{
          backgroundColor: '#ff6b6b',
          padding: 12,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{
            color: '#fff',
            fontSize: 14,
            fontWeight: '600',
            textAlign: 'center',
          }}>
            {actionNotice}
          </Text>
        </View>
      )}

      {/* Barre d'input - portrait only has drink/eat buttons */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleDrink}
        >
          <Text style={styles.actionEmoji}>🍷</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleEat}
        >
          <Text style={styles.actionEmoji}>🥐</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          placeholder="Message..."
          placeholderTextColor="#999"
          value={messageInput}
          onChangeText={setMessageInput}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // ============================================
  // RENDU MODE PAYSAGE (INTERACTIONS)
  // ============================================
  const renderLandscapeMode = () => (
    <View style={[styles.landscapeContainer, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      {/* Header compact */}
      <LinearGradient
        colors={salon.gradient || ['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.landscapeHeader}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.landscapeTitle}>{salon.emoji} {salon.name}</Text>
        <TouchableOpacity onPress={handleLeaveSession} style={styles.leaveButton}>
          <Text style={styles.leaveText}>Quitter</Text>
        </TouchableOpacity>
        <Text style={styles.coinsText}>💰 {coins}</Text>
      </LinearGradient>

      <View style={styles.landscapeContent}>
        {/* Zone des avatars (gauche) - GRANDE */}
        <View style={styles.avatarsZone}>
          <View style={styles.avatarsGrid}>
            {participants.map((p) => (
              <View key={p.id} style={styles.avatarGridItem}>
                <AnimatedAvatar
                  participant={p}
                  size={avatarSizeLandscape}
                  showBadges={true}
                  onPress={() => {
                    setSelectedPlayer(prev => {
                      const next = selectedPlayer?.id === p.id ? null : p;
                      return next;
                    });
                  }}
                  isSelected={selectedPlayer?.id === p.id}
                />
              </View>
            ))}
          </View>

          {/* Debug panel - test mode only */}
          {isTestMode() && (
            <View style={{ backgroundColor: '#222', padding: 10, marginTop: 10, borderRadius: 5, borderWidth: 1, borderColor: '#666' }}>
              <Text style={{ color: '#0f0', fontSize: 10, fontFamily: 'monospace', marginBottom: 4 }}>
                ME ID: {currentUser?.id?.substring(0, 8) || 'N/A'}
              </Text>
              <Text style={{ color: '#0f0', fontSize: 10, fontFamily: 'monospace', marginBottom: 4 }}>
                selectedTargetId: {selectedPlayer?.id?.substring(0, 8) || 'none'}
              </Text>
              <Text style={{ color: '#0f0', fontSize: 10, fontFamily: 'monospace', marginBottom: 4 }}>
                lastSpellTargetId: {sentCastsRef.current.size > 0 ? Array.from(sentCastsRef.current.keys())[0]?.substring(0, 8) : 'none'}
              </Text>
              <Text style={{ color: '#0f0', fontSize: 10, fontFamily: 'monospace', marginBottom: 4 }}>
                activeMagiesOnMe: {activeMagiesOnMe.length}
              </Text>
              <Text style={{ color: '#0f0', fontSize: 10, fontFamily: 'monospace', marginBottom: 4 }}>
                salonMagies self-target: {salonMagies.filter(m => m.toUserId === currentUser?.id).length}
              </Text>
              <Text style={{ color: '#0f0', fontSize: 10, fontFamily: 'monospace', marginBottom: 4 }}>
                currentUser.transformation: {participants.find(p => p.id === currentUser?.id)?.transformation || 'none'}
              </Text>
              <Text style={{ color: '#0f0', fontSize: 10, fontFamily: 'monospace' }}>
                participant.isMe.transformation: {participants.find(p => (p as any).isMe)?.transformation || 'none'}
              </Text>
            </View>
          )}
        </View>

        {/* Zone des interactions (droite) */}
        <View style={styles.interactionsZone}>
          <Text style={styles.interactionsTitle}>📜 INTERACTIONS RÉCENTES</Text>
          
          <ScrollView style={styles.interactionsList} showsVerticalScrollIndicator={false}>
            {recentInteractions.length === 0 ? (
              <Text style={styles.noInteractions}>Aucune interaction récente{'\n'}Sélectionnez un participant et offrez-lui quelque chose!</Text>
            ) : (
              recentInteractions.map((interaction) => (
                <View key={interaction.id} style={styles.interactionItem}>
                  <Text style={styles.interactionEmoji}>{interaction.emoji}</Text>
                  <Text style={styles.interactionText}>
                    <Text style={styles.interactionFrom}>{interaction.from}</Text>
                    {' → '}
                    <Text style={styles.interactionTo}>{interaction.to}</Text>
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          {/* Boutons d'action - visibles seulement en mode paysage */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.bigActionButton, styles.profileButton]}
              onPress={() => setShowProfileTargetMenu(true)}
            >
              <Text style={styles.bigActionText}>👤 Profil</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bigActionButton, styles.giftButton]}
              onPress={() => setShowOfferingTargetMenu(true)}
            >
              <Text style={styles.bigActionText}>🎁 Offrir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bigActionButton, styles.magicButton]}
              onPress={() => setShowMagieTargetMenu(true)}
            >
              <Text style={styles.bigActionText}>✨ Magie</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  // ============================================
  // MODALS
  // ============================================
  const renderOfferingsModal = () => {
    // Get all possible targets: self + other participants
    const possibleTargets = [
      { id: currentUser?.id || '', name: 'Moi-même', isMe: true },
      ...participants.filter(p => !p.isMe).map(p => ({ id: p.id, name: p.name, isMe: false }))
    ];

    const isModalTargetMode = isTestMode() || participants.filter(p => !p.isMe).length === 0;

    // Determine target from modal selection, fallback to effectiveSelectedPlayer, or default to first possible target
    let target = null;
    if (modalTargetId) {
      target = participants.find(p => p.id === modalTargetId) ||
               (currentUser?.id === modalTargetId ? currentUser : null);
    }
    if (!target && possibleTargets.length === 1) {
      // Auto-select when only one target available (self)
      target = possibleTargets[0];
    }
    if (!target) {
      target = effectiveSelectedPlayer;
    }

    if (target) {
    }

    return (
    <Modal visible={showOfferingsModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: isLandscape ? '90%' : '70%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Offrir à {target?.name}</Text>
            <TouchableOpacity onPress={() => { setShowOfferingsModal(false); setModalTargetId(null); }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Target selector - shown in test mode or when alone */}
          {isModalTargetMode && (
            <View style={styles.targetSelectorContainer}>
              <Text style={styles.targetSelectorLabel}>Cible :</Text>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.targetSelectorScroll}>
                {possibleTargets.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.targetSelectorButton,
                      modalTargetId === t.id && styles.targetSelectorButtonActive,
                    ]}
                    onPress={() => {
                      setModalTargetId(t.id);
                    }}
                  >
                    <Text style={[
                      styles.targetSelectorButtonText,
                      modalTargetId === t.id && styles.targetSelectorButtonTextActive,
                    ]}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <ScrollView style={styles.offeringsGrid} contentContainerStyle={styles.offeringsGridContent}>
            {displayOfferings.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.offeringItem}
                onPress={() => handleSendOffering(item)}
              >
                <Text style={styles.offeringEmoji}>{item.emoji}</Text>
                <View style={styles.offeringInfo}>
                  <Text style={styles.offeringName}>{item.name}</Text>
                  <Text style={styles.offeringCost}>💰 {item.cost}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
  };

  const renderPowersModal = () => {
    // Get all possible targets: self + other participants
    const possibleTargets = [
      { id: currentUser?.id || '', name: 'Moi-même', isMe: true },
      ...participants.filter(p => !p.isMe).map(p => ({ id: p.id, name: p.name, isMe: false }))
    ];

    const isModalTargetMode = isTestMode() || participants.filter(p => !p.isMe).length === 0;

    // Determine target from modal selection, fallback to effectiveSelectedPlayer, or default to first possible target
    let target = null;
    if (modalTargetId) {
      target = participants.find(p => p.id === modalTargetId) ||
               (currentUser?.id === modalTargetId ? currentUser : null);
    }
    if (!target && possibleTargets.length === 1) {
      // Auto-select when only one target available (self)
      target = possibleTargets[0];
    }
    if (!target) {
      target = effectiveSelectedPlayer;
    }

    if (target) {
    }

    return (
    <Modal visible={showPowersModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: isLandscape ? '90%' : '70%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Magie sur {target?.name}</Text>
            <TouchableOpacity onPress={() => { setShowPowersModal(false); setTargetActiveCasts([]); setModalTargetId(null); }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Target selector - shown in test mode or when alone */}
          {isModalTargetMode && (
            <View style={styles.targetSelectorContainer}>
              <Text style={styles.targetSelectorLabel}>Cible :</Text>
              <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.targetSelectorScroll}>
                {possibleTargets.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.targetSelectorButton,
                      modalTargetId === t.id && styles.targetSelectorButtonActive,
                    ]}
                    onPress={() => {
                      setModalTargetId(t.id);
                    }}
                  >
                    <Text style={[
                      styles.targetSelectorButtonText,
                      modalTargetId === t.id && styles.targetSelectorButtonTextActive,
                    ]}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <ScrollView style={styles.offeringsGrid} contentContainerStyle={styles.offeringsGridContent}>
            {/* Section : casser un sort actif */}
            {breakOptions.length > 0 && (
              <>
                <Text style={[styles.offeringName, { marginBottom: 4, color: '#e74c3c', fontWeight: '700' }]}>
                  ⚡ Casser le sort actif
                </Text>
                {breakOptions.map(({ cast, antiSpell }) => (
                  <TouchableOpacity
                    key={cast.id}
                    style={[styles.offeringItem, { borderColor: '#e74c3c', borderWidth: 1 }]}
                    onPress={() => handleBreakSpell(cast, antiSpell)}
                  >
                    <Text style={styles.offeringEmoji}>{antiSpell.emoji}</Text>
                    <View style={styles.offeringInfo}>
                      <Text style={styles.offeringName}>
                        {antiSpell.name} — casse {cast.magie.emoji} {cast.magie.name}
                      </Text>
                      <Text style={styles.offeringCost}>💰 {antiSpell.cost}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                <Text style={[styles.offeringName, { marginTop: 8, marginBottom: 4, color: '#555' }]}>
                  — ou lancer un nouveau sort —
                </Text>
              </>
            )}
            {/* Section : sorts disponibles */}
            {displayPowers.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.offeringItem}
                onPress={() => handleSendPower(item)}
              >
                <Text style={styles.offeringEmoji}>{item.emoji}</Text>
                <View style={styles.offeringInfo}>
                  <Text style={styles.offeringName}>{item.name}</Text>
                  <Text style={styles.offeringCost}>💰 {item.cost}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
  };

  const renderParticipantProfileModal = () => (
    <ParticipantProfileModal
      visible={showProfileModal}
      participant={selectedParticipantForProfile}
      onClose={() => setShowProfileModal(false)}
      onSendSmile={handleSendSmile}
      onOpenReport={(p) => {
        console.log('Phase 2: Report participant', p);
      }}
    />
  );

  // Target selector menus
  const renderProfileTargetMenu = () => {
    const otherParticipants = participants.filter(p => !p.isMe);

    return (
      <Modal visible={showProfileTargetMenu} animationType="fade" transparent>
        <View style={styles.menuOverlay}>
          <TouchableOpacity
            style={styles.menuBackdrop}
            onPress={() => setShowProfileTargetMenu(false)}
            activeOpacity={1}
          />
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Voir le profil de :</Text>
            <ScrollView style={styles.menuList}>
              {otherParticipants.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.menuItem}
                  onPress={() => {
                    router.push(`/profile/${p.id}`);
                    setShowProfileTargetMenu(false);
                  }}
                >
                  <Text style={styles.menuItemText}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.menuCloseButton}
              onPress={() => setShowProfileTargetMenu(false)}
            >
              <Text style={styles.menuCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderOfferingTargetMenu = () => {
    // Allow targeting self + all other participants
    const allTargets = [
      ...participants.map(p => ({
        ...p,
        displayName: p.isMe ? 'Moi-même' : p.name
      }))
    ];

    return (
      <Modal visible={showOfferingTargetMenu} animationType="fade" transparent>
        <View style={styles.menuOverlay}>
          <TouchableOpacity
            style={styles.menuBackdrop}
            onPress={() => setShowOfferingTargetMenu(false)}
            activeOpacity={1}
          />
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Offrir à :</Text>
            <ScrollView style={styles.menuList}>
              {allTargets.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.menuItem}
                  onPress={() => {
                    setModalTargetId(p.id);
                    setShowOfferingsModal(true);
                    setShowOfferingTargetMenu(false);
                  }}
                >
                  <Text style={styles.menuItemText}>{p.displayName}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemAll]}
                onPress={() => {
                  setShowOfferingsModal(true);
                  setShowOfferingTargetMenu(false);
                  setModalTargetId('__ALL_SESSION__');
                }}
              >
                <Text style={[styles.menuItemText, styles.menuItemAllText]}>Tournée générale !</Text>
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity
              style={styles.menuCloseButton}
              onPress={() => setShowOfferingTargetMenu(false)}
            >
              <Text style={styles.menuCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderMagieTargetMenu = () => {
    // Allow targeting self + all other participants
    const allTargets = [
      ...participants.map(p => ({
        ...p,
        displayName: p.isMe ? 'Moi-même' : p.name
      }))
    ];

    return (
      <Modal visible={showMagieTargetMenu} animationType="fade" transparent>
        <View style={styles.menuOverlay}>
          <TouchableOpacity
            style={styles.menuBackdrop}
            onPress={() => setShowMagieTargetMenu(false)}
            activeOpacity={1}
          />
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Magie sur :</Text>
            <ScrollView style={styles.menuList}>
              {allTargets.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.menuItem}
                  onPress={() => {
                    setModalTargetId(p.id);
                    openPowersModal(p.id);
                    setShowMagieTargetMenu(false);
                  }}
                >
                  <Text style={styles.menuItemText}>{p.displayName}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.menuCloseButton}
              onPress={() => setShowMagieTargetMenu(false)}
            >
              <Text style={styles.menuCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {isLandscape ? renderLandscapeMode() : renderPortraitMode()}
      {renderOfferingsModal()}
      {renderPowersModal()}
      {renderParticipantProfileModal()}
      {renderProfileTargetMenu()}
      {renderOfferingTargetMenu()}
      {renderMagieTargetMenu()}

      <ConfirmationModal
        visible={showLeaveModal}
        title="Quitter le salon ?"
        message="Vous pourrez rejoindre un autre salon après votre départ."
        cancelText="Annuler"
        confirmText="Quitter"
        onCancel={() => setShowLeaveModal(false)}
        onConfirm={handleConfirmLeave}
        isDangerous={true}
      />
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  errorText: {
    fontSize: 18,
    color: '#8B6F47',
    textAlign: 'center',
    marginTop: 100,
  },
  backLink: {
    fontSize: 16,
    color: '#667eea',
    textAlign: 'center',
    marginTop: 20,
  },

  // Header Portrait
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: '600',
  },
  leaveButton: {
    padding: 8,
  },
  leaveText: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEmoji: {
    fontSize: 22,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
    maxWidth: 150,
  },
  coinsDisplay: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  coinsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },

  // Participant Strip - GRAND
  participantStrip: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5B7',
  },
  participantsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
  },
  participantItem: {
    alignItems: 'center',
    padding: 6,
    borderRadius: 12,
  },
  participantSelected: {
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
  },
  selectedHint: {
    textAlign: 'center',
    fontSize: 13,
    color: '#667eea',
    fontWeight: '600',
    marginTop: 8,
  },

  // Avatar
  avatarWrapper: {
    alignItems: 'center',
  },
  avatarContainer: {
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  avatarSelected: {
    borderColor: '#FFD700',
    borderWidth: 4,
    shadowColor: '#FFD700',
    shadowOpacity: 0.4,
  },
  avatarImage: {
    backgroundColor: '#E8E8E8',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  // Transformation replace
  transfoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
  },
  transfoEmoji: {
    textAlign: 'center',
  },
  breakHint: {
    fontSize: 9,
    color: '#7A5C3A',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 12,
  },

  meBadge: {
    backgroundColor: '#667eea',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: -8,
    alignSelf: 'center',
  },
  meBadgeText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '700',
  },
  avatarName: {
    fontSize: 12,
    color: '#5D4037',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },
  badgesColumn: {
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  badgeEmoji: {
    fontSize: 14,
    marginHorizontal: 1,
  },

  // Messages
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  messageRowOwn: {
    alignItems: 'flex-end',
  },
  messageSender: {
    fontSize: 12,
    color: '#8B6F47',
    marginBottom: 4,
    fontWeight: '600',
  },
  messageBubble: {
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageBubbleOwn: {
    backgroundColor: '#667eea',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#3A2818',
    lineHeight: 20,
  },
  messageTextOwn: {
    color: '#FFF',
  },
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginVertical: 8,
  },
  systemText: {
    fontSize: 13,
    color: '#667eea',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  messageTime: {
    fontSize: 11,
    color: '#AAA',
    marginTop: 2,
  },
  messageTimeOwn: {
    color: '#AAA',
  },
  emptyMessages: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#8B6F47',
  },

  // Input Bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8D5B7',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F0E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionEmoji: {
    fontSize: 22,
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F5F0E6',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#3A2818',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendText: {
    fontSize: 22,
    color: '#FFF',
    fontWeight: '600',
  },

  // ============================================
  // LANDSCAPE MODE
  // ============================================
  landscapeContainer: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  landscapeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  landscapeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  landscapeContent: {
    flex: 1,
    flexDirection: 'row',
  },
  
  // Zone avatars (gauche) - GRANDE
  avatarsZone: {
    flex: 1.5,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8E7',
  },
  avatarsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGridItem: {
    margin: 10,
    alignItems: 'center',
  },

  // Zone interactions (droite)
  interactionsZone: {
    flex: 1,
    backgroundColor: '#FFF',
    borderLeftWidth: 2,
    borderLeftColor: '#E8D5B7',
    padding: 12,
  },
  interactionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B6F47',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  interactionsList: {
    flex: 1,
  },
  noInteractions: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
  interactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E6',
  },
  interactionEmoji: {
    fontSize: 18,
    marginRight: 10,
  },
  interactionText: {
    fontSize: 12,
    color: '#5D4037',
    flex: 1,
  },
  interactionFrom: {
    fontWeight: '700',
    color: '#667eea',
  },
  interactionTo: {
    fontWeight: '700',
    color: '#E91E63',
  },
  
  selectedBanner: {
    backgroundColor: '#667eea',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  selectedBannerText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },

  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  bigActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  bigActionButtonDisabled: {
    opacity: 0.5,
  },
  giftButton: {
    backgroundColor: '#FF6B6B',
  },
  magicButton: {
    backgroundColor: '#9C27B0',
  },
  bigActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },

  // ============================================
  // MODALS
  // ============================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5B7',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3A2818',
  },
  modalClose: {
    fontSize: 24,
    color: '#999',
    padding: 4,
  },
  offeringsGrid: {
    padding: 12,
  },
  offeringsGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  offeringItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F0E6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  offeringEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  offeringInfo: {
    flex: 1,
  },
  offeringName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3A2818',
    marginBottom: 2,
  },
  offeringCost: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DAA520',
  },
  targetSelectorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5B7',
    backgroundColor: '#FFF',
  },
  targetSelectorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3A2818',
    marginBottom: 8,
  },
  targetSelectorScroll: {
    maxHeight: 40,
  },
  targetSelectorButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F5F0E6',
    borderWidth: 1,
    borderColor: '#E8D5B7',
  },
  targetSelectorButtonActive: {
    backgroundColor: '#E8B4B8',
    borderColor: '#D48A8E',
  },
  targetSelectorButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3A2818',
  },
  targetSelectorButtonTextActive: {
    color: '#FFF',
  },

  // Portrait mode selected actions zone
  selectedActionsZone: {
    backgroundColor: '#FFF8E7',
    borderTopWidth: 1,
    borderTopColor: '#E8D5B7',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectedBannerPortrait: {
    backgroundColor: '#E8B4B8',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  selectedBannerTextPortrait: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  actionsButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  portraitActionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  portraitProfileButton: {
    backgroundColor: '#F0E6D2',
    borderColor: '#D4C4B0',
  },
  portraitOfferingButton: {
    backgroundColor: '#F5E6D3',
    borderColor: '#E8D5B7',
  },
  portraitMagieButton: {
    backgroundColor: '#E8D5FF',
    borderColor: '#D4C4E8',
  },
  portraitActionButtonText: {
    fontSize: 20,
    marginBottom: 4,
  },
  portraitActionButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3A2818',
  },

  // Landscape action button styles
  profileButton: {
    backgroundColor: '#E8D5C4',
    borderColor: '#D4C4B0',
  },

  // Target selector menus
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  menu: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    maxWidth: 300,
    maxHeight: '70%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A2818',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5B7',
  },
  menuList: {
    maxHeight: 300,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E6',
  },
  menuItemAll: {
    backgroundColor: '#F5E6D3',
    borderBottomColor: '#E8D5B7',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#3A2818',
  },
  menuItemAllText: {
    fontWeight: '600',
  },
  menuCloseButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F5F0E6',
    borderTopWidth: 1,
    borderTopColor: '#E8D5B7',
    alignItems: 'center',
  },
  menuCloseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },

  // Target selector zone
  targetSelectorZone: {
    backgroundColor: '#FFF8E7',
    borderTopWidth: 1,
    borderTopColor: '#E8D5B7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  targetSelectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3A2818',
    marginBottom: 6,
  },
  targetSelectorButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  targetSelectorButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#F5F0E6',
    borderWidth: 1,
    borderColor: '#E8D5B7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetSelectorButtonActive: {
    backgroundColor: '#E8B4B8',
    borderColor: '#D48A8E',
  },
  targetSelectorButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3A2818',
  },
  targetSelectorButtonTextActive: {
    color: '#FFF',
  },
});
