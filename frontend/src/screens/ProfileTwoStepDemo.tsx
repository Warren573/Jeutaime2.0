import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { useStore } from "../store/useStore";
import { Avatar } from "../avatar/png/Avatar";
import { resolveAvatarConfig } from "../avatar/resolveAvatarConfig";
import { getRelationInfo } from "../engine/RelationEngine";
import {
  blockProfile,
  discoverProfiles,
  reportUser,
  type DiscoveryProfileDto,
  type ReportReason,
} from "../api/profiles";
import { sendReaction } from "../api/reactions";
import {
  APP_COLORS,
  APP_COMPONENTS,
  APP_RADIUS,
  APP_SHADOWS,
  APP_SIZES,
  APP_SPACING,
} from "../theme/appTheme";

const PHYSIQUE_LABEL: Record<string, { emoji: string; label: string }> = {
  filiforme: { emoji: "🍝", label: "Filiforme" },
  ras_motte: { emoji: "🐭", label: "Ras motte" },
  grande_gigue: { emoji: "🦒", label: "Grande gigue" },
  doux: { emoji: "✨", label: "Grande beauté intérieure" },
  athletique: { emoji: "🏃", label: "Athlétique" },
  costaud: { emoji: "🍑", label: "En formes généreuses" },
  mignon: { emoji: "⚖️", label: "Moyenne" },
  mysterieux: { emoji: "💪", label: "Musclé•e" },
};

const LOOKING_FOR_LABEL: Record<string, string> = {
  relation: "J'ai vu de la lumière, je suis entré·e",
  flirt: "Rien de trop sérieux",
  amitie: "Des affinités, d'abord",
  discussion: "Je cherche à discuter",
  serieux: "Je cherche l'âme sœur",
  RELATION: "J'ai vu de la lumière, je suis entré·e",
  FLIRT: "Rien de trop sérieux",
  AMITIE: "Des affinités, d'abord",
  DISCUSSION: "Je cherche à discuter",
  SERIEUX: "Je cherche l'âme sœur",
};

const REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'HARASSMENT', label: 'Harcèlement' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'FAKE', label: 'Faux profil' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Contenu inapproprié' },
  { value: 'MINOR', label: 'Mineur' },
  { value: 'OTHER', label: 'Autre' },
];

function computeAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age >= 0 ? age : null;
}

