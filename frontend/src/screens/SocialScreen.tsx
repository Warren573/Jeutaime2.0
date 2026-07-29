import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ImageBackground,
  useWindowDimensions,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getSocialCardImage } from "../data/socialCardImages";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore } from "../store/useStore";
import CardGame from "./games/CardGame";
import StoryGame from "./games/StoryGame";
import WeeklyProfileScreen from "./WeeklyProfileScreen";
import { FEATURES } from "../config/features";
import { getInbox } from "../api/bottles";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SECTIONS = [
  {
    id: "salons",
    emoji: "👥",
    name: "Salons",
    desc: "Rejoins des salons de discussion",
    feature: "salons",
    colors: ["#A9D2CB", "#6FA8A0"], // lavis turquoise doux — discussion
  },
  {
    id: "adoption",
    emoji: "🐾",
    name: "Adoption",
    desc: "Prends soin de ton animal",
    feature: "refuge",
    colors: ["#C4D69B", "#94B86A"], // lavis vert sauge
  },
  {
    id: "cards",
    emoji: "🎴",
    name: "Jeux & Défis",
    desc: "Jeu de cartes & élection hebdomadaire",
    feature: "games",
    colors: ["#E4B9A6", "#CE8E76"], // lavis terracotta rosé — carte
  },
  {
    id: "story",
    emoji: "📖",
    name: "Continue l'Histoire",
    desc: "Écris une histoire à plusieurs",
    feature: "games",
    colors: ["#C6BFDD", "#9C93C2"], // lavis lavande — encre/récit
  },
  {
    id: "bottle",
    emoji: "🍾",
    name: "Bouteille à la Mer",
    desc: "Envoie un message à l'inconnu",
    feature: "social",
    colors: ["#AFD0E0", "#7BAAC6"], // lavis bleu océan doux
  },
] as const;

type CurrentView = "cards" | "story" | "games-hub" | null;
type GamesHubView = "card-game" | "weekly-profile" | null;

