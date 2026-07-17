import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Modal, Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BouncyButton } from "./BouncyButton";
import { sendReaction } from "../api/reactions";
import { API_URL, ApiError } from "../api/client";
import { getAnimalEmoji } from "../data/refugeAnimals";
import { getAnimalImage } from "../data/refugeAnimalImages";

interface RevealStateProps {
  available: boolean;
  myDecision: "ACCEPT" | "REFUSE" | null;
  otherDecided: boolean;
  revealedAt: string | null;
}

interface OtherProfileProps {
  userId: string;
  pseudo: string;
  bio: string | null;
  city: string | null;
  age: number | null;
  interests: string[];
  photoUrl: string | null;
}

interface RefugeRevealPhaseProps {
  sessionId: string;
  currentUserId: string | null;
  status: string;
  reveal: RevealStateProps;
  otherProfile: OtherProfileProps | null;
  isSubmitting: boolean;
  onDecision: (decision: "ACCEPT" | "REFUSE") => void;
  onViewProfile: (userId: string) => void;
  onExit: () => void;
  animalType?: string;
}

/**
 * Phase finale du Refuge (jour 7 terminé).
 * États pilotés par le serveur — le frontend n'invente rien :
 * 1. Aucune décision de ma part → question + boutons Oui / Non
 * 2. J'ai accepté, l'autre n'a pas fini → attente
 * 3. COMPLETED (un refus) → fin propre, retour Social
 * 4. REVEALED (double accord) → animation UNE SEULE FOIS (flag persistant
 *    refugeRevealSeen:{sessionId}:{userId}) puis carte profil + suite JeuTaime
 */
