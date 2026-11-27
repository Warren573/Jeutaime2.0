import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Modal, Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BouncyButton } from "./BouncyButton";
import { Avatar } from "../avatar/png/Avatar";
import { resolveAvatarConfig } from "../avatar/resolveAvatarConfig";
import { getAnimalEmoji } from "../data/refugeAnimals";
import { getAnimalImage } from "../data/refugeAnimalImages";
import { questionsRoute, type EndView, type RevealMatchInfo } from "../data/refugeEndFlow";

interface RevealStateProps {
  available: boolean;
  myDecision: "ACCEPT" | "REFUSE" | null;
  otherDecided: boolean;
  revealedAt: string | null;
}

export interface OtherProfileProps {
  userId: string;
  pseudo: string;
  bio: string | null;
  city: string | null;
  age: number | null;
  interests: string[];
  photoUrl: string | null;
  avatarConfig?: unknown | null;
  gender?: string | null;
}

interface RefugeRevealPhaseProps {
  sessionId: string;
  currentUserId: string | null;
  status: string;
  /** Vue à afficher, dérivée de l'état serveur (voir data/refugeEndFlow). */
  view?: Extract<EndView, "revealed" | "ended">;
  reveal?: RevealStateProps;
  otherProfile: OtherProfileProps | null;
  revealMatch?: RevealMatchInfo | null;
  /** Obsolètes (dévoilement automatique) : acceptés pour les anciens écrans non utilisés, jamais affichés. */
  isSubmitting?: boolean;
  onDecision?: (decision: "ACCEPT" | "REFUSE") => void;
  onViewProfile: (userId: string) => void;
  /** Ouvre une route interne (jeu des 3 questions, lettres). */
  onNavigate?: (route: string) => void;
  /** Retour à l'accueil. */
  onExit: () => void;
  /** « Revoir le bilan » : consultation volontaire. */
  onReviewReport?: () => void;
  animalType?: string;
}

const cream = "#F6EEDC", beige = "#C9A97A", burgundy = "#8A2F3C", ink = "#4A2B1C";

/** Avatar RÉEL du profil dévoilé (même résolution que partout ailleurs) — jamais la silhouette générique. */
export function RevealedAvatar({ profile, size }: { profile: OtherProfileProps | null; size: number }) {
  if (!profile) return null;
  const { config } = resolveAvatarConfig(profile.userId, profile.avatarConfig, profile.gender, "RefugeReveal");
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Avatar size={size} {...(config as any)} />
    </View>
  );
}

/**
 * Phase finale du Refuge (168 h écoulées). Dévoilement AUTOMATIQUE : le serveur dévoile les profils et crée les sourires
 * réciproques et le match (aucun consentement, aucune attente). Aucune logique de navigation ici : la vue est fournie
 * par l'écran (état serveur).
 */