export default function SocialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  // Hauteur réelle de la zone de liste (mesurée) → on dimensionne les cartes
  // pour que TOUTES tiennent sur une seule page, sans scroll.
  const [listHeight, setListHeight] = useState(0);
  const { addPoints, incrementStat, currentUser } = useStore();
  const loadWallet = useStore((s) => s.loadWallet);
  const screenBg = useStore((s) => s.screenBackgrounds?.["social"] ?? "#FFF8E7");
  const [currentView, setCurrentView] = useState<CurrentView>(null);
  const [gamesHubView, setGamesHubView] = useState<GamesHubView>(null);
  const [result, setResult] = useState<{ won: boolean; reward: number } | null>(
    null
  );

  const socialHidden = FEATURES.social === "hidden";
  const gamesHidden = FEATURES.games === "hidden";

  const visibleSections = useMemo(() => {
    return SECTIONS.filter((section) => {
      const state = FEATURES[section.feature];
      return state !== "hidden";
    });
  }, []);

  useEffect(() => {
    if (gamesHidden && currentView) {
      setCurrentView(null);
      setResult(null);
    }
  }, [gamesHidden, currentView]);

  const handlePress = async (id: string) => {
    if (id === "salons" && FEATURES.salons !== "hidden") {
      router.push("/salons-list");
      return;
    }

    if (id === "adoption" && FEATURES.refuge !== "hidden") {
      router.push("/refuge");
      return;
    }

    if (id === "bottle" && FEATURES.social !== "hidden") {
      try {
        const data = await getInbox();
        const accepted = data.find(b => b.status === 'ACCEPTED');
        if (accepted) {
          router.push('/bottles-discussions');
        } else {
          router.push('/bottles-inbox');
        }
      } catch (error) {
        // Fallback to inbox if API fails
        router.push('/bottles-inbox');
      }
      return;
    }

    if (id === "cards" && FEATURES.games !== "hidden") {
      setCurrentView("games-hub");
      return;
    }

    if (id === "story" && FEATURES.games !== "hidden") {
      setCurrentView("story");
    }
  };

  // Le wallet est déjà mis à jour côté backend par CardGame — on raffraîchit
  // le solde local et on met à jour les stats locales
  const handleCardGameEnd = async (won: boolean, reward: number) => {
    await loadWallet();
    if (won) {
      addPoints(15);
      incrementStat("gamesWon");
    } else {
      addPoints(5);
    }
    setResult({ won, reward });
  };

  const handleWin = (reward: number) => {
    addPoints(15);
    incrementStat("gamesWon");
    setResult({ won: true, reward });
  };

  const handleLose = () => {
    addPoints(5);
    setResult({ won: false, reward: 0 });
  };

  const reset = () => {
    setResult(null);
    setGamesHubView(null);
    if (currentView === "games-hub") {
      setCurrentView(null);
    } else {
      setCurrentView(null);
    }
  };

  if (socialHidden) {
    return (
      <View
        style={[
          styles.container,
          styles.centeredContainer,
          { paddingTop: insets.top, backgroundColor: screenBg },
        ]}
      >
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Social indisponible</Text>
          <Text style={styles.emptyText}>
            Cette partie de l’expérience sera révélée plus tard.
          </Text>
        </View>
      </View>
    );
  }

  if (result) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, backgroundColor: screenBg },
        ]}
      >
        <View style={styles.resultBox}>
          <Text style={styles.resultEmoji}>{result.won ? "🎉" : "😢"}</Text>
          <Text style={styles.resultTitle}>
            {result.won ? "Victoire!" : "Perdu!"}
          </Text>
          {result.won && (
            <Text style={styles.resultReward}>+{result.reward} 🪙</Text>
          )}
          <TouchableOpacity style={styles.backBtn} onPress={reset}>
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (currentView === "games-hub") {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, backgroundColor: screenBg },
        ]}
      >
        <TouchableOpacity
          style={styles.topBack}
          onPress={() => setCurrentView(null)}
        >
          <Text style={styles.topBackText}>← Retour</Text>
        </TouchableOpacity>
        {gamesHubView === null ? (
          <ScrollView contentContainerStyle={styles.hubMenu}>
            <Text style={styles.hubTitle}>Jeux & Défis</Text>
            <TouchableOpacity
              style={styles.hubOption}
              onPress={() => setGamesHubView("card-game")}
            >
              <Text style={styles.hubOptionEmoji}>🎴</Text>
              <Text style={styles.hubOptionTitle}>Jeu de Cartes</Text>
              <Text style={styles.hubOptionDesc}>Révèle et gagne des pièces</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.hubOption}
              onPress={() => setGamesHubView("weekly-profile")}
            >
              <Text style={styles.hubOptionEmoji}>🏆</Text>
              <Text style={styles.hubOptionTitle}>Élection Hebdomadaire</Text>
              <Text style={styles.hubOptionDesc}>Vote pour ton profil préféré</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.gameContent}>
            {gamesHubView === "card-game" && FEATURES.games !== "hidden" && (
              <CardGame onEnd={handleCardGameEnd} />
            )}
            {gamesHubView === "weekly-profile" && FEATURES.games !== "hidden" && (
              <WeeklyProfileScreen />
            )}
            <TouchableOpacity
              style={styles.hubBack}
              onPress={() => setGamesHubView(null)}
            >
              <Text style={styles.hubBackText}>← Retour aux jeux</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    );
  }

  if (currentView) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, backgroundColor: screenBg },
        ]}
      >
        <TouchableOpacity
          style={styles.topBack}
          onPress={() => setCurrentView(null)}
        >
          <Text style={styles.topBackText}>← Retour</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.gameContent}>
          {currentView === "story" && FEATURES.games !== "hidden" && (
            <StoryGame onEnd={(won) => (won ? handleWin(50) : handleLose())} />
          )}
        </ScrollView>
      </View>
    );
  }

  // Dimensionnement pour que TOUTES les cartes tiennent sur une page.
  // On garde le ratio 3:1 des bannières (image entière) : hauteur = largeur/3,
  // plafonnée par la place réellement disponible ÷ nombre de cartes.
  const GRID_PAD = 16;
  const CARD_GAP = 12;
  const count = visibleSections.length || 1;
  const maxBanner = (screenWidth - 32) / 3;
  const avail = listHeight - GRID_PAD * 2 - CARD_GAP * (count - 1);
  // Cartes en PLEINE LARGEUR ; hauteur = place dispo ÷ nb cartes (plafonnée au
  // ratio 3:1). Si un poil plus courte que 3:1, l'image est juste très légèrement
  // rognée en haut/bas (cover) mais prend toute la largeur.
  const bannerHeight =
    listHeight > 0
      ? Math.max(64, Math.min(maxBanner, Math.floor(avail / count)))
      : maxBanner;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>🌐 Social</Text>
        <Text style={styles.subtitle}>Rencontres & activités</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.grid}
        onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
        showsVerticalScrollIndicator={false}
      >
        {visibleSections.map((s) => {
          const banner = getSocialCardImage(s.id);
          const inner = (
            <>
              <View style={styles.emojiCircle}>
                <Text style={styles.cardEmoji}>{s.emoji}</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardName, banner && styles.cardNameOnImage]}>
                  {s.name}
                </Text>
                <Text style={[styles.cardDesc, banner && styles.cardDescOnImage]}>
                  {s.desc}
                </Text>
              </View>
              <Text style={[styles.arrow, banner && styles.arrowOnImage]}>▶</Text>
            </>
          );
          return (
            <TouchableOpacity
              key={s.id}
              style={styles.cardTouch}
              activeOpacity={0.85}
              onPress={() => handlePress(s.id)}
            >
              {banner ? (
                // Bannière illustrée (comme les salons) : image + voile sombre.
                <ImageBackground
                  source={banner}
                  resizeMode="cover"
                  style={[styles.card, styles.cardBanner, { height: bannerHeight }]}
                >
                  <View style={styles.cardVeil} pointerEvents="none" />
                  {inner}
                </ImageBackground>
              ) : (
                // Repli : dégradé thématique tant qu'aucune illustration n'est fournie.
                <LinearGradient
                  colors={s.colors as unknown as string[]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.card, { height: bannerHeight }]}
                >
                  {inner}
                </LinearGradient>
              )}
            </TouchableOpacity>
          );
        })}

        {visibleSections.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Rien à afficher pour l’instant</Text>
            <Text style={styles.emptyText}>
              Cette partie de l’expérience sera révélée plus tard.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF8E7" },
  centeredContainer: {
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E8D5B7",
  },
  title: { fontSize: 28, fontWeight: "700", color: "#3A2818" },
  subtitle: { fontSize: 14, color: "#8B6F47", marginTop: 4 },
  scroll: { flex: 1 },
  grid: { padding: 16, gap: 12 },
  cardTouch: {
    alignSelf: "stretch",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    overflow: "hidden",
  },
  // Bannière illustrée : cadre exactement 3:1 (hauteur fournie inline = largeur/3).
  cardBanner: {
    width: "100%",
    justifyContent: "center",
  },
  cardVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,14,8,0.30)",
  },
  emojiCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardEmoji: { fontSize: 26 },
  cardText: { flex: 1 },
  cardName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3A2818",
    marginBottom: 4,
  },
  cardDesc: { fontSize: 13, color: "#5E4B34" },
  arrow: { fontSize: 16, color: "#5A4632" },
  // Variantes quand une bannière illustrée est présente (texte blanc lisible).
  cardNameOnImage: {
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardDescOnImage: {
    color: "rgba(255,255,255,0.95)",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  arrowOnImage: { color: "#FFFFFF" },
  topBack: { margin: 16 },
  topBackText: { fontSize: 16, color: "#8B6F47" },
  gameContent: { flexGrow: 1 },
  resultBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  resultEmoji: { fontSize: 80, marginBottom: 16 },
  resultTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#3A2818",
    marginBottom: 8,
  },
  resultReward: {
    fontSize: 24,
    color: "#DAA520",
    fontWeight: "700",
    marginBottom: 32,
  },
  backBtn: {
    backgroundColor: "#DAA520",
    paddingHorizontal: 50,
    paddingVertical: 16,
    borderRadius: 25,
  },
  backBtnText: { color: "#FFF", fontWeight: "700", fontSize: 18 },
  emptyBox: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E8D5B7",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3A2818",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#8B6F47",
    lineHeight: 22,
  },
  hubMenu: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
    gap: 16,
  },
  hubTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#3A2818",
    marginBottom: 24,
    textAlign: "center",
  },
  hubOption: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E8D5B7",
  },
  hubOptionEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  hubOptionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3A2818",
    marginBottom: 4,
  },
  hubOptionDesc: {
    fontSize: 14,
    color: "#8B6F47",
    textAlign: "center",
  },
  hubBack: {
    marginTop: 24,
    paddingVertical: 12,
    alignItems: "center",
  },
  hubBackText: {
    fontSize: 16,
    color: "#8B6F47",
    fontWeight: "600",
  },
});