export function RelationLevelBadge({
  letterCount,
  isPremium = false,
  compact = false,
}: {
  letterCount: number;
  isPremium?: boolean;
  compact?: boolean;
}) {
  const info = getRelationInfo(letterCount, isPremium);
  return (
    <View style={[badgeStyles.container, compact && badgeStyles.containerCompact]}>
      <View style={badgeStyles.topRow}>
        <Text style={badgeStyles.stars}>{info.stars}</Text>
        <Text style={badgeStyles.label}>Niveau {info.level} — {info.label}</Text>
      </View>
      {!compact && info.progressText && (
        <Text style={badgeStyles.progress}>{info.progressText}</Text>
      )}
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  container: {
    backgroundColor: APP_COLORS.paperSoft,
    borderRadius: APP_RADIUS.md,
    paddingHorizontal: APP_SPACING.sm,
    paddingVertical: APP_SPACING.xs,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    marginTop: APP_SPACING.xs,
  },
  containerCompact: { paddingHorizontal: 10, paddingVertical: 6, marginTop: 6 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stars: { fontSize: 14 },
  label: { fontSize: 13, fontWeight: "700", color: APP_COLORS.text },
  progress: { fontSize: 12, color: APP_COLORS.muted, marginTop: 5, fontStyle: "italic" },
});

export function ProfileMedia({
  avatarConfig,
  photoUri,
  visibility,
  size,
}: {
  avatarConfig: Record<string, unknown>;
  photoUri?: string;
  visibility: "avatar" | "blurred" | "revealed";
  size: number;
}) {
  if (visibility === "avatar" || !photoUri) {
    return <Avatar size={size} {...avatarConfig} />;
  }
  return (
    <Image
      source={{ uri: photoUri }}
      style={{ width: size, height: size, borderRadius: size * 0.12 }}
      contentFit="cover"
      blurRadius={visibility === "blurred" ? 20 : 0}
    />
  );
}

export default function ProfileTwoStepDemo() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ filter?: string }>();
  const currentUser = useStore((s) => s.currentUser);
  const allMatches = useStore((s) => s.matches);
  const matchPartners = useStore((s) => s.matchPartners);
  const loadMatches = useStore((s) => s.loadMatches);

  const isReceivedSmilesFilter = searchParams.filter === 'received-smiles';

  const [currentProfile, setCurrentProfile] = useState<DiscoveryProfileDto | null>(null);
  const [remainingProfiles, setRemainingProfiles] = useState<DiscoveryProfileDto[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reacting, setReacting] = useState(false);
  const [showSafetyMenu, setShowSafetyMenu] = useState(false);
  const [showReportReasons, setShowReportReasons] = useState(false);
  const [safetyActioning, setSafetyActioning] = useState(false);

  useEffect(() => {
    setCurrentProfile(null);
    setRemainingProfiles([]);
    setRemovedIds(new Set());
    setError(null);
    setShowSafetyMenu(false);
    setShowReportReasons(false);
  }, [currentUser?.id]);

  const load = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    setError(null);
    try {
      if (isReceivedSmilesFilter && allMatches.length > 0) {
        const receivedSmileProfiles = allMatches
          .filter((m) => m.initiatorId !== currentUser.id)
          .map((m) => {
            const otherUserId = m.userAId === currentUser.id ? m.userBId : m.userAId;
            return { match: m, otherUserId };
          })
          .filter(({ otherUserId }) => !removedIds.has(otherUserId))
          .map(({ match, otherUserId }) => {
            const partner = matchPartners[otherUserId];
            return {
              userId: otherUserId,
              pseudo: partner?.pseudo ?? "Anonyme",
              birthDate: partner?.birthDate ? String(partner.birthDate) : undefined,
              gender: "AUTRE" as const,
              city: partner?.city ?? "",
              bio: partner?.bio ?? "",
              physicalDesc: partner?.physicalDesc,
              avatarConfig: partner?.avatarConfig,
              verified: false,
              photoUri: undefined,
              visibility: "avatar" as const,
              lookingFor: [],
              points: 0,
              badges: [],
            };
          })
          .filter((p, idx, arr) => arr.findIndex((a) => a.userId === p.userId) === idx);

        setCurrentProfile(receivedSmileProfiles[0] ?? null);
        setRemainingProfiles(receivedSmileProfiles.slice(1));
      } else {
        const result = await discoverProfiles({ pageSize: 50 });
        const filtered = result.data.filter(
          (p) => p.userId !== currentUser.id && !removedIds.has(p.userId),
        );
        setCurrentProfile(filtered[0] ?? null);
        setRemainingProfiles(filtered.slice(1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, removedIds, isReceivedSmilesFilter, allMatches, matchPartners]);

  useEffect(() => {
    if (currentUser?.id) load();
  }, [currentUser?.id]);

  const profile = currentProfile;
  const displayedProfile = profile;

  const advanceAfterSafetyAction = () => {
    if (!currentProfile) return;
    const next = remainingProfiles[0] ?? null;
    const newRemovedIds = new Set(removedIds);
    newRemovedIds.add(currentProfile.userId);
    setCurrentProfile(next);
    setRemainingProfiles(remainingProfiles.slice(1));
    setRemovedIds(newRemovedIds);
    setShowSafetyMenu(false);
    setShowReportReasons(false);
  };

  const handleBlockProfile = async () => {
    if (!profile || safetyActioning) return;
    const confirmed = typeof globalThis.confirm === 'function'
      ? globalThis.confirm('Bloquer cette personne ?\n\nSon profil ne vous sera plus proposé et vous ne pourrez plus interagir ensemble.')
      : true;
    if (!confirmed) return;

    setSafetyActioning(true);
    try {
      await blockProfile(profile.userId);
      advanceAfterSafetyAction();
      Alert.alert('Personne bloquée', 'Ce profil a bien été bloqué.');
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible de bloquer ce profil');
    } finally {
      setSafetyActioning(false);
    }
  };

  const handleReportProfile = async (reason: ReportReason) => {
    if (!profile || safetyActioning) return;
    setSafetyActioning(true);
    try {
      await reportUser(profile.userId, reason);
      advanceAfterSafetyAction();
      Alert.alert('Signalement envoyé', 'Merci, votre signalement a bien été transmis.');
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : "Impossible d'envoyer le signalement");
    } finally {
      setSafetyActioning(false);
    }
  };

  const handleReact = async (type: "SMILE" | "GRIMACE", targetProfile: DiscoveryProfileDto | null) => {
    if (!targetProfile || reacting || !currentUser?.id) return;
    if (targetProfile.userId === currentUser.id) {
      Alert.alert('Erreur', 'Tu ne peux pas réagir à ton propre profil');
      return;
    }

    const previousCurrent = currentProfile;
    const previousRemaining = remainingProfiles;
    const previousRemovedIds = removedIds;

    setReacting(true);
    setShowSafetyMenu(false);
    setShowReportReasons(false);

    const next = remainingProfiles[0] ?? null;
    const newRemaining = remainingProfiles.slice(1);
    const newRemovedIds = new Set(removedIds);
    newRemovedIds.add(targetProfile.userId);

    setCurrentProfile(next);
    setRemainingProfiles(newRemaining);
    setRemovedIds(newRemovedIds);

    try {
      const result = await sendReaction(targetProfile.userId, type);
      if (type === "SMILE" && result.debugBranch === "NEW-MATCH") {
        await loadMatches();
        router.push("/(tabs)/letters");
      }
    } catch (err) {
      setCurrentProfile(previousCurrent);
      setRemainingProfiles(previousRemaining);
      setRemovedIds(previousRemovedIds);
      Alert.alert("Erreur", err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setReacting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={APP_COLORS.burgundy} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.emptyTitle}>Aucun profil à découvrir</Text>
        <Text style={styles.emptyText}>Reviens plus tard ou modifie tes filtres.</Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>Actualiser</Text>
        </Pressable>
      </View>
    );
  }

  const age = computeAge(profile.birthDate ?? undefined);
  const avatarResolution = resolveAvatarConfig(
    profile.userId,
    profile.avatarConfig,
    profile.gender,
    'ProfileTwoStepDemo',
  );
  const avatarConfig = avatarResolution.config;
  const physique = profile.physicalDesc
    ? PHYSIQUE_LABEL[profile.physicalDesc] ?? { emoji: "✨", label: profile.physicalDesc }
    : null;
  const intentionSentence = (profile.lookingFor ?? [])
    .map((id) => LOOKING_FOR_LABEL[id] ?? id)
    .join(" · ");
  const displayName = (profile.pseudo ?? "").trim();
  const headerLine = [displayName, age !== null ? String(age) : ""].filter(Boolean).join(", ");
  const displayBio = (profile.bio ?? "").trim();
  const displayCity = (profile.city ?? "").trim();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.stageOneContent}>
        <View style={styles.stageOneCard}>
          <View style={styles.topBar}>
            <Text style={styles.topBarTitle}>
              {isReceivedSmilesFilter ? 'Sourires Reçus' : 'Découvrir'}
            </Text>
            <View style={styles.topBarRight}>
              <View style={styles.progressBadge}>
                <Text style={styles.progressBadgeText}>
                  {remainingProfiles.length + 1} restant{remainingProfiles.length > 0 ? 's' : ''}
                </Text>
              </View>
              <Pressable
                style={styles.safetyButton}
                onPress={() => {
                  setShowReportReasons(false);
                  setShowSafetyMenu((value) => !value);
                }}
                disabled={safetyActioning}
              >
                <Text style={styles.safetyButtonText}>⚠️</Text>
              </Pressable>
            </View>

            {showSafetyMenu && (
              <View style={styles.safetyMenu}>
                {!showReportReasons ? (
                  <>
                    <Pressable style={styles.safetyMenuItem} onPress={() => setShowReportReasons(true)}>
                      <Text style={styles.safetyMenuText}>⚠️ Signaler</Text>
                    </Pressable>
                    <Pressable style={styles.safetyMenuItem} onPress={() => void handleBlockProfile()} disabled={safetyActioning}>
                      <Text style={[styles.safetyMenuText, styles.safetyMenuDanger]}>🚫 Bloquer</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={styles.safetyMenuTitle}>Motif du signalement</Text>
                    {REPORT_REASONS.map(({ value, label }) => (
                      <Pressable
                        key={value}
                        style={styles.reasonMenuItem}
                        onPress={() => void handleReportProfile(value)}
                        disabled={safetyActioning}
                      >
                        <Text style={styles.reasonMenuText}>{label}</Text>
                      </Pressable>
                    ))}
                    <Pressable style={styles.reasonBack} onPress={() => setShowReportReasons(false)}>
                      <Text style={styles.reasonBackText}>← Retour</Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}
          </View>

          <View style={styles.stageOneHeader}>
            <View style={styles.photoCard}>
              <View style={styles.photoTape} />
              <ProfileMedia avatarConfig={avatarConfig} visibility="avatar" size={96} />
            </View>

            <View style={styles.stageOneHeaderText}>
              {!!headerLine && <Text style={styles.stageOneName}>{headerLine}</Text>}
              {!!displayCity && <Text style={styles.metaInline}>📍 {displayCity}</Text>}
              <View style={styles.arrowLineWrap}>
                <Text style={styles.arrowLine}>⟵ 〜〜〜〜〜〜〜〜〜</Text>
              </View>
            </View>
          </View>

          {!!displayBio && <Text style={styles.stageOneBlabla}>{displayBio}</Text>}
          {!!intentionSentence && <Text style={styles.vibeTag}>{intentionSentence}</Text>}
          {physique && <Text style={styles.vibeTag}>{physique.emoji} {physique.label}</Text>}

          <Pressable
            onPress={() => router.push({ pathname: '/profile/[id]', params: { id: profile.userId } })}
            style={styles.discoverWrap}
          >
            <Text style={styles.discoverLink}>Découvrir le profil →</Text>
          </Pressable>

          <View style={styles.stageOneActions}>
            <Pressable
              style={[styles.actionButton, styles.actionBad, reacting && styles.actionDisabled]}
              onPress={() => displayedProfile && handleReact("GRIMACE", displayedProfile)}
              disabled={reacting}
            >
              <Text style={styles.actionText}>😬 Grimace</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.actionGood, reacting && styles.actionDisabled]}
              onPress={() => displayedProfile && handleReact("SMILE", displayedProfile)}
              disabled={reacting}
            >
              <Text style={styles.actionText}>😊 Sourire</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const BG = APP_COLORS.background;
const PAPER = APP_COLORS.paper;
const INK = APP_COLORS.ink;
const INK_SOFT = APP_COLORS.muted;
const LINE = APP_COLORS.border;
const RED = APP_COLORS.danger;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  centered: { alignItems: "center", justifyContent: "center", padding: APP_SPACING.xl },
  loadingText: { fontSize: 16, color: INK_SOFT, marginTop: APP_SPACING.sm },
  errorText: { fontSize: 16, color: RED, textAlign: "center", marginBottom: APP_SPACING.md },
  emptyTitle: { fontSize: 22, fontWeight: "800", color: INK, marginBottom: APP_SPACING.xs, textAlign: "center" },
  emptyText: { fontSize: 16, color: INK_SOFT, textAlign: "center", marginBottom: APP_SPACING.lg, lineHeight: 24 },
  retryBtn: {
    ...APP_COMPONENTS.secondaryButton,
    paddingHorizontal: APP_SPACING.lg,
  },
  retryBtnText: { fontSize: 15, fontWeight: "700", color: APP_COLORS.burgundy },
  stageOneContent: {
    paddingHorizontal: APP_SIZES.screenPadding,
    paddingBottom: APP_SPACING.xxl,
    paddingTop: APP_SPACING.sm,
  },
  stageOneCard: {
    backgroundColor: PAPER,
    borderRadius: APP_RADIUS.xl,
    borderWidth: 1,
    borderColor: LINE,
    paddingHorizontal: APP_SPACING.lg,
    paddingVertical: APP_SPACING.lg,
    ...(APP_SHADOWS.elevated ?? {}),
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: APP_SPACING.md,
    position: 'relative',
    zIndex: 30,
  },
  topBarTitle: { fontSize: 18, color: INK, fontWeight: "800" },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: APP_SPACING.xs },
  progressBadge: {
    backgroundColor: APP_COLORS.paperSoft,
    borderRadius: APP_RADIUS.pill,
    borderWidth: 1,
    borderColor: LINE,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  progressBadgeText: { fontSize: 12, color: INK_SOFT, fontWeight: "700" },
  safetyButton: {
    width: APP_SIZES.touchTarget,
    height: APP_SIZES.touchTarget,
    borderRadius: APP_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.paperSoft,
    borderWidth: 1,
    borderColor: LINE,
  },
  safetyButtonText: { fontSize: 20 },
  safetyMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 210,
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: LINE,
    paddingVertical: APP_SPACING.xs,
    paddingHorizontal: APP_SPACING.xs,
    ...(APP_SHADOWS.elevated ?? {}),
  },
  safetyMenuItem: { paddingHorizontal: APP_SPACING.sm, paddingVertical: APP_SPACING.sm },
  safetyMenuText: { fontSize: 15, fontWeight: '700', color: INK },
  safetyMenuDanger: { color: APP_COLORS.danger },
  safetyMenuTitle: { fontSize: 13, fontWeight: '800', color: INK_SOFT, paddingHorizontal: 10, paddingVertical: APP_SPACING.xs },
  reasonMenuItem: { paddingHorizontal: 10, paddingVertical: 9, borderRadius: APP_RADIUS.sm },
  reasonMenuText: { fontSize: 14, color: INK, fontWeight: '600' },
  reasonBack: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: APP_SPACING.xs, marginTop: 4, borderTopWidth: 1, borderTopColor: LINE },
  reasonBackText: { fontSize: 14, fontWeight: '700', color: APP_COLORS.burgundy },
  stageOneHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: APP_SPACING.lg },
  photoCard: {
    width: 126,
    height: 156,
    borderRadius: APP_RADIUS.md,
    backgroundColor: APP_COLORS.white,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: APP_SPACING.md,
    ...(APP_SHADOWS.card ?? {}),
  },
  photoTape: {
    position: "absolute",
    top: -7,
    alignSelf: "center",
    width: 44,
    height: 14,
    backgroundColor: "#E8D8C2",
    borderRadius: 2,
    transform: [{ rotate: "-6deg" }],
    zIndex: 3,
  },
  stageOneHeaderText: { flex: 1, paddingTop: 4 },
  stageOneName: { fontSize: 32, lineHeight: 37, fontWeight: "800", color: INK, marginBottom: 6 },
  metaInline: { fontSize: 15, color: INK_SOFT, marginBottom: 6 },
  arrowLineWrap: { marginTop: 4, marginBottom: APP_SPACING.xs },
  arrowLine: { fontSize: 14, color: APP_COLORS.borderStrong, letterSpacing: 1 },
  stageOneBlabla: { fontSize: 24, lineHeight: 38, color: INK, marginBottom: APP_SPACING.md, letterSpacing: -0.2 },
  vibeTag: { fontSize: 16, color: INK_SOFT, fontStyle: "italic", marginBottom: 10 },
  discoverWrap: { alignSelf: "flex-start", marginBottom: APP_SPACING.lg, minHeight: APP_SIZES.touchTarget, justifyContent: 'center' },
  discoverLink: { fontSize: 17, color: APP_COLORS.burgundy, fontWeight: "700" },
  stageOneActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: APP_SPACING.sm },
  actionButton: {
    flex: 1,
    minHeight: APP_SIZES.buttonHeightLarge,
    borderRadius: APP_RADIUS.lg,
    paddingHorizontal: APP_SPACING.sm,
    alignItems: "center",
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionBad: { backgroundColor: "#F7E7E8", borderColor: "#E5C8CB" },
  actionGood: { backgroundColor: "#E7F1E8", borderColor: "#CADFCF" },
  actionDisabled: { opacity: 0.5 },
  actionText: { fontSize: 16, color: INK, fontWeight: "800" },
  secondeChanceWrap: { alignItems: "center", marginTop: 14, paddingBottom: 4 },
  secondeChanceLink: { fontSize: 15, color: INK_SOFT, fontStyle: "italic", opacity: 0.7 },
});