export function RefugeRevealPhase({
  sessionId,
  currentUserId,
  status,
  view: viewProp,
  otherProfile,
  revealMatch,
  onViewProfile,
  onNavigate,
  onExit,
  onReviewReport,
  animalType,
}: RefugeRevealPhaseProps) {
  // Écrans historiques sans vue fournie : même dérivation que l'écran de fin.
  const view = viewProp ?? (status === "REVEALED" ? "revealed" : "ended");
  // null = flag pas encore lu (ne rien décider avant), true/false ensuite
  const [revealSeen, setRevealSeen] = useState<boolean | null>(null);

  const seenKey = `refugeRevealSeen:${sessionId}:${currentUserId ?? "anon"}`;

  useEffect(() => {
    if (status !== "REVEALED") return;
    let cancelled = false;
    AsyncStorage.getItem(seenKey).then((v) => {
      if (!cancelled) setRevealSeen(v === "1");
    });
    return () => {
      cancelled = true;
    };
  }, [status, seenKey]);

  const markSeen = () => {
    setRevealSeen(true);
    AsyncStorage.setItem(seenKey, "1").catch(() => {});
  };

  const reviewButton = onReviewReport ? (
    <BouncyButton style={styles.linkButton} onPress={onReviewReport}>
      <Text style={styles.linkButtonText}>Revoir le bilan</Text>
    </BouncyButton>
  ) : null;

  if (view === "revealed") {
    if (revealSeen === null) {
      return <View style={styles.card} />; // flag en cours de lecture
    }
    const playRoute = questionsRoute(revealMatch);
    const hasActiveMatch = !!revealMatch && revealMatch.status === "ACTIVE";
    return (
      <View style={styles.card}>
        {!revealSeen && <RevealAnimation animalType={animalType} otherProfile={otherProfile} onFinished={markSeen} />}

        <Text style={styles.headline}>Une nouvelle histoire commence</Text>
        <Text style={styles.subtitle}>Vous avez choisi de vous découvrir.</Text>

        {otherProfile && (
          <View style={styles.profileBlock}>
            <RevealedAvatar profile={otherProfile} size={104} />
            <Text style={styles.profilePseudo}>
              {otherProfile.pseudo}
              {otherProfile.age != null ? `, ${otherProfile.age} ans` : ""}
            </Text>
            {otherProfile.bio ? (
              <Text style={styles.profileBio} numberOfLines={3}>
                {otherProfile.bio}
              </Text>
            ) : null}
          </View>
        )}

        {hasActiveMatch && (
          <View style={styles.matchBox}>
            <Text style={styles.matchBoxTitle}>Vos sourires sont réciproques !</Text>
            {playRoute && <Text style={styles.matchBoxText}>Place au jeu des 3 questions.</Text>}
          </View>
        )}

        {playRoute && onNavigate && (
          <BouncyButton style={styles.primaryButton} onPress={() => onNavigate(playRoute)}>
            <Text style={styles.primaryButtonText}>Jouer aux 3 questions</Text>
          </BouncyButton>
        )}
        {hasActiveMatch && !playRoute && onNavigate && (
          <BouncyButton style={styles.primaryButton} onPress={() => onNavigate("/(tabs)/letters")}>
            <Text style={styles.primaryButtonText}>Ouvrir vos lettres</Text>
          </BouncyButton>
        )}
        {otherProfile && (
          <BouncyButton style={styles.secondaryButton} onPress={() => onViewProfile(otherProfile.userId)}>
            <Text style={styles.secondaryButtonText}>Voir son profil</Text>
          </BouncyButton>
        )}
        <BouncyButton style={styles.linkButton} onPress={onExit}>
          <Text style={styles.linkButtonText}>Retour à l’accueil</Text>
        </BouncyButton>
        {reviewButton}
      </View>
    );
  }

  if (view === "ended") {
    return (
      <View style={styles.card}>
        <Text style={styles.headline}>Le Refuge se termine ici.</Text>
        <Text style={styles.subtitle}>Aucun sourire n’a été envoyé.</Text>
        <BouncyButton style={styles.primaryButton} onPress={onExit}>
          <Text style={styles.primaryButtonText}>Retour à l’accueil</Text>
        </BouncyButton>
        {reviewButton}
      </View>
    );
  }
}

/**
 * Dévoilement : animal PNG 1s → pouf fumée → avatar+pseudo grandissent.
 * Jouée UNE seule fois : onFinished persiste le flag via AsyncStorage.
 */
