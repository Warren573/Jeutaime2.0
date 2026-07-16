import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Modal } from "react-native";
import { BouncyButton } from "./BouncyButton";

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
}

interface RefugeRevealPhaseProps {
  status: string;
  reveal: RevealStateProps;
  hearts: string[];
  otherProfile: OtherProfileProps | null;
  isSubmitting: boolean;
  onDecision: (decision: "ACCEPT" | "REFUSE") => void;
  onExit: () => void;
}

/**
 * Phase finale du Refuge (jour 7 terminé).
 * Quatre états, tous pilotés par le serveur — le frontend n'invente rien :
 * 1. Aucune décision de ma part → question + boutons Oui / Non
 * 2. J'ai accepté, l'autre n'a pas fini → attente
 * 3. COMPLETED (un refus) → fin propre, retour Social
 * 4. REVEALED (double accord) → animation de dévoilement puis profils
 */
export function RefugeRevealPhase({
  status,
  reveal,
  hearts,
  otherProfile,
  isSubmitting,
  onDecision,
  onExit,
}: RefugeRevealPhaseProps) {
  const [animationDone, setAnimationDone] = useState(false);

  if (status === "REVEALED") {
    return (
      <View style={styles.card}>
        {!animationDone && (
          <RevealAnimation hearts={hearts} onFinished={() => setAnimationDone(true)} />
        )}
        <Text style={styles.title}>Vous avez choisi de vous découvrir.</Text>
        {otherProfile && (
          <View style={styles.profileCard}>
            <Text style={styles.profilePseudo}>{otherProfile.pseudo}</Text>
            {otherProfile.city && <Text style={styles.profileCity}>{otherProfile.city}</Text>}
            {otherProfile.bio && <Text style={styles.profileBio}>{otherProfile.bio}</Text>}
          </View>
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
 * Dévoilement : l'écran s'assombrit, les 7 cœurs apparaissent en rappel,
 * une lueur douce pulse, puis transition vers les profils révélés.
 */
function RevealAnimation({ hearts, onFinished }: { hearts: string[]; onFinished: () => void }) {
  const dimOpacity = useRef(new Animated.Value(0)).current;
  const heartsOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Assombrissement léger
      Animated.timing(dimOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      // 2. Les 7 cœurs en rappel
      Animated.timing(heartsOpacity, { toValue: 1, duration: 900, useNativeDriver: true }),
      // 3. Lueur douce (deux pulsations)
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        ]),
        { iterations: 2 }
      ),
      // 4. Texte sobre
      Animated.timing(textOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.delay(1200),
      // 5. Transition vers les profils révélés (fondu de sortie)
      Animated.parallel([
        Animated.timing(dimOpacity, { toValue: 0, duration: 700, useNativeDriver: true }),
        Animated.timing(heartsOpacity, { toValue: 0, duration: 700, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0, duration: 700, useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    ]).start(() => onFinished());
  }, [dimOpacity, heartsOpacity, glowOpacity, textOpacity, onFinished]);

  return (
    <Modal transparent animationType="none" visible>
      <Animated.View style={[styles.overlay, { opacity: dimOpacity }]}>
        <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />
        <Animated.View style={[styles.overlayHearts, { opacity: heartsOpacity }]}>
          {hearts.map((heart, idx) => (
            <Text key={idx} style={styles.overlayHeart}>
              {heart}
            </Text>
          ))}
        </Animated.View>
        <Animated.Text style={[styles.overlayText, { opacity: textOpacity }]}>
          Vous avez choisi de vous découvrir.
        </Animated.Text>
      </Animated.View>
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
  exitButton: {
    marginTop: 16,
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

  /* Animation de dévoilement */
  overlay: {
    flex: 1,
    backgroundColor: "rgba(20, 12, 4, 0.82)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  glow: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255, 215, 130, 0.35)",
  },
  overlayHearts: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 24,
  },
  overlayHeart: {
    fontSize: 26,
  },
  overlayText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF3DC",
    textAlign: "center",
  },
});
