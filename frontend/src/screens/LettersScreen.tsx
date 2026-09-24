import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useRouter, Link, useFocusEffect } from 'expo-router';
import { useStore } from '../store/useStore';
import { acceptMatch, breakMatch, blockMatch, relanceMatch } from '../api/matches';
import { reportUser, type ReportReason } from '../api/profiles';
import type { Letter, Match } from '../shared/types';
import { PremiumLetterAnimation } from '../components/PremiumLetterAnimation';
import { LetterPaginatedView } from '../components/letters/LetterPaginatedView';
import { Avatar } from '../avatar/png/Avatar';
import { DEFAULT_AVATAR } from '../avatar/png/defaults';
import { getRelationInfo } from '../engine/RelationEngine';
import { resolveAvatarConfig } from '../avatar/resolveAvatarConfig';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 32;
const MINI_FLAP_H = 54;
const LARGE_FLAP_H = 92;

interface EnvelopeCardProps {
  matchId: string;
  otherUserId: string;
  otherName: string;
  lastLetterAt: number | null;
  unread: number;
  myTurn: boolean;
  letterCount: number;
  letterCountA: number;
  letterCountB: number;
  isPremium?: boolean;
  questionsValidated: boolean;
  matchStatus: 'PENDING' | 'ACTIVE' | 'BROKEN' | 'BLOCKED';
  isInitiator: boolean;
  avatarConfig?: Record<string, unknown>;
  gender?: string;
  onOpen: () => void;
  onPlayQuestions: () => void | Promise<void>;
  onAccept: () => void | Promise<void>;
  formatTime: (ts: number) => string;
}

function MailboxPostalMark({ received }: { received: boolean }) {
  const accent = received ? '#8B2E3C' : '#A88E70';
  const line = received ? 'rgba(139,46,60,0.30)' : 'rgba(168,142,112,0.28)';

  return (
    <View style={envStyles.postalMark} pointerEvents="none">
      <Svg
        width="56"
        height="30"
        viewBox="0 0 56 30"
        preserveAspectRatio="none"
        style={envStyles.postalLines}
      >
        <Path d="M2 7 C 10 3 16 11 24 7 C 32 3 40 11 54 7" fill="none" stroke={line} strokeWidth="1.25" strokeLinecap="round" />
        <Path d="M2 15 C 10 11 16 19 24 15 C 32 11 40 19 54 15" fill="none" stroke={line} strokeWidth="1.25" strokeLinecap="round" />
        <Path d="M2 23 C 10 19 16 27 24 23 C 32 19 40 27 54 23" fill="none" stroke={line} strokeWidth="1.25" strokeLinecap="round" />
      </Svg>

      <View style={[envStyles.postageStamp, { borderColor: accent }]}>
        <Ionicons
          name={received ? 'mail-unread-outline' : 'heart-outline'}
          size={13}
          color={accent}
        />
      </View>
    </View>
  );
}

const EnvelopeCard = ({
  matchId,
  otherUserId,
  otherName,
  lastLetterAt,
  unread,
  myTurn,
  letterCount,
  letterCountA,
  letterCountB,
  isPremium = false,
  questionsValidated,
  matchStatus,
  isInitiator,
  avatarConfig,
  gender,
  onOpen,
  onPlayQuestions,
  onAccept,
  formatTime,
}: EnvelopeCardProps) => {
  const rel = getRelationInfo(letterCount, isPremium);

  // Petite animation tremblement quand lettre non lue
  const shakeX = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (unread <= 0) {
      shakeX.setValue(0);
      return;
    }
    // Tremblement discret répété toutes les 4 secondes
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(3500),
        Animated.timing(shakeX, { toValue: -3, duration: 60, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shakeX, { toValue: 3, duration: 60, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shakeX, { toValue: -2, duration: 50, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shakeX, { toValue: 2, duration: 50, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shakeX, { toValue: 0, duration: 40, useNativeDriver: true, easing: Easing.linear }),
      ])
    );
    loop.start();
    return () => { loop.stop(); shakeX.setValue(0); };
  }, [unread]);

  const previewText = () => {
    if (matchStatus?.toUpperCase() === 'PENDING') return 'En attente d\'acceptation';
    if (matchStatus?.toUpperCase() === 'BROKEN' || matchStatus?.toUpperCase() === 'BLOCKED') return 'Match terminé';
    if (!questionsValidated) return 'Jeu des questions à compléter';
    if (letterCount === 0) return myTurn ? 'Écrivez la première lettre !' : 'En attente de la première lettre...';
    if (unread > 0) return 'Nouvelle lettre reçue !';
    return myTurn ? "À vous d'écrire..." : 'En attente de réponse...';
  };

  const timeText = () => {
    if (letterCount === 0) return 'Nouveau';
    if (unread > 0) return 'Non lu';
    return myTurn ? (lastLetterAt ? formatTime(lastLetterAt) : '') : 'Envoyé';
  };

  const isActive = matchStatus?.toUpperCase() === 'ACTIVE';
  const canInteract = isActive && questionsValidated;
  const canReadLetters = isActive; // Can always read if match is active

  return (
    <Animated.View
      style={[
        envStyles.card,
        unread > 0 && envStyles.cardUnread,
        { transform: [{ translateX: shakeX }] },
      ]}
    >
      <MailboxPostalMark received={unread > 0 || myTurn} />

      <View style={envStyles.infoRow}>
        {(() => {
          const avatarResolution = resolveAvatarConfig(otherUserId, avatarConfig, gender, 'LettersScreen');
          return <Avatar size={42} {...avatarResolution.config} />;
        })()}
        <View style={envStyles.texts}>
          <View style={envStyles.nameRow}>
            <Text style={envStyles.name}>{otherName}</Text>
            {unread > 0 && (
              <View style={envStyles.badge}>
                <Text style={envStyles.badgeTxt}>{unread}</Text>
              </View>
            )}
          </View>
          <Text style={envStyles.preview} numberOfLines={1}>{previewText()}</Text>
          {canInteract ? (
            <Text style={envStyles.levelLine}>
              {rel.stars} Niveau {rel.level} — {rel.label}{'  '}
              <Text style={envStyles.letterCounter}>{letterCountA}↑ {letterCountB}↓</Text>
            </Text>
          ) : (
            <Text style={envStyles.levelLine}>{rel.stars} {rel.label}</Text>
          )}
        </View>
        <Text style={envStyles.time}>{timeText()}</Text>
      </View>

      <View style={envStyles.actionBar}>
        {matchStatus?.toUpperCase() === 'PENDING' ? (
          isInitiator ? (
            <View style={[envStyles.actionLeft, envStyles.actionDisabled]}>
              <View style={envStyles.actionContent}><Ionicons name="time-outline" size={17} color="#B9A990" /><Text style={[envStyles.actionLeftText, envStyles.actionDisabledText]}>En attente</Text></View>
            </View>
          ) : (
            <TouchableOpacity style={envStyles.actionLeft} onPress={onAccept} activeOpacity={0.75}>
              <View style={envStyles.actionContent}><Ionicons name="checkmark-circle-outline" size={17} color="#8B5A2B" /><Text style={envStyles.actionLeftText}>Accepter le match</Text></View>
            </TouchableOpacity>
          )
        ) : isActive && !questionsValidated ? (
          <TouchableOpacity style={envStyles.actionLeft} onPress={onPlayQuestions} activeOpacity={0.75}>
            <Text style={envStyles.actionLeftText}>🎮 Jouer aux questions</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[envStyles.actionLeft, !canReadLetters && envStyles.actionDisabled]}
            onPress={() => {
              if (canReadLetters) {
                onOpen();
              }
            }}
            activeOpacity={canReadLetters ? 0.75 : 1}
          >
            <View style={envStyles.actionContent}>
              <Ionicons name="mail-outline" size={17} color={canReadLetters ? '#8B5A2B' : '#B9A990'} />
              <Text style={[envStyles.actionLeftText, !canReadLetters && envStyles.actionDisabledText]}>
                Lettres
              </Text>
            </View>
          </TouchableOpacity>
        )}
        <View style={envStyles.actionSep} />
        <Link
          href={{ pathname: '/profile/[id]', params: { id: otherUserId } }}
          style={envStyles.actionRight}
        >
          <><Ionicons name="person-outline" size={16} color="#8B5A2B" />{' Profil →'}</>
        </Link>
      </View>
    </Animated.View>
  );
};