export function RefugeRevealPhase({
  sessionId,
  currentUserId,
  status,
  reveal,
  otherProfile,
  isSubmitting,
  onDecision,
  onViewProfile,
  onExit,
  animalType,
}: RefugeRevealPhaseProps) {
  // null = flag pas encore lu (ne rien décider avant), true/false ensuite
  const [revealSeen, setRevealSeen] = useState<boolean | null>(null);
  const [smileStatus, setSmileStatus] = useState<"idle" | "sending" | "sent" | "mutual" | "already">("idle");

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

  const handleSmile = async () => {
    if (!otherProfile || smileStatus === "sending") return;
    setSmileStatus("sending");
    try {
      const result = await sendReaction(otherProfile.userId, "SMILE");
      setSmileStatus(result?.matchCreated ? "mutual" : "sent");
    } catch (err: unknown) {
      // 409 : réaction déjà enregistrée (contrainte unique du flux Sourire
      // existant) — détection par statut HTTP, jamais par le texte du message.
      setSmileStatus(err instanceof ApiError && err.status === 409 ? "already" : "idle");
    }
  };

  if (status === "REVEALED") {
    if (revealSeen === null) {
      return <View style={styles.card} />; // flag en cours de lecture
    }
    return (
      <View style={styles.card}>
        {!revealSeen && <RevealAnimation animalType={animalType} otherProfile={otherProfile} onFinished={markSeen} />}

        <Text style={styles.title}>Vous avez choisi de vous découvrir.</Text>

        {otherProfile && (
          <View style={styles.profileCard}>
            {otherProfile.photoUrl ? (
              <Image source={{ uri: `${API_URL.replace(/\/api$/, "")}${otherProfile.photoUrl}` }} style={styles.profilePhoto} />
            ) : (
              <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder]}>
                <Text style={styles.profilePhotoEmoji}>👤</Text>
              </View>
            )}
            <Text style={styles.profilePseudo}>
              {otherProfile.pseudo}
              {otherProfile.age != null ? `, ${otherProfile.age} ans` : ""}
            </Text>
            {otherProfile.city && <Text style={styles.profileCity}>{otherProfile.city}</Text>}
            {otherProfile.bio && (
              <Text style={styles.profileBio} numberOfLines={3}>
                {otherProfile.bio}
              </Text>
            )}
            {otherProfile.interests.length > 0 && (
              <View style={styles.interestsRow}>
                {otherProfile.interests.slice(0, 4).map((interest) => (
                  <View key={interest} style={styles.interestChip}>
                    <Text style={styles.interestText}>{interest}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {otherProfile && (
          <BouncyButton style={styles.primaryButton} onPress={() => onViewProfile(otherProfile.userId)}>
            <Text style={styles.primaryButtonText}>Voir son profil</Text>
          </BouncyButton>
        )}

        {otherProfile && smileStatus !== "mutual" && smileStatus !== "sent" && smileStatus !== "already" && (
          <BouncyButton
            style={[styles.smileButton, smileStatus === "sending" && styles.buttonDisabled]}
            onPress={handleSmile}
            disabled={smileStatus === "sending"}
          >
            <Text style={styles.smileButtonText}>😊 Envoyer un Sourire</Text>
          </BouncyButton>
        )}
        {smileStatus === "sent" && <Text style={styles.smileInfo}>😊 Sourire envoyé.</Text>}
        {smileStatus === "already" && <Text style={styles.smileInfo}>😊 Sourire déjà envoyé.</Text>}
        {smileStatus === "mutual" && (
          <Text style={styles.smileInfo}>
            💚 Sourire mutuel ! Le jeu des 3 questions vous attend dans vos Lettres.
          </Text>
        )}

        <BouncyButton style={styles.exitButton} onPress={onExit}>
          <Text style={styles.exitButtonText}>Retour vers Social</Text>
        </BouncyButton>
      </View>
    );
  }

  if (status === "COMPLETED") {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Le Refuge se termine ici.</Text>
        <BouncyButton style={styles.exitButton} onPress={onExit}>
          <Text style={styles.exitButtonText}>Retour vers Social</Text>
        </BouncyButton>
      </View>
    );
  }

  if (reveal.myDecision === "ACCEPT") {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Ta décision est enregistrée.</Text>
        <Text style={styles.subtitle}>En attente de la décision de l&apos;autre personne.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Les 7 jours sont terminés.</Text>
      <Text style={styles.subtitle}>Souhaitez-vous dévoiler vos profils ?</Text>
      <View style={styles.buttonsRow}>
        <BouncyButton
          style={[styles.decisionButton, styles.acceptButton, isSubmitting && styles.buttonDisabled]}
          onPress={() => !isSubmitting && onDecision("ACCEPT")}
          disabled={isSubmitting}
        >
          <Text style={styles.acceptButtonText}>Oui, dévoiler</Text>
        </BouncyButton>
        <BouncyButton
          style={[styles.decisionButton, styles.refuseButton, isSubmitting && styles.buttonDisabled]}
          onPress={() => !isSubmitting && onDecision("REFUSE")}
          disabled={isSubmitting}
        >
          <Text style={styles.refuseButtonText}>Non, terminer ici</Text>
        </BouncyButton>
      </View>
    </View>
  );
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
            {/* Avatar */}
            <View style={styles.revealAvatarContainer}>
              {otherProfile.photoUrl ? (
                <Image source={{ uri: `${API_URL.replace(/\/api$/, "")}${otherProfile.photoUrl}` }} style={styles.revealAvatar} resizeMode="cover" />
              ) : (
                <View style={styles.revealAvatarPlaceholder}>
                  <Text style={styles.revealAvatarEmoji}>👤</Text>
                </View>
              )}
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
  card: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0E5D8",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2D1F0E",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#8B6F47",
    textAlign: "center",
    marginBottom: 4,
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  decisionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 2,
  },
  acceptButton: {
    backgroundColor: "#FFD700",
    borderColor: "#E6B800",
  },
  acceptButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2D1F0E",
  },
  refuseButton: {
    backgroundColor: "transparent",
    borderColor: "#C4A886",
  },
  refuseButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8B6F47",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButton: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: "#FFD700",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E6B800",
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2D1F0E",
  },
  smileButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: "rgba(76, 175, 80, 0.12)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#7CB47C",
  },
  smileButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3F7B3F",
  },
  smileInfo: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
    color: "#3F7B3F",
    textAlign: "center",
  },
  exitButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#FFE5B4",
    borderRadius: 10,
  },
  exitButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2D1F0E",
  },

  /* Profil révélé */
  profileCard: {
    width: "100%",
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0E5D8",
    alignItems: "center",
  },
  profilePhoto: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: 10,
    backgroundColor: "#F0E5D8",
  },
  profilePhotoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  profilePhotoEmoji: {
    fontSize: 36,
  },
  profilePseudo: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2D1F0E",
  },
  profileCity: {
    fontSize: 13,
    color: "#8B6F47",
    marginTop: 2,
  },
  profileBio: {
    fontSize: 13,
    color: "#4A3B28",
    textAlign: "center",
    marginTop: 8,
  },
  interestsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  interestChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255, 215, 0, 0.18)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E6C34A",
  },
  interestText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B5417",
  },

  /* Nouvelle animation de dévoilement */
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
  revealAvatar: {
    width: "100%",
    height: "100%",
  },
  revealAvatarPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0E5D8",
  },
  revealAvatarEmoji: {
    fontSize: 48,
  },
  revealPseudo: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF3DC",
    textAlign: "center",
  },
});
