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
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { useStore } from "../store/useStore";
import { Avatar } from "../avatar/png/Avatar";
import { DEFAULT_AVATAR } from "../avatar/png/defaults";
import { getRelationInfo } from "../engine/RelationEngine";
import { discoverProfiles, type DiscoveryProfileDto } from "../api/profiles";
import { sendReaction } from "../api/reactions";
import { getBackendVersion, type BackendVersion } from "../api/version";
import { API_URL } from "../api/client";

// ─── Lookup tables ─────────────────────────────────────────────────────────

const PHYSIQUE_LABEL: Record<string, { emoji: string; label: string }> = {
  filiforme:    { emoji: "🍝", label: "Filiforme" },
  ras_motte:    { emoji: "🐭", label: "Ras motte" },
  grande_gigue: { emoji: "🦒", label: "Grande gigue" },
  doux:         { emoji: "✨", label: "Grande beauté intérieure" },
  athletique:   { emoji: "🏃", label: "Athlétique" },
  costaud:      { emoji: "🍑", label: "En formes généreuses" },
  mignon:       { emoji: "⚖️", label: "Moyenne" },
  mysterieux:   { emoji: "💪", label: "Musclé•e" },
};

const LOOKING_FOR_LABEL: Record<string, string> = {
  relation:   "J'ai vu de la lumière, je suis entré·e",
  flirt:      "Rien de trop sérieux",
  amitie:     "Des affinités, d'abord",
  discussion: "Je cherche à discuter",
  serieux:    "Je cherche l'âme sœur",
  RELATION:   "J'ai vu de la lumière, je suis entré·e",
  FLIRT:      "Rien de trop sérieux",
  AMITIE:     "Des affinités, d'abord",
  DISCUSSION: "Je cherche à discuter",
  SERIEUX:    "Je cherche l'âme sœur",
};

// ─── Helpers ───────────────────────────────────────────────────────────────

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