const envStyles = StyleSheet.create({
  card: {
    position: 'relative',
    backgroundColor: '#FFFDF8',
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#C7AE87',
    shadowColor: '#3A2415',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.17,
    shadowRadius: 9,
    elevation: 5,
    overflow: 'hidden',
  },
  cardUnread: {
    borderColor: '#9E4656',
    shadowColor: '#8B2E3C',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 7,
  },
  postalMark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 78,
    height: 42,
    zIndex: 3,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  postalLines: {
    position: 'absolute',
    right: 22,
    top: 7,
    opacity: 0.78,
  },
  postageStamp: {
    width: 32,
    height: 36,
    borderWidth: 1.2,
    borderRadius: 2,
    backgroundColor: '#F8F0E3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6A4A2D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 17,
    paddingBottom: 14,
    gap: 12,
  },
  texts: { flex: 1, minWidth: 0, paddingRight: 42 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 17, fontWeight: '700', color: '#2A1A10', letterSpacing: -0.1 },
  badge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#8B2E3C',
    alignItems: 'center', justifyContent: 'center',
  },
  badgeTxt: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  preview:        { fontSize: 13.2, color: '#75604B', marginTop: 3 },
  levelLine:      { fontSize: 11, color: '#A46F35', marginTop: 4, fontWeight: '600' },
  time:           { fontSize: 11, color: '#8B6F47', marginRight: 74 },
  actionBar:      { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#D9C7AE', minHeight: 42, backgroundColor: '#FBF4E8' },
  actionLeft:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9 },
  actionContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionLeftText: { fontSize: 12, color: '#5A3A1A', fontWeight: '600' },
  actionSep:      { width: StyleSheet.hairlineWidth, backgroundColor: '#E1D5C3' },
  actionRight:       { flex: 1, textAlign: 'center', paddingVertical: 9, fontSize: 12, color: '#8B5B34', fontWeight: '600', letterSpacing: 0.2, textDecorationLine: 'none' },
  actionDisabled:    { opacity: 0.4 },
  actionDisabledText:{ color: '#9A7040' },
  letterCounter:     { fontSize: 10, color: '#B87333', fontWeight: '600' },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 5, 2, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  largeWrapper: {
    width: SCREEN_W - 32,
  },
  largeBody: {
    backgroundColor: '#FEFAF0',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#B8956A',
    paddingTop: LARGE_FLAP_H + 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  largeContent: {
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  largeName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C1A0E',
    marginTop: 4,
  },
  largePreview: {
    fontSize: 15,
    color: '#5A3A1A',
    textAlign: 'center',
    lineHeight: 23,
    fontStyle: 'italic',
    paddingHorizontal: 8,
  },
  largeTap: {
    fontSize: 12,
    color: '#9A7040',
    marginTop: 8,
    letterSpacing: 1.5,
  },

  largeFlap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: LARGE_FLAP_H + 4,
    backgroundColor: '#C4924A',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderWidth: 2,
    borderColor: '#B8956A',
    borderBottomWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 10,
  },
  foldLineLLLarge: {
    width: (SCREEN_W - 32) * 0.75,
    top: LARGE_FLAP_H * 0.3,
    left: -(SCREEN_W - 32) * 0.12,
    transform: [{ rotate: '18deg' }],
  },
  foldLineLRLarge: {
    width: (SCREEN_W - 32) * 0.75,
    top: LARGE_FLAP_H * 0.3,
    right: -(SCREEN_W - 32) * 0.12,
    transform: [{ rotate: '-18deg' }],
  },
  sealLarge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#7A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  sealLargeEmoji: { fontSize: 30 },

  particle: {
    position: 'absolute',
    fontSize: 22,
    bottom: '45%',
  },
});

interface LetterCardProps {
  letter: Letter;
  isOwn: boolean;
  isNew: boolean;
  otherName: string;
  formatTime: (ts: number) => string;
  onSeen: () => void;
}

function AirmailEdge({ vertical = false }: { vertical?: boolean }) {
  return (
    <View style={vertical ? lcStyles.airmailEdgeVertical : lcStyles.airmailEdgeHorizontal}>
      {Array.from({ length: vertical ? 8 : 14 }).map((_, index) => (
        <View
          key={index}
          style={[
            lcStyles.airmailSegment,
            vertical && lcStyles.airmailSegmentVertical,
            index % 2 === 0 ? lcStyles.airmailSegmentRed : lcStyles.airmailSegmentCream,
          ]}
        />
      ))}
    </View>
  );
}