function RevealAnimation({ animalType, otherProfile, onFinished }: { animalType?: string; otherProfile: OtherProfileProps | null; onFinished: () => void }) {
  // PNG absents du dépôt : fallback emoji obligatoire — la phase 1 ne doit
  // jamais afficher une zone vide (l'échec de chargement bascule aussi).
  const [imageFailed, setImageFailed] = useState(false);
  const animalOpacity = useRef(new Animated.Value(1)).current;
  const animalScale = useRef(new Animated.Value(1)).current;

  const smoke1Opacity = useRef(new Animated.Value(0)).current;
  const smoke1Scale = useRef(new Animated.Value(1)).current;
  const smoke2Opacity = useRef(new Animated.Value(0)).current;
  const smoke2Scale = useRef(new Animated.Value(1)).current;
  const smoke3Opacity = useRef(new Animated.Value(0)).current;
  const smoke3Scale = useRef(new Animated.Value(1)).current;

  const contentScale = useRef(new Animated.Value(0.3)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const finishedRef = useRef(false);

  const animalSource = getAnimalImage(animalType);
  const showAnimalImage = animalSource !== null && !imageFailed;
  const animalEmoji = getAnimalEmoji(animalType);

  useEffect(() => {
    const finish = () => {
      if (!finishedRef.current) {
        finishedRef.current = true;
        onFinished();
      }
    };

    Animated.sequence([
      // Phase 1: Animal visible 1 second (no action)
      Animated.delay(1000),

      // Phase 2: Smoke pouf effect (600ms) - animal fades out while smoke appears
      Animated.parallel([
        Animated.timing(animalOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.sequence([
          Animated.parallel([
            Animated.timing(smoke1Opacity, { toValue: 0.6, duration: 100, useNativeDriver: true }),
            Animated.timing(smoke1Scale, { toValue: 1.4, duration: 100, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(smoke1Opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(smoke1Scale, { toValue: 2, duration: 300, useNativeDriver: true }),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(50),
          Animated.parallel([
            Animated.timing(smoke2Opacity, { toValue: 0.5, duration: 100, useNativeDriver: true }),
            Animated.timing(smoke2Scale, { toValue: 1.6, duration: 100, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(smoke2Opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
            Animated.timing(smoke2Scale, { toValue: 2.2, duration: 350, useNativeDriver: true }),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(100),
          Animated.parallel([
            Animated.timing(smoke3Opacity, { toValue: 0.4, duration: 100, useNativeDriver: true }),
            Animated.timing(smoke3Scale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(smoke3Opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(smoke3Scale, { toValue: 2.1, duration: 300, useNativeDriver: true }),
          ]),
        ]),
      ]),

      // Phase 3: Avatar + Pseudo appear small and grow (800ms)
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(contentScale, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),

      Animated.delay(300),
    ]).start(finish);

    const failsafe = setTimeout(finish, 5000);
    return () => clearTimeout(failsafe);
  }, []);

  return (
    <Modal transparent animationType="none" visible>
      <View style={styles.revealOverlay}>
        {/* Phase 1: Animal — PNG local si fourni, sinon emoji (jamais de zone vide) */}
        <Animated.View style={[{ opacity: animalOpacity, transform: [{ scale: animalScale }] }]}>
          {showAnimalImage ? (
            <Image
              source={animalSource}
              style={styles.revealAnimal}
              resizeMode="contain"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <Text style={styles.revealAnimalEmoji}>{animalEmoji}</Text>
          )}
        </Animated.View>

        {/* Phase 2: Smoke puffs */}
        {[smoke1Opacity, smoke2Opacity, smoke3Opacity].map((opacity, idx) => (
          <Animated.View
            key={idx}
            style={[
              styles.smokePuff,
              {
                opacity: [smoke1Opacity, smoke2Opacity, smoke3Opacity][idx],
                transform: [{ scale: [smoke1Scale, smoke2Scale, smoke3Scale][idx] }],
              },
            ]}
          />
        ))}

        {/* Phase 3: Avatar + Pseudo growing */}
        {otherProfile && (
          <Animated.View
            style={[
              styles.revealContentWrapper,
              {
                opacity: contentOpacity,
                transform: [{ scale: contentScale }],
              },
            ]}
          >
            {/* Avatar réel du profil */}
            <View style={styles.revealAvatarContainer}>
              <RevealedAvatar profile={otherProfile} size={120} />
            </View>
            {/* Pseudo */}
            <Text style={styles.revealPseudo}>{otherProfile.pseudo}</Text>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: "stretch", alignItems: "center" },
  headline: { fontFamily: "Georgia", fontSize: 22, fontWeight: "700", color: burgundy, textAlign: "center", marginBottom: 6 },
  subtitle: { fontFamily: "Georgia", fontSize: 14, color: ink, textAlign: "center", marginBottom: 6 },
  profileBlock: { alignItems: "center", marginTop: 10, marginBottom: 10 },
  profilePseudo: { fontFamily: "Georgia", fontSize: 18, fontWeight: "700", color: ink, marginTop: 8, textAlign: "center" },
  profileBio: { fontFamily: "Georgia", fontSize: 12.5, lineHeight: 17, color: "#6E4B32", textAlign: "center", marginTop: 4, paddingHorizontal: 8 },
  matchBox: { alignSelf: "stretch", backgroundColor: cream, borderWidth: 1, borderColor: beige, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: "center", marginBottom: 12 },
  matchBoxTitle: { fontFamily: "Georgia", fontSize: 14, fontWeight: "700", color: burgundy, textAlign: "center" },
  matchBoxText: { fontFamily: "Georgia", fontSize: 13, color: ink, textAlign: "center", marginTop: 2 },
  primaryButton: { alignSelf: "stretch", backgroundColor: burgundy, borderRadius: 8, paddingVertical: 13, alignItems: "center", marginTop: 4 },
  primaryButtonText: { color: "#FFFFFF", fontFamily: "Georgia", fontWeight: "700", fontSize: 14 },
  secondaryButton: { alignSelf: "stretch", backgroundColor: "transparent", borderWidth: 1.5, borderColor: beige, borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  secondaryButtonText: { color: burgundy, fontFamily: "Georgia", fontWeight: "700", fontSize: 14 },
  linkButton: { paddingVertical: 9, paddingHorizontal: 16, alignItems: "center", marginTop: 4 },
  linkButtonText: { color: burgundy, fontFamily: "Georgia", fontWeight: "600", fontSize: 13 },
  revealOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 12, 4, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  revealAnimal: {
    width: 200,
    height: 200,
    position: "absolute",
  },
  revealAnimalEmoji: {
    fontSize: 120,
    textAlign: "center",
  },
  smokePuff: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(200, 180, 160, 0.4)",
  },
  revealContentWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  revealAvatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    marginBottom: 12,
    backgroundColor: "#E8D5C4",
  },
  revealPseudo: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF3DC",
    textAlign: "center",
  },
});