// ─── Exported sub-components (kept for future reuse) ──────────────────────

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
  container:        { backgroundColor: "#F9EFDB", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#E8D5B7", marginTop: 10 },
  containerCompact: { paddingHorizontal: 10, paddingVertical: 6, marginTop: 6 },
  topRow:           { flexDirection: "row", alignItems: "center", gap: 8 },
  stars:            { fontSize: 14 },
  label:            { fontSize: 13, fontWeight: "700", color: "#6B4C30" },
  progress:         { fontSize: 12, color: "#8B6F47", marginTop: 5, fontStyle: "italic" },
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

// ─── Discovery screen ──────────────────────────────────────────────────────

export default function ProfileTwoStepDemo() {
  const router = useRouter();
  const currentUser  = useStore((s) => s.currentUser);
  const loadMatches  = useStore((s) => s.loadMatches);

  const [currentProfile, setCurrentProfile] = useState<DiscoveryProfileDto | null>(null);
  const [remainingProfiles, setRemainingProfiles] = useState<DiscoveryProfileDto[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reacting, setReacting] = useState(false);
  const [lastActionDebug, setLastActionDebug] = useState('');
  const [rawResponse, setRawResponse] = useState<string>('');
  const [backendVersion, setBackendVersion] = useState<BackendVersion | null>(null);

  // Clear discovery on user change
  useEffect(() => {
    setCurrentProfile(null);
    setRemainingProfiles([]);
    setRemovedIds(new Set());
    setCurrentProfile(null);
    setError(null);
    setLastActionDebug('');
  }, [currentUser?.id]);

  const load = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await discoverProfiles({ pageSize: 50 });
      const filtered = result.data.filter(
        (p) => p.userId !== currentUser.id && !removedIds.has(p.userId)
      );
      setCurrentProfile(filtered[0] ?? null);
      setRemainingProfiles(filtered.slice(1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, removedIds]);

  useEffect(() => {
    if (currentUser?.id) {
      load();
    }
  }, [currentUser?.id]);

  useEffect(() => {
    getBackendVersion().then(setBackendVersion);
  }, []);

  const profile = currentProfile;
  const displayedProfile = profile;

  const handleReact = async (type: "SMILE" | "GRIMACE", targetProfile: DiscoveryProfileDto | null) => {
    setLastActionDebug(`CLICK ${type} profile=${!!targetProfile} reacting=${reacting} user=${!!currentUser?.id}\nPROFILE_ID=${targetProfile?.userId}`);

    if (!targetProfile) {
      setLastActionDebug('BLOCKED no profile');
      return;
    }
    if (reacting) {
      setLastActionDebug('BLOCKED reacting');
      return;
    }
    if (!currentUser?.id) {
      setLastActionDebug('BLOCKED no user');
      return;
    }
    if (targetProfile.userId === currentUser.id) {
      setLastActionDebug('BLOCKED_SELF_PROFILE');
      Alert.alert('Erreur', 'Tu ne peux pas réagir à ton propre profil');
      return;
    }

    const previousCurrent = currentProfile;
    const previousRemaining = remainingProfiles;
    const previousRemovedIds = removedIds;

    setReacting(true);

    const next = remainingProfiles[0] ?? null;
    const newRemaining = remainingProfiles.slice(1);
    const newRemovedIds = new Set(removedIds);
    newRemovedIds.add(targetProfile.userId);

    setCurrentProfile(next);
    setRemainingProfiles(newRemaining);
    setRemovedIds(newRemovedIds);
    setLastActionDebug(`REMOVED=${targetProfile.userId} NEXT=${next?.userId ?? 'EMPTY'} REMAINING=${newRemaining.length}`);

    try {
      const result = await sendReaction(targetProfile.userId, type);
      const rawStr = JSON.stringify(result, null, 0);
      setRawResponse(rawStr);
      setLastActionDebug(`API_RESULT source=${(result as any).source ?? 'unknown'} debugBranch=${result.debugBranch ?? 'none'} matchCreated=${result.matchCreated} matchId=${result.matchId ?? 'null'}`);

      if (type === "SMILE" && result.debugBranch === "NEW-MATCH") {
        setLastActionDebug(
          `NEW_MATCH_RECEIVED=true matchId=${result.matchId}\n` +
          `LOADING_MATCHES...`
        );
        const storeStateBefore = require('../store/useStore').useStore.getState();
        const matchCountBefore = storeStateBefore.matches?.length ?? 0;

        await loadMatches();

        const storeStateAfter = require('../store/useStore').useStore.getState();
        const matchesAfter = storeStateAfter.matches ?? [];
        const matchCountAfter = matchesAfter.length;
        const newMatch = matchesAfter.find(m => m.id === result.matchId);

        setLastActionDebug(
          `NEW_MATCH_RECEIVED=true\n` +
          `LOAD_MATCHES_RAW_COUNT=${matchCountAfter}\n` +
          `LOAD_MATCHES_VISIBLE_COUNT=${matchesAfter.filter(m => m.status === 'pending' || m.status === 'active').length}\n` +
          `MATCH_FOUND=${!!newMatch}\n` +
          `MATCH_STATUS=${newMatch?.status ?? 'NOT_FOUND'}\n` +
          `NAVIGATING_TO_LETTERS...`
        );
        router.push("/(tabs)/letters");
        setLastActionDebug(
          `NEW_MATCH_RECEIVED=true\n` +
          `LOAD_MATCHES_RAW_COUNT=${matchCountAfter}\n` +
          `LOAD_MATCHES_VISIBLE_COUNT=${matchesAfter.filter(m => m.status === 'pending' || m.status === 'active').length}\n` +
          `MATCH_FOUND=${!!newMatch}\n` +
          `MATCH_STATUS=${newMatch?.status ?? 'NOT_FOUND'}\n` +
          `NAVIGATED_TO_LETTERS=true`
        );
      }
    } catch (err) {
      setCurrentProfile(previousCurrent);
      setRemainingProfiles(previousRemaining);
      setRemovedIds(previousRemovedIds);
      const msg = err instanceof Error ? err.message : "Erreur lors de l'envoi";
      setLastActionDebug(`API_ERROR ${msg}`);
      Alert.alert("Erreur", msg);
    } finally {
      setReacting(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color="#9C7A4D" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  // ── Error ──
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

  // ── Empty ──
  if (!profile) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.emptyTitle}>Aucun profil à découvrir</Text>
        <Text style={styles.emptyText}>
          Reviens plus tard ou modifie tes filtres.
        </Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>Actualiser</Text>
        </Pressable>
      </View>
    );
  }

  // ── Derived display values ──
  const age = computeAge(profile.birthDate ?? undefined);
  const avatarConfig = (profile.avatarConfig as Record<string, unknown>) ?? DEFAULT_AVATAR;
  const physique = profile.physicalDesc
    ? PHYSIQUE_LABEL[profile.physicalDesc] ?? { emoji: "✨", label: profile.physicalDesc }
    : null;
  const intentionSentence = (profile.lookingFor ?? [])
    .map((id) => LOOKING_FOR_LABEL[id] ?? id)
    .join(" · ");
  const displayName = (profile.pseudo ?? "").trim();
  const headerLine  = [displayName, age !== null ? String(age) : ""].filter(Boolean).join(", ");
  const displayBio  = (profile.bio ?? "").trim();
  const displayCity = (profile.city ?? "").trim();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.stageOneContent}>
        <View style={styles.stageOneCard}>

          {/* Top bar */}
          <View style={styles.topBar}>
            <Text style={styles.topBarTitle}>Découvrir</Text>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>
                {remainingProfiles.length + 1} restant{remainingProfiles.length > 0 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Profile header: avatar + name/city */}
          <View style={styles.stageOneHeader}>
            <View style={styles.photoCard}>
              <View style={styles.photoTape} />
              <ProfileMedia
                avatarConfig={avatarConfig}
                visibility="avatar"
                size={96}
              />
            </View>

            <View style={styles.stageOneHeaderText}>
              {!!headerLine && (
                <Text style={styles.stageOneName}>{headerLine}</Text>
              )}
              {!!displayCity && (
                <Text style={styles.metaInline}>📍 {displayCity}</Text>
              )}
              <View style={styles.arrowLineWrap}>
                <Text style={styles.arrowLine}>⟵ 〜〜〜〜〜〜〜〜〜</Text>
              </View>
            </View>
          </View>

          {/* Bio */}
          {!!displayBio && (
            <Text style={styles.stageOneBlabla}>{displayBio}</Text>
          )}

          {/* Intention */}
          {!!intentionSentence && (
            <Text style={styles.vibeTag}>{intentionSentence}</Text>
          )}

          {/* Physique */}
          {physique && (
            <Text style={styles.vibeTag}>{physique.emoji} {physique.label}</Text>
          )}

          {/* Navigate to full profile */}
          <Pressable
            onPress={() => router.push({ pathname: '/profile/[id]', params: { id: profile.userId } })}
            style={styles.discoverWrap}
          >
            <Text style={styles.discoverLink}>Découvrir le profil →</Text>
          </Pressable>

          {/* Action buttons */}
          <View style={styles.stageOneActions}>
            <Pressable
              style={[styles.actionButton, styles.actionBad, reacting && styles.actionDisabled]}
              onPress={() => displayedProfile && handleReact("GRIMACE", displayedProfile)}
              disabled={reacting}
            >
              <Text style={styles.actionText}>😬 Grimace</Text>
            </Pressable>

            <Pressable style={[styles.actionButton, styles.actionNeutral]}>
              <Text style={styles.actionText}>🚩 Signaler</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.actionGood, reacting && styles.actionDisabled]}
              onPress={() => displayedProfile && handleReact("SMILE", displayedProfile)}
              disabled={reacting}
            >
              <Text style={styles.actionText}>😊 Sourire</Text>
            </Pressable>
          </View>

          {/* Debug display - backend version info */}
          <Text style={styles.debugVersionText}>API_URL={API_URL}</Text>
          {backendVersion && (
            <Text style={styles.debugVersionText}>BACKEND_VERSION sha={backendVersion.sha.substring(0, 8)} env={backendVersion.environment}</Text>
          )}

          {/* Debug display - state info */}
          <Text style={styles.debugStateText}>CURRENT={profile?.userId} REMAINING={remainingProfiles.length} REMOVED_COUNT={removedIds.size}</Text>

          {/* Debug display - action info */}
          {lastActionDebug && (
            <Text style={styles.debugText}>{lastActionDebug}</Text>
          )}

          {/* Debug display - raw API response */}
          {rawResponse && (
            <Text style={styles.debugRawText}>RAW_RESPONSE={rawResponse}</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const BG       = "#ECE3D4";
const PAPER    = "#F6EEDF";
const INK      = "#2B1B12";
const INK_SOFT = "#7C5A43";
const LINE     = "#D9C7AA";
const GREEN    = "#6F9B74";
const RED      = "#BE6B63";

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  centered: { alignItems: "center", justifyContent: "center", padding: 24 },

  // ── Loading / Error / Empty ──
  loadingText:      { fontSize: 16, color: INK_SOFT, marginTop: 12 },
  errorText:        { fontSize: 16, color: RED, textAlign: "center", marginBottom: 16 },
  emptyTitle:       { fontSize: 22, fontWeight: "800", color: INK, marginBottom: 8, textAlign: "center" },
  emptyText:        { fontSize: 16, color: INK_SOFT, textAlign: "center", marginBottom: 20, lineHeight: 24 },
  retryBtn:         { backgroundColor: "#E8D5B7", borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 },
  retryBtnText:     { fontSize: 16, fontWeight: "700", color: "#6B4C30" },

  // ── Card scroll ──
  stageOneContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    paddingTop: 10,
  },

  stageOneCard: {
    backgroundColor: PAPER,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: LINE,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },

  // ── Top bar ──
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  topBarTitle: { fontSize: 17, color: INK, fontWeight: "700" },
  progressBadge: {
    backgroundColor: "#E8DDCE",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  progressBadgeText: { fontSize: 13, color: INK_SOFT, fontWeight: "600" },

  // ── Profile header ──
  stageOneHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },

  photoCard: {
    width: 126,
    height: 156,
    borderRadius: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E6D8C2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
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
  stageOneName: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "800",
    color: INK,
    marginBottom: 6,
  },
  metaInline: { fontSize: 15, color: INK_SOFT, marginBottom: 6 },
  arrowLineWrap: { marginTop: 4, marginBottom: 8 },
  arrowLine: { fontSize: 14, color: "#B29077", letterSpacing: 1 },

  // ── Body text ──
  stageOneBlabla: {
    fontSize: 26,
    lineHeight: 43,
    color: INK,
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  vibeTag: {
    fontSize: 17,
    color: INK_SOFT,
    fontStyle: "italic",
    marginBottom: 10,
  },

  // ── CTA ──
  discoverWrap: { alignSelf: "flex-start", marginBottom: 18 },
  discoverLink: { fontSize: 18, color: "#9C7A4D", fontWeight: "600" },

  // ── Action buttons ──
  stageOneActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  actionBad:      { backgroundColor: "#F3DEDF", borderColor: "#E3C2C5" },
  actionNeutral:  { backgroundColor: "#EEE5D8", borderColor: "#DDD1BF" },
  actionGood:     { backgroundColor: "#DFEEE1", borderColor: "#C7DDCB" },
  actionDisabled: { opacity: 0.5 },
  actionText:     { fontSize: 17, color: INK, fontWeight: "700" },

  // ── Seconde chance ──
  secondeChanceWrap: { alignItems: "center", marginTop: 14, paddingBottom: 4 },
  secondeChanceLink: { fontSize: 15, color: INK_SOFT, fontStyle: "italic", opacity: 0.7 },

  // ── Debug ──
  debugVersionText: { fontSize: 12, color: "#9C27B0", fontWeight: "700", marginTop: 16, textAlign: "center", paddingHorizontal: 12, backgroundColor: "#F3E5F5", padding: 8, borderRadius: 4 },
  debugStateText: { fontSize: 13, color: "#FF9800", fontWeight: "600", marginTop: 8, textAlign: "center", paddingHorizontal: 12 },
  debugText: { fontSize: 13, color: "#FF6B6B", fontWeight: "600", marginTop: 8, textAlign: "center", paddingHorizontal: 12 },
  debugRawText: { fontSize: 11, color: "#2196F3", fontWeight: "500", marginTop: 8, fontFamily: "monospace", paddingHorizontal: 12, backgroundColor: "#E3F2FD", padding: 8, borderRadius: 4 },
});