function EnvelopeFlap() {
  return (
    <View style={lcStyles.envelopeFlapWrap} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 42"
        preserveAspectRatio="none"
      >
        <Path
          d="M 0 0 H 100 C 78 8 66 32 50 38 C 34 32 22 8 0 0 Z"
          fill="#FBF6EC"
        />
        <Path
          d="M 0 0 C 22 8 34 32 50 38"
          fill="none"
          stroke="rgba(167,143,111,0.34)"
          strokeWidth="0.7"
          strokeLinecap="round"
        />
        <Path
          d="M 100 0 C 78 8 66 32 50 38"
          fill="none"
          stroke="rgba(167,143,111,0.34)"
          strokeWidth="0.7"
          strokeLinecap="round"
        />
        <Path
          d="M 0 0 C 22 7 34 30 50 36 C 66 30 78 7 100 0"
          fill="none"
          stroke="rgba(255,255,255,0.48)"
          strokeWidth="0.45"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

function LetterCard({
  letter,
  isOwn,
  otherName,
  onPress,
  isLatestReceived,
}: Omit<LetterCardProps, 'isNew' | 'onSeen' | 'formatTime'> & { onPress: () => void; isLatestReceived?: boolean }) {
  const date = new Date(letter.createdAt);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  const hhmm = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dayLabel = sameDay
    ? "Aujourd’hui"
    : isYesterday
      ? 'Hier'
      : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '');

  const preview = letter.content.trim().replace(/\s+/g, ' ');
  // Le cadre "courrier aérien" met en avant la dernière lettre reçue,
  // même si elle a déjà été lue. Les autres cartes gardent leur style enveloppe.
  const showAirmailFrame = Boolean(!isOwn && isLatestReceived);

  return (
    <TouchableOpacity style={lcStyles.wrapper} activeOpacity={0.84} onPress={onPress}>
      <View
        style={[
          lcStyles.card,
          isOwn && lcStyles.cardOwn,
          isLatestReceived && lcStyles.cardLatest,
          showAirmailFrame && lcStyles.cardAirmail,
        ]}
      >
        {showAirmailFrame ? (
          <>
            <View style={lcStyles.airmailTop}><AirmailEdge /></View>
            <View style={lcStyles.airmailBottom}><AirmailEdge /></View>
            <View style={lcStyles.airmailLeft}><AirmailEdge vertical /></View>
            <View style={lcStyles.airmailRight}><AirmailEdge vertical /></View>
          </>
        ) : (
          <EnvelopeFlap />
        )}

        <View style={lcStyles.topRow}>
          <View style={lcStyles.titleBlock}>
            <Text style={[lcStyles.header, isOwn && lcStyles.headerOwn]}>
              {isOwn ? 'Ta lettre' : `Lettre de ${otherName}`}
            </Text>
            <Text style={lcStyles.dateLine}>{dayLabel} · {hhmm}</Text>
          </View>

          <Ionicons
            name={isOwn ? 'paper-plane-outline' : 'mail'}
            size={22}
            color={isOwn ? '#8B2E3C' : '#9A8060'}
          />
        </View>

        <Text style={lcStyles.text} numberOfLines={2}>
          {preview}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const lcStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 10,
  },
  card: {
    minHeight: 104,
    backgroundColor: '#FBF6EC',
    borderRadius: 15,
    paddingHorizontal: 18,
    paddingTop: 15,
    paddingBottom: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D8CBB8',
    shadowColor: '#4A2D1A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  cardOwn: {
    backgroundColor: '#FCF6EC',
  },
  cardLatest: {
    shadowOpacity: 0.19,
    shadowRadius: 12,
    elevation: 6,
  },
  cardAirmail: {
    minHeight: 112,
    paddingTop: 18,
    paddingBottom: 16,
    borderColor: '#D6B89E',
  },

  airmailTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    overflow: 'hidden',
  },
  airmailBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 6,
    overflow: 'hidden',
  },
  airmailLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    overflow: 'hidden',
  },
  airmailRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 6,
    overflow: 'hidden',
  },
  airmailEdgeHorizontal: {
    flex: 1,
    flexDirection: 'row',
  },
  airmailEdgeVertical: {
    flex: 1,
    flexDirection: 'column',
  },
  airmailSegment: {
    flex: 1,
    transform: [{ skewX: '-26deg' }],
  },
  airmailSegmentVertical: {
    transform: [{ skewY: '-26deg' }],
  },
  airmailSegmentRed: {
    backgroundColor: '#8B2E3C',
  },
  airmailSegmentCream: {
    backgroundColor: '#F1E5D4',
  },

  envelopeFlapWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 54,
    overflow: 'hidden',
  },

  topRow: {
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  titleBlock: { flex: 1 },
  header: {
    fontSize: 15.5,
    color: '#28180F',
    fontWeight: '700',
  },
  headerOwn: {
    color: '#8B2E3C',
  },
  dateLine: {
    fontSize: 11.5,
    color: '#8B6F47',
    marginTop: 2,
  },
  text: {
    fontSize: 14.5,
    color: '#2C1A0E',
    lineHeight: 20,
    paddingRight: 26,
    zIndex: 2,
  },
});

export default function LettersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    matches, letters, lettersByMatch, questionsByMatch,
    addLetter, markLetterRead, markLetterReadApi,
    loadLetters, openAndMarkRead, sendApiLetter, loadQuestions, submitAnswers,
    loadMatches, currentUser, matchPartners,
  } = useStore();

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [loadMatches]),
  );
  const screenBg = useStore(s => s.screenBackgrounds?.['letters'] ?? '#FFF8E7');

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [showLetterPreview, setShowLetterPreview] = useState(false);
  const [readingLetter, setReadingLetter] = useState<{ letter: Letter; isOwn: boolean } | null>(null);
  const [showQGame, setShowQGame] = useState(false);
  const [qGameMatch, setQGameMatch] = useState<Match | null>(null);
  const [qSelectedAnswers, setQSelectedAnswers] = useState<Record<string, string>>({});
  const [qCurrentStep, setQCurrentStep] = useState(0);
  const [qSubmitting, setQSubmitting] = useState(false);
  const [qResult, setQResult] = useState<{ myScore: number; passed: boolean; questionsValidated: boolean; waitingForOther: boolean; matchBroken: boolean } | null>(null);

  const [envAnimVisible, setEnvAnimVisible] = useState(false);
  const [envAnimSender, setEnvAnimSender] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isActioning, setIsActioning] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('OTHER');
  const [reportDetails, setReportDetails] = useState('');
  const envAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (envAnimTimerRef.current) clearTimeout(envAnimTimerRef.current);
    };
  }, []);

  const visibleMatches = useMemo(
    () => matches.filter(m => m.status === 'pending' || m.status === 'active'),
    [matches]
  );

  const getOtherUserId = (match: Match): string => {
    const myId = currentUser?.id ?? 'me';
    return match.userAId === myId ? match.userBId : match.userAId;
  };

  // Retourne le nom affiché du partenaire (pseudo réel si disponible, sinon userId)
  const getOtherName = (match: Match): string => {
    const otherId = getOtherUserId(match);
    return matchPartners[otherId]?.pseudo ?? otherId;
  };

  // Garde l'ancienne signature pour compatibilité (utilisée dans certains endroits)
  const getOtherUserName = getOtherName;

  const getConversation = (match: Match) => {
    // Préférer les lettres API si elles ont été chargées pour ce match
    const apiLetters = lettersByMatch[match.id];
    if (apiLetters !== undefined) {
      return apiLetters;
    }
    // Fallback : lettres locales du store
    const otherId = getOtherUserId(match);
    return letters
      .filter(l => l.fromUserId === otherId || l.toUserId === otherId)
      .sort((a, b) => a.createdAt - b.createdAt);
  };

  const isMyTurn = (match: Match): boolean => {
    // Préférer canSend du backend si disponible (plus fiable)
    return match.canSend;
  };

  const wordCount = useMemo(
    () => (newMessage.trim().length === 0 ? 0 : newMessage.trim().split(/\s+/).length),
    [newMessage],
  );
  const MAX_LETTER_WORDS = 500;

  const handleSend = async (): Promise<boolean> => {
    const content = newMessage.trim();
    if (!content || !selectedMatch) return false;
    if (!selectedMatch.canSend || isSending) return false;

    const contentWordCount = content.split(/\s+/).length;
    if (contentWordCount > MAX_LETTER_WORDS) {
      Alert.alert(
        'Lettre trop longue',
        `Votre lettre contient ${contentWordCount} mots. La limite est de ${MAX_LETTER_WORDS} mots.`,
      );
      return false;
    }

    setIsSending(true);

    try {
      await sendApiLetter(selectedMatch.id, content);
      setNewMessage('');
      // Sync selectedMatch avec la mise à jour déjà faite dans le store
      const updatedMatch = useStore.getState().matches.find(m => m.id === selectedMatch.id);
      if (updatedMatch) setSelectedMatch(updatedMatch);
      return true;
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      if (msg.includes('AWAITING_REPLY') || msg.includes('alternation') || msg.includes('tour')) {
        Alert.alert('Pas encore ton tour', "Tu dois attendre la réponse de l'autre avant d'écrire à nouveau.");
      } else if (msg.includes('QUESTIONS_NOT_VALIDATED') || msg.includes('questions')) {
        Alert.alert('Questions requises', 'Joue aux questions pour débloquer les lettres.');
      } else {
        Alert.alert('Erreur', "La lettre n'a pas pu être envoyée. Vérifie ta connexion et réessaie.");
      }
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const handleAccept = async (match: Match) => {
    try {
      await acceptMatch(match.id);
      await loadMatches();
    } catch (err: any) {
      Alert.alert('Erreur', err?.message ?? "Impossible d'accepter le match");
    }
  };

  const handleQGameOpen = async (match: Match) => {
    setQGameMatch(match);
    setQSelectedAnswers({});
    setQCurrentStep(0);
    setQResult(null);
    setShowQGame(true);
    await loadQuestions(match.id);
  };

  const handleQGameSubmit = async () => {
    if (!qGameMatch) return;
    const questions = questionsByMatch[qGameMatch.id]?.questions ?? [];
    const answers = questions.map(q => ({
      profileQuestionId: q.profileQuestionId,
      answer: qSelectedAnswers[q.profileQuestionId] ?? '',
    }));
    if (answers.some(a => !a.answer)) {
      Alert.alert('Incomplet', 'Tu dois répondre à toutes les questions.');
      return;
    }
    setQSubmitting(true);
    try {
      const result = await submitAnswers(qGameMatch.id, answers);
      setQResult(result);
    } catch (err: any) {
      Alert.alert('Erreur', err?.message ?? 'Une erreur est survenue.');
    } finally {
      setQSubmitting(false);
    }
  };

  const handleBreakMatch = async () => {
    if (!selectedMatch) return;

    const confirmed = window.confirm('Rompre cette relation ? Vous ne pourrez plus vous écrire. Cette action ne peut pas être annulée.');
    if (!confirmed) return;

    setIsActioning(true);
    try {
      await breakMatch(selectedMatch.id);
      await loadMatches();
      setShowCompose(false);
      setSelectedMatch(null);
      setShowActionsMenu(false);
      alert('Relation rompue ! Le match a été terminé.');
    } catch (err: any) {
      alert('Erreur : ' + (err?.message ?? 'Impossible de rompre le match.'));
    } finally {
      setIsActioning(false);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedMatch) return;

    const confirmed = window.confirm('Bloquer cet utilisateur ? Vous ne pourrez plus interagir. Le match sera terminé.');
    if (!confirmed) return;

    setIsActioning(true);
    try {
      await blockMatch(selectedMatch.id);
      await loadMatches();
      setShowCompose(false);
      setSelectedMatch(null);
      setShowActionsMenu(false);
      alert('Utilisateur bloqué ! Vous ne verrez plus ses messages.');
    } catch (err: any) {
      alert('Erreur : ' + (err?.message ?? 'Impossible de bloquer cet utilisateur.'));
    } finally {
      setIsActioning(false);
    }
  };

  const handleReportSubmit = async () => {
    if (!selectedMatch) return;
    setIsActioning(true);
    try {
      const otherUserId = selectedMatch.userAId === (currentUser?.id ?? 'me') ? selectedMatch.userBId : selectedMatch.userAId;
      await reportUser(otherUserId, reportReason, reportDetails || undefined);
      setShowReportModal(false);
      setReportReason('OTHER');
      setReportDetails('');
      setShowActionsMenu(false);
      alert('Signalement envoyé ! Merci de votre aide pour maintenir JeuTaime sûr.');
    } catch (err: any) {
      alert('Erreur : ' + (err?.message ?? 'Impossible d\'envoyer le signalement.'));
    } finally {
      setIsActioning(false);
    }
  };

  const handleRelance = async () => {
    if (!selectedMatch) return;

    const confirmed = window.confirm('Redémarrer l\'échange ? Les deux joueurs devront répondre à nouveau au jeu des questions pour continuer.');
    if (!confirmed) return;

    setIsActioning(true);
    try {
      await relanceMatch(selectedMatch.id);
      await loadMatches();
      setShowActionsMenu(false);
      alert('Échange relancé ! Vous pouvez recommencer à vous écrire!');
    } catch (err: any) {
      alert('Erreur : ' + (err?.message ?? 'Impossible de redémarrer l\'échange.'));
    } finally {
      setIsActioning(false);
    }
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `${diffDays}j`;

    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const renderLettersContent = () => (
          <>
            <TouchableOpacity
              style={styles.duelBtn}
              onPress={() => router.push('/duel/create')}
            >
              <View style={styles.duelBtnIconBox}><MaterialCommunityIcons name="sword-cross" size={24} color="#5A3825" /></View>
              <View style={styles.duelBtnTextWrap}>
                <Text style={styles.duelBtnTitle}>Lancer un duel</Text>
                <Text style={styles.duelBtnSubtitle}>Défiez un contact en Pierre • Papier • Ciseaux</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9C3045" />
            </TouchableOpacity>

            {visibleMatches.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>✉️</Text>
                <Text style={styles.emptyText}>Aucune lettre</Text>
                <Text style={styles.emptySubtext}>
                  Réussissez des matchs pour recevoir vos premières enveloppes!
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.listCount}>
                  {visibleMatches.length} enveloppe{visibleMatches.length > 1 ? 's' : ''}
                </Text>

                {visibleMatches.map((match) => {
                  const otherUserId = getOtherUserId(match);
                  const otherName = getOtherName(match);
                  const partnerProfile = matchPartners[otherUserId];

                  return (
                    <EnvelopeCard
                      key={match.id}
                      matchId={match.id}
                      otherUserId={otherUserId}
                      otherName={otherName}
                      lastLetterAt={match.lastLetterAt}
                      unread={match.hasUnreadIncomingLetter ? 1 : 0}
                      myTurn={isMyTurn(match)}
                      letterCount={match.letterCount}
                      letterCountA={match.letterCountA}
                      letterCountB={match.letterCountB}
                      avatarConfig={partnerProfile?.avatarConfig}
                      gender={partnerProfile?.gender || 'HOMME'}
                      isPremium={currentUser?.isPremium}
                      questionsValidated={match.questionsValidated}
                      matchStatus={match.status}
                      isInitiator={match.initiatorId === (currentUser?.id ?? '')}
                      onAccept={() => handleAccept(match)}
                      onPlayQuestions={() => handleQGameOpen(match)}
                      formatTime={formatTime}
                      onOpen={() => {
                        const shouldAnimate = match.hasUnreadIncomingLetter;

                        setSelectedMatch(match);
                        setShowCompose(true);

                        // Charger les lettres ET marquer les non-lues comme lues atomiquement
                        void openAndMarkRead(match.id);

                        if (shouldAnimate) {
                          if (envAnimTimerRef.current) clearTimeout(envAnimTimerRef.current);
                          setEnvAnimSender(otherName);
                          setEnvAnimVisible(true);
                          envAnimTimerRef.current = setTimeout(() => {
                            setEnvAnimVisible(false);
                            envAnimTimerRef.current = null;
                          }, 5100);
                        }
                      }}
                      />
                  );
                })}
              </ScrollView>
            )}
          </>
        );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: screenBg }]}>
      <View style={styles.header}>
        <Text style={styles.headerKicker}>JEUTAIME</Text>
        <Text style={styles.headerTitle}>Boîte aux lettres</Text>
        <Text style={styles.headerSubtitle}>Correspondances privées</Text>
        {__DEV__ && (
          <Text style={styles.devAccountBadge}>
            Compte connecté : {currentUser?.pseudo ?? currentUser?.name ?? currentUser?.id ?? 'inconnu'}
          </Text>
        )}
      </View>

      {renderLettersContent()}

      <Modal visible={showCompose} animationType="slide">
        <KeyboardAvoidingView
          style={[styles.modalContainer, { paddingTop: insets.top }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowCompose(false); router.replace('/(tabs)/letters'); }}>
              <Text style={styles.closeText}>← Retour</Text>
            </TouchableOpacity>
            {/* Nom cliquable → profil du match (replace = démonte LettersScreen, évite modal fantôme) */}
            <TouchableOpacity
              style={styles.modalTitleBtn}
              onPress={() => { if (selectedMatch) { setShowCompose(false); router.replace({ pathname: '/profile/[id]', params: { id: getOtherUserId(selectedMatch) } }); } }}
            >
              <Text style={styles.modalTitle}>
                {selectedMatch ? getOtherName(selectedMatch) : ''}
              </Text>
              <Text style={styles.modalTitleHint}>voir le profil ↗</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => setShowActionsMenu(true)}
            >
              <Text style={styles.menuBtnText}>⋯</Text>
            </TouchableOpacity>
          </View>

          {selectedMatch && (() => {
            const conv = getConversation(selectedMatch);
            const myTurn = isMyTurn(selectedMatch);
            return (
              <>
                {/* ── Sous-titre de correspondance ── */}
                <View style={styles.correspondenceSubtitle}>
                  <Text style={styles.correspondenceSubtitleText}>
                    Votre correspondance
                    {conv.length > 0
                      ? ` · ${conv.length} lettre${conv.length > 1 ? 's' : ''} échangée${conv.length > 1 ? 's' : ''}`
                      : ''}
                  </Text>
                </View>

                {/* ── Tour de parole ── */}
                <View style={[styles.turnBanner, myTurn ? styles.turnBannerMine : styles.turnBannerWait]}>
                  <View style={styles.turnBannerInner}>
                    <Ionicons
                      name={conv.length === 0 ? 'pencil-outline' : myTurn ? 'mail-open-outline' : 'mail-outline'}
                      size={17}
                      color={myTurn ? '#D6C29A' : '#C9AD82'}
                    />
                    <Text style={styles.turnBannerText}>
                      {conv.length === 0
                        ? 'Écrivez la première lettre'
                        : myTurn
                          ? "C'est votre tour — répondez à la lettre reçue"
                          : 'Lettre envoyée — en attente de réponse'}
                    </Text>
                  </View>
                </View>
              </>
            );
          })()}

          <ScrollView style={styles.messagesContainer}>
            {selectedMatch && (() => {
              const sortedConversation = [...getConversation(selectedMatch)]
                .sort((a, b) => b.createdAt - a.createdAt);

              const latestReceivedId = sortedConversation.find((letter) => {
                const isOwn =
                  letter.fromUserId === currentUser?.id || letter.fromUserId === 'me';
                return !isOwn;
              })?.id;

              return sortedConversation.map((letter) => {
                const isOwn =
                  letter.fromUserId === currentUser?.id || letter.fromUserId === 'me';
                const otherName = getOtherName(selectedMatch);

                return (
                  <LetterCard
                    key={letter.id}
                    letter={letter}
                    isOwn={isOwn}
                    otherName={otherName}
                    formatTime={formatTime}
                    onPress={() => setReadingLetter({ letter, isOwn })}
                    isLatestReceived={!isOwn && letter.id === latestReceivedId}
                  />
                );
              });
            })()}

            {selectedMatch && getConversation(selectedMatch).length === 0 && (
              selectedMatch.canSend ? (
                <View style={styles.startConv}>
                  <Ionicons name="create-outline" size={23} color="#8B5A2B" />
                  <Text style={styles.startText}>Tu peux écrire la première lettre</Text>
                </View>
              ) : (
                <View style={styles.startConv}>
                  <Ionicons name="time-outline" size={23} color="#8B5A2B" />
                  <Text style={styles.startText}>
                    {selectedMatch.canSendReason === 'AWAITING_REPLY'
                      ? "L'autre doit envoyer la première lettre.\nTu pourras répondre ensuite."
                      : "En attente de la réponse de l'autre."}
                  </Text>
                </View>
              )
            )}
          </ScrollView>

          {selectedMatch?.canSend ? (
            <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
              <TextInput
                style={styles.input}
                placeholder="Écrire votre lettre"
                placeholderTextColor="#8B6F47"
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                editable
              />
              <View style={styles.composerFooter}>
                <Text style={[styles.wordCounter, wordCount > MAX_LETTER_WORDS && styles.wordCounterOver]}>
                  {wordCount} / {MAX_LETTER_WORDS} mots
                </Text>
                <TouchableOpacity
                  style={[
                    styles.reviewBtn,
                    (!newMessage.trim() || wordCount > MAX_LETTER_WORDS) && styles.reviewBtnDisabled,
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowLetterPreview(true);
                  }}
                  disabled={!newMessage.trim() || wordCount > MAX_LETTER_WORDS}
                >
                  <Text style={styles.reviewBtnText}>Voir l’aperçu</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.waitingComposer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
              <View style={styles.waitingComposerBar}>
                <Text style={styles.waitingComposerText} numberOfLines={1}>
                  En attente de la prochaine lettre de {selectedMatch ? getOtherName(selectedMatch) : ''}
                </Text>
                <Ionicons name="paper-plane-outline" size={22} color="#B4A28A" />
              </View>
              <Text style={styles.waitingWordCounter}>0 / {MAX_LETTER_WORDS} mots</Text>
            </View>
          )}



          {/* ── Aperçu/relecture dans LA MÊME modal native.
              iOS ne présente pas fiablement une 2e Modal par-dessus showCompose. ── */}
          {showLetterPreview && (
            <View style={[styles.previewOverlay, { paddingTop: insets.top }]}>
              <View style={styles.previewHeader}>
                <TouchableOpacity
                  onPress={() => setShowLetterPreview(false)}
                  disabled={isSending}
                >
                  <Text style={styles.closeText}>← Modifier</Text>
                </TouchableOpacity>
                <Text style={styles.previewHeaderTitle}>Aperçu de votre lettre</Text>
                <View style={{ width: 72 }} />
              </View>

              <View style={styles.previewBody}>
                <LetterPaginatedView
                  content={newMessage}
                  signatureName={currentUser?.pseudo || currentUser?.name || ''}
                  dateLabel={
                    new Date().toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                    }).replace('.', '') +
                    ' · ' +
                    new Date().toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  }
                />
              </View>

              <Text style={styles.previewReminder}>
                Après envoi, vous devrez attendre la prochaine lettre
                {selectedMatch ? ` de ${getOtherName(selectedMatch)}` : ''}.
              </Text>

              <View style={[styles.previewActions, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                <TouchableOpacity
                  style={styles.previewEditBtn}
                  onPress={() => setShowLetterPreview(false)}
                  disabled={isSending}
                >
                  <Text style={styles.previewEditBtnText}>Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.previewSendBtn, isSending && styles.reviewBtnDisabled]}
                  disabled={isSending}
                  onPress={async () => {
                    const sent = await handleSend();
                    if (sent) setShowLetterPreview(false);
                  }}
                >
                  <Text style={styles.previewSendBtnText}>
                    {isSending ? 'Envoi…' : 'Envoyer la lettre'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!!readingLetter && (
            <View style={[styles.previewOverlay, { paddingTop: insets.top }]}>
              <View style={styles.previewHeader}>
                <TouchableOpacity onPress={() => setReadingLetter(null)}>
                  <Text style={styles.closeText}>← Retour</Text>
                </TouchableOpacity>
                <Text style={styles.previewHeaderTitle}>
                  {readingLetter?.isOwn
                    ? 'Ta lettre'
                    : selectedMatch
                      ? `Lettre de ${getOtherName(selectedMatch)}`
                      : ''}
                </Text>
                <View style={{ width: 60 }} />
              </View>

              <View style={styles.previewBody}>
                {readingLetter && (
                  <LetterPaginatedView
                    content={readingLetter.letter.content}
                    signatureName={
                      readingLetter.isOwn
                        ? currentUser?.pseudo || currentUser?.name || ''
                        : selectedMatch
                          ? getOtherName(selectedMatch)
                          : ''
                    }
                    dateLabel={
                      new Date(readingLetter.letter.createdAt)
                        .toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                        })
                        .replace('.', '') +
                      ' · ' +
                      new Date(readingLetter.letter.createdAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    }
                  />
                )}
              </View>
            </View>
          )}

          {envAnimVisible && (
            <View style={styles.envAnimOverlay}>
              <PremiumLetterAnimation senderName={envAnimSender} />
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Actions Menu (Bottom Sheet) ─────────────────────────────────────── */}
      <Modal visible={showActionsMenu} transparent animationType="slide" onRequestClose={() => setShowActionsMenu(false)}>
        <View style={styles.actionsMenuOverlay}>
          <View style={styles.actionsMenuBox}>
            <View style={styles.actionsMenuHandle} />

            <TouchableOpacity
              style={styles.actionsMenuItem}
              onPress={() => {
                setShowActionsMenu(false);
                if (selectedMatch) {
                  const otherId = getOtherUserId(selectedMatch);
                  router.push({ pathname: '/profile/[id]', params: { id: otherId } });
                }
              }}
            >
              <Text style={styles.actionsMenuIcon}>👁️</Text>
              <Text style={styles.actionsMenuLabel}>Voir le profil</Text>
            </TouchableOpacity>

            {selectedMatch?.status?.toUpperCase() === 'ACTIVE' && (
              <>
                <TouchableOpacity
                  style={[styles.actionsMenuItem, styles.actionsMenuItemDanger]}
                  onPress={() => {
                    setShowActionsMenu(false);
                    handleBreakMatch();
                  }}
                  disabled={isActioning}
                >
                  <Text style={styles.actionsMenuIcon}>🚪</Text>
                  <Text style={[styles.actionsMenuLabel, styles.actionsMenuLabelDanger]}>Rompre l'échange</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionsMenuItem, styles.actionsMenuItemDanger]}
                  onPress={() => {
                    setShowActionsMenu(false);
                    handleBlockUser();
                  }}
                  disabled={isActioning}
                >
                  <Text style={styles.actionsMenuIcon}>🚫</Text>
                  <Text style={[styles.actionsMenuLabel, styles.actionsMenuLabelDanger]}>Bloquer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionsMenuItem, styles.actionsMenuItemDanger]}
                  onPress={() => {
                    setShowActionsMenu(false);
                    setShowReportModal(true);
                  }}
                  disabled={isActioning}
                >
                  <Text style={styles.actionsMenuIcon}>⚠️</Text>
                  <Text style={[styles.actionsMenuLabel, styles.actionsMenuLabelDanger]}>Signaler</Text>
                </TouchableOpacity>
              </>
            )}

            {selectedMatch?.status?.toUpperCase() === 'BROKEN' && (
              <TouchableOpacity
                style={styles.actionsMenuItem}
                onPress={() => {
                  setShowActionsMenu(false);
                  handleRelance();
                }}
                disabled={isActioning}
              >
                <Text style={styles.actionsMenuIcon}>🔄</Text>
                <Text style={styles.actionsMenuLabel}>Redémarrer l'échange</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionsMenuCancel}
              onPress={() => setShowActionsMenu(false)}
            >
              <Text style={styles.actionsMenuCancelText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Report Modal ─────────────────────────────────────── */}
      <Modal visible={showReportModal} transparent animationType="fade">
        <View style={styles.reportModalOverlay}>
          <View style={styles.reportModalBox}>
            <View style={styles.reportModalHeader}>
              <Text style={styles.reportModalTitle}>Signaler cet utilisateur</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.reportModalLabel}>Raison</Text>
            <View style={styles.reasonsContainer}>
              {(['HARASSMENT', 'SPAM', 'FAKE', 'INAPPROPRIATE_CONTENT', 'MINOR', 'OTHER'] as ReportReason[]).map(reason => (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reasonBtn, reportReason === reason && styles.reasonBtnActive]}
                  onPress={() => setReportReason(reason)}
                >
                  <Text style={[styles.reasonBtnText, reportReason === reason && styles.reasonBtnTextActive]}>
                    {reason === 'HARASSMENT' && 'Harcèlement'}
                    {reason === 'SPAM' && 'Spam'}
                    {reason === 'FAKE' && 'Faux profil'}
                    {reason === 'INAPPROPRIATE_CONTENT' && 'Contenu inapproprié'}
                    {reason === 'MINOR' && 'Mineur'}
                    {reason === 'OTHER' && 'Autre'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.reportModalLabel}>Détails (optionnel)</Text>
            <TextInput
              style={styles.reportDetailsInput}
              placeholder="Décrivez le problème..."
              placeholderTextColor="#8B6F47"
              value={reportDetails}
              onChangeText={setReportDetails}
              multiline
              numberOfLines={3}
            />

            <View style={styles.reportModalButtons}>
              <TouchableOpacity
                style={[styles.reportCancelBtn, isActioning && styles.btnDisabled]}
                onPress={() => setShowReportModal(false)}
                disabled={isActioning}
              >
                <Text style={styles.reportCancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reportSubmitBtn, isActioning && styles.btnDisabled]}
                onPress={handleReportSubmit}
                disabled={isActioning}
              >
                <Text style={styles.reportSubmitBtnText}>
                  {isActioning ? 'Envoi...' : 'Envoyer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Jeu des 3 questions ─────────────────────────────────── */}
      <Modal visible={showQGame} animationType="slide">
        <View style={[qStyles.container, { paddingTop: insets.top }]}>
          <View style={qStyles.header}>
            <TouchableOpacity onPress={() => { setShowQGame(false); setQGameMatch(null); setQResult(null); }}>
              <Text style={qStyles.back}>← Retour</Text>
            </TouchableOpacity>
            <Text style={qStyles.title}>🎮 Jeu des questions</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={qStyles.scroll}>
            {qResult ? (
              /* ── Résultat ── */
              <View style={qStyles.resultBox}>
                {qResult.matchBroken ? (
                  <>
                    <Text style={qStyles.resultEmoji}>💔</Text>
                    <Text style={qStyles.resultTitle}>Match rompu</Text>
                    <Text style={qStyles.resultSub}>
                      L'un de vous n'a pas obtenu au moins 1 bonne réponse.{'\n'}Ce match est terminé.
                    </Text>
                    <TouchableOpacity style={qStyles.closeBtn} onPress={() => { setShowQGame(false); setQResult(null); }}>
                      <Text style={qStyles.closeBtnText}>Fermer</Text>
                    </TouchableOpacity>
                  </>
                ) : qResult.waitingForOther ? (
                  <>
                    <Ionicons name="time-outline" size={34} color="#8B5A2B" />
                    <Text style={qStyles.resultTitle}>Réponses envoyées !</Text>
                    <Text style={qStyles.resultSub}>
                      Tu as obtenu {qResult.myScore}/3.{'\n'}En attente de l'autre joueur…
                    </Text>
                    <TouchableOpacity style={qStyles.closeBtn} onPress={() => { setShowQGame(false); setQResult(null); }}>
                      <Text style={qStyles.closeBtnText}>Fermer</Text>
                    </TouchableOpacity>
                  </>
                ) : qResult.questionsValidated ? (
                  <>
                    <Text style={qStyles.resultEmoji}>🎉</Text>
                    <Text style={qStyles.resultTitle}>Validé !</Text>
                    <Text style={qStyles.resultSub}>
                      Les deux joueurs ont réussi.{'\n'}Vous pouvez maintenant vous écrire!
                    </Text>
                    <TouchableOpacity
                      style={[qStyles.closeBtn, qStyles.closeBtnSuccess]}
                      onPress={() => {
                        setShowQGame(false);
                        setQResult(null);
                        if (qGameMatch) {
                          const freshMatch = matches.find(m => m.id === qGameMatch.id) ?? qGameMatch;
                          setSelectedMatch(freshMatch);
                          setShowCompose(true);
                          loadLetters(qGameMatch.id);
                        }
                      }}
                    >
                      <View style={qStyles.closeBtnContent}><Ionicons name="mail-outline" size={17} color="#FFF8E7" /><Text style={qStyles.closeBtnText}>Écrire une lettre</Text></View>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            ) : (() => {
              const matchQ = qGameMatch ? questionsByMatch[qGameMatch.id] : null;
              if (!matchQ) {
                return (
                  <View style={qStyles.loading}>
                    <ActivityIndicator color="#9C2F45" />
                    <Text style={qStyles.loadingText}>Chargement des questions…</Text>
                  </View>
                );
              }
              if (matchQ.myStatus === 'submitted') {
                return (
                  <View style={qStyles.resultBox}>
                    <Text style={qStyles.resultEmoji}>✅</Text>
                    <Text style={qStyles.resultTitle}>Déjà répondu</Text>
                    <Text style={qStyles.resultSub}>
                      Score : {matchQ.myScore}/3{'\n'}En attente de l'autre joueur…
                    </Text>
                    <TouchableOpacity style={qStyles.closeBtn} onPress={() => setShowQGame(false)}>
                      <Text style={qStyles.closeBtnText}>Fermer</Text>
                    </TouchableOpacity>
                  </View>
                );
              }
              const currentQ = matchQ.questions[qCurrentStep];
              const currentAnswer = currentQ ? qSelectedAnswers[currentQ.profileQuestionId] ?? '' : '';
              const isLast = qCurrentStep === matchQ.questions.length - 1;

              return (
                <>
                  <Text style={qStyles.intro}>
                    Réponds aux 3 questions de{' '}
                    <Text style={qStyles.introName}>{qGameMatch ? getOtherName(qGameMatch) : ''}</Text>.
                  </Text>

                  <View style={qStyles.stepRow}>
                    {matchQ.questions.map((_, i) => (
                      <View
                        key={i}
                        style={[qStyles.stepDot, i === qCurrentStep && qStyles.stepDotActive, i < qCurrentStep && qStyles.stepDotDone]}
                      />
                    ))}
                    <Text style={qStyles.stepLabel}>Question {qCurrentStep + 1} / {matchQ.questions.length}</Text>
                  </View>

                  {currentQ && (
                    <View style={qStyles.questionBlock}>
                      <Text style={qStyles.questionNum}>Question {qCurrentStep + 1}</Text>
                      <Text style={qStyles.questionText}>{currentQ.questionText}</Text>
                      {currentQ.options ? (
                        currentQ.options.map((opt) => (
                          <TouchableOpacity
                            key={opt}
                            style={[
                              qStyles.optionBtn,
                              qSelectedAnswers[currentQ.profileQuestionId] === opt && qStyles.optionBtnSelected,
                            ]}
                            onPress={() =>
                              setQSelectedAnswers(prev => ({ ...prev, [currentQ.profileQuestionId]: opt }))
                            }
                          >
                            <Text style={[
                              qStyles.optionText,
                              qSelectedAnswers[currentQ.profileQuestionId] === opt && qStyles.optionTextSelected,
                            ]}>
                              {opt}
                            </Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <TextInput
                          style={qStyles.freeInput}
                          placeholder="Ta réponse…"
                          placeholderTextColor="#9A7040"
                          value={currentAnswer}
                          onChangeText={v =>
                            setQSelectedAnswers(prev => ({ ...prev, [currentQ.profileQuestionId]: v }))
                          }
                        />
                      )}
                    </View>
                  )}

                  {isLast ? (
                    <TouchableOpacity
                      style={[qStyles.submitBtn, (qSubmitting || !currentAnswer) && qStyles.submitBtnDisabled]}
                      onPress={handleQGameSubmit}
                      disabled={qSubmitting || !currentAnswer}
                    >
                      {qSubmitting
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={qStyles.submitBtnText}>Envoyer mes réponses</Text>
                      }
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[qStyles.submitBtn, !currentAnswer && qStyles.submitBtnDisabled]}
                      disabled={!currentAnswer}
                      onPress={() => setQCurrentStep(prev => prev + 1)}
                    >
                      <Text style={qStyles.submitBtnText}>Suivant →</Text>
                    </TouchableOpacity>
                  )}
                </>
              );
            })()}
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4ECD8' },
  header: {
    paddingHorizontal: 18,
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#5A3B24',
    backgroundColor: '#2C1A0E',
  },
  headerKicker: {
    fontSize: 9.5,
    letterSpacing: 3.2,
    color: '#B87333',
    fontWeight: '700',
    marginBottom: 4,
  },
  headerTitle: { fontSize: 25, fontWeight: '800', color: '#F1DA91', letterSpacing: -0.2 },
  devAccountBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#F2D88F',
    color: '#3A2414',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#B7A28B',
    marginTop: 3,
    fontStyle: 'italic',
  },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 160 },
  listCount: {
    fontSize: 12,
    color: '#8A6B43',
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },

  duelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9EF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#CBB18B',
    shadowColor: '#4A2E19',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#3A2818' },
  emptySubtext: {
    fontSize: 14,
    color: '#8B6F47',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  duelBtnIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3E8D5', marginRight: 12 },
  duelBtnEmoji: { fontSize: 19, marginRight: 10 },
  duelBtnTextWrap: { flex: 1, minWidth: 0 },
  duelBtnTitle: { color: '#3A2818', fontSize: 13.5, fontWeight: '700' },
  duelBtnSubtitle: { color: '#9A7A55', fontSize: 10.5, marginTop: 2 },
  duelBtnArrow: { fontSize: 11, color: '#8B2E3C', marginLeft: 8 },


  modalContainer: { flex: 1, backgroundColor: '#F4ECD8' },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 100,
    backgroundColor: '#F4ECD8',
  },
  previewContainer: { flex: 1, backgroundColor: '#F4ECD8' },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#C4A882',
    backgroundColor: '#2C1A0E',
  },
  previewHeaderTitle: { fontSize: 15, fontWeight: '700', color: '#F0D98C', letterSpacing: 0.3 },
  previewBody: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    backgroundColor: '#FFFDF8',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D8C7AE',
    overflow: 'hidden',
    shadowColor: '#5A3A1A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  previewReminder: {
    fontSize: 11,
    color: '#8B6F47',
    textAlign: 'center',
    paddingHorizontal: 28,
    paddingBottom: 10,
    lineHeight: 15,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  previewEditBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 13,
    alignItems: 'center',
    backgroundColor: '#E7DCCB',
    borderWidth: 1,
    borderColor: '#D2BE9F',
  },
  previewEditBtnText: { color: '#5A3A1A', fontWeight: '700', fontSize: 14 },
  previewSendBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 13,
    alignItems: 'center',
    backgroundColor: '#8B2E3C',
    shadowColor: '#8B2E3C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 3,
  },
  previewSendBtnText: { color: '#F0D98C', fontWeight: '700', fontSize: 14 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#C4A882',
    backgroundColor: '#2C1A0E',
  },
  closeText:      { fontSize: 15, color: '#F0D98C', fontWeight: '600' },
  modalTitleBtn:  { flex: 1, alignItems: 'center' },
  modalTitle:     { fontSize: 17, fontWeight: '700', color: '#F0D98C', letterSpacing: 0.3 },
  modalTitleHint: { fontSize: 10, color: '#B87333', marginTop: 2, letterSpacing: 0.5 },
  correspondenceSubtitle: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F8F1E5',
  },
  correspondenceSubtitleText: {
    fontSize: 12,
    color: '#9A7040',
    letterSpacing: 0.3,
  },
  composeTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: '#EDE3D2',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E1D3BE',
  },
  composeTab: {
    flex: 1,
    minHeight: 46,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeTabActive: {
    backgroundColor: '#3A2415',
  },
  composeTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  composeTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5A3A1A',
  },
  composeTabTextActive: {
    color: '#F0D98C',
  },
  composeTabTextDisabled: {
    opacity: 0.38,
  },
  messagesContainer: { flex: 1, paddingHorizontal: 15, paddingTop: 13, paddingBottom: 16 },

  startConv: { alignItems: 'center', paddingVertical: 60 },
  startEmoji: { fontSize: 50, marginBottom: 12 },
  startText: { fontSize: 16, color: '#9A7040' },
  waitingComposer: {
    paddingHorizontal: 15,
    paddingTop: 10,
    backgroundColor: '#F4ECD8',
    borderTopWidth: 0,
  },
  waitingComposerBar: {
    minHeight: 52,
    borderRadius: 11,
    backgroundColor: '#DED2C2',
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 0,
  },
  waitingComposerText: {
    flex: 1,
    fontSize: 12.5,
    color: '#948574',
  },
  waitingWordCounter: {
    marginTop: 7,
    fontSize: 11.5,
    color: '#7F674E',
  },
  inputContainer: {
    flexDirection: 'column',
    paddingHorizontal: 14,
    paddingTop: 12,
    backgroundColor: '#F3EAD9',
    borderTopWidth: 1,
    borderTopColor: '#D8C7AE',
    gap: 9,
  },
  composerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  wordCounter: {
    fontSize: 12,
    color: '#8B6F47',
    letterSpacing: 0.2,
  },
  wordCounterOver: {
    color: '#E07856',
    fontWeight: '700',
  },
  reviewBtn: {
    minWidth: 126,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#8B2E3C',
    alignItems: 'center',
  },
  reviewBtnDisabled: {
    backgroundColor: '#5A3A1A',
    opacity: 0.6,
  },
  reviewBtnText: {
    color: '#F0D98C',
    fontWeight: '700',
    fontSize: 13,
  },
  input: {
    flex: 1,
    minHeight: 50,
    backgroundColor: '#FFFDF8',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#CBB18B',
    maxHeight: 112,
    color: '#2C1A0E',
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#8B2E3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText:     { fontSize: 18, color: '#FFF' },
  sendBtnDisabled: { opacity: 0.4 },

  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  menuBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF8E7',
  },

  actionsMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  actionsMenuBox: {
    backgroundColor: '#FEFAF0',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 28,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  actionsMenuHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#D4B896',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  actionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#F5EFDA',
    gap: 12,
  },
  actionsMenuItemDanger: {
    backgroundColor: '#FFE5E5',
  },
  actionsMenuIcon: {
    fontSize: 20,
  },
  actionsMenuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C1A0E',
    flex: 1,
  },
  actionsMenuLabelDanger: {
    color: '#9C2F45',
  },
  actionsMenuCancel: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: '#E8D9C6',
    alignItems: 'center',
  },
  actionsMenuCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5A3A1A',
  },
  btnDisabled: { opacity: 0.5 },

  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  reportModalBox: {
    backgroundColor: '#FEFAF0',
    borderRadius: 14,
    padding: 16,
    width: '100%',
    maxWidth: 380,
  },
  reportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  reportModalTitle: { fontSize: 16, fontWeight: '700', color: '#2C1A0E' },
  reportModalLabel: {
    fontSize: 12,    fontWeight: '600',
    color: '#3A2818',
    marginTop: 10,
    marginBottom: 6,
  },
  reasonsContainer: {
    gap: 6,
  },
  reasonBtn: {
    borderWidth: 1,
    borderColor: '#D4B896',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  reasonBtnActive: {
    backgroundColor: '#FFE5E5',
    borderColor: '#9C2F45',
  },
  reasonBtnText: { fontSize: 12, color: '#5A3A1A', fontWeight: '500' },
  reasonBtnTextActive: { color: '#9C2F45', fontWeight: '700' },
  reportDetailsInput: {
    borderWidth: 1,
    borderColor: '#D4B896',
    borderRadius: 6,
    padding: 10,
    fontSize: 12,
    color: '#2C1A0E',
    marginTop: 8,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  reportModalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  reportCancelBtn: {
    flex: 1,
    backgroundColor: '#E8D9C6',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  reportCancelBtnText: { color: '#5A3A1A', fontWeight: '600', fontSize: 13 },
  reportSubmitBtn: {
    flex: 1,
    backgroundColor: '#9C2F45',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  reportSubmitBtnText: { color: '#FFF', fontWeight: '600', fontSize: 13 },

  relationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1C1208',
    borderBottomWidth: 1,
    borderBottomColor: '#3A2818',
    gap: 10,
  },
  relationBannerStars:    { fontSize: 16 },
  relationBannerText:     { flex: 1 },
  relationBannerLevel:    { fontSize: 13, fontWeight: '700', color: '#D4A862' },
  relationBannerProgress: { fontSize: 11, color: '#8B6F47', marginTop: 2, fontStyle: 'italic' },

  turnBanner: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 0,
  },
  turnBannerMine: { backgroundColor: '#1A2E1A' },
  turnBannerWait: { backgroundColor: '#2C1A0E' },
  turnBannerText: { fontSize: 12.5, fontWeight: '600', color: '#D1B98F' },

});

// ── Styles du jeu des 3 questions ────────────────────────────────
const qStyles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#FFF8E7' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E8D9C6' },
  back:           { fontSize: 15, color: '#9C2F45', fontWeight: '600' },
  title:          { fontSize: 17, fontWeight: '700', color: '#2C1A0E' },
  scroll:         { padding: 20, paddingBottom: 60 },
  loading:        { alignItems: 'center', marginTop: 60, gap: 12 },
  loadingText:    { color: '#7A5C3A', fontSize: 15 },
  intro:          { fontSize: 14, color: '#5A3A1A', lineHeight: 22, marginBottom: 24, textAlign: 'center' },
  introName:      { fontWeight: '700', color: '#9C2F45' },
  stepRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  stepDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D4B896' },
  stepDotActive:  { backgroundColor: '#9C2F45', width: 10, height: 10, borderRadius: 5 },
  stepDotDone:    { backgroundColor: '#B87333' },
  stepLabel:      { fontSize: 11, color: '#9A7040', letterSpacing: 1, fontWeight: '600', marginLeft: 4 },
  questionBlock:  { backgroundColor: '#FEFAF0', borderRadius: 14, borderWidth: 1, borderColor: '#D4B896', padding: 16, marginBottom: 20 },
  questionNum:    { fontSize: 11, color: '#B87333', fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  questionText:   { fontSize: 16, fontWeight: '600', color: '#2C1A0E', marginBottom: 14, lineHeight: 22 },
  optionBtn:      { borderWidth: 1, borderColor: '#D4B896', borderRadius: 10, padding: 12, marginBottom: 8 },
  optionBtnSelected: { borderColor: '#9C2F45', backgroundColor: '#FFF0F2' },
  optionText:     { fontSize: 14, color: '#5A3A1A' },
  optionTextSelected: { color: '#9C2F45', fontWeight: '600' },
  freeInput:      { borderWidth: 1, borderColor: '#D4B896', borderRadius: 10, padding: 12, fontSize: 14, color: '#2C1A0E' },
  submitBtn:      { backgroundColor: '#9C2F45', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText:  { color: '#FFF', fontSize: 16, fontWeight: '700' },
  resultBox:      { alignItems: 'center', paddingVertical: 40, gap: 16 },
  resultEmoji:    { fontSize: 56 },
  resultTitle:    { fontSize: 22, fontWeight: '700', color: '#2C1A0E' },
  resultSub:      { fontSize: 14, color: '#7A5C3A', textAlign: 'center', lineHeight: 22 },
  closeBtn:       { backgroundColor: '#5A3A1A', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  closeBtnSuccess:{ backgroundColor: '#9C2F45' },
  closeBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  closeBtnText:   { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
// Build cache bust: 1779184220