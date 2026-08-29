import React, { useEffect, useMemo, useState } from "react";
import { Button, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useStore } from "../store/useStore";
import CardGame from "./games/CardGame";
import { FEATURES } from "../config/features";

const SECTIONS = [
  { id: "salons", name: "Salons", desc: "Rejoins des salons de discussion", feature: "salons" },
  { id: "adoption", name: "Adoption", desc: "Prends soin de ton animal", feature: "refuge" },
  { id: "cards", name: "Jeux & Concours", desc: "Joue, participe et gagne des pièces", feature: "games" },
  { id: "bottle", name: "Bouteille à la mer", desc: "Envoie un message à l'inconnu", feature: "social" },
] as const;

type CurrentView = "games-hub" | null;
type GamesHubView = "card-game" | null;

export default function SocialScreen() {
  const router = useRouter();
  const { addPoints, incrementStat } = useStore();
  const loadWallet = useStore((s) => s.loadWallet);
  const [currentView, setCurrentView] = useState<CurrentView>(null);
  const [gamesHubView, setGamesHubView] = useState<GamesHubView>(null);
  const [result, setResult] = useState<{ won: boolean; reward: number } | null>(null);
  const socialHidden = FEATURES.social === "hidden";
  const gamesHidden = FEATURES.games === "hidden";
  const visibleSections = useMemo(() => SECTIONS.filter((s) => FEATURES[s.feature] !== "hidden"), []);

  useEffect(() => {
    if (gamesHidden && currentView) {
      setCurrentView(null);
      setGamesHubView(null);
      setResult(null);
    }
  }, [gamesHidden, currentView]);

  const handlePress = (id: string) => {
    if (id === "salons" && FEATURES.salons !== "hidden") return router.push("/salons-list");
    if (id === "adoption" && FEATURES.refuge !== "hidden") return router.push("/refuge");
    if (id === "bottle" && FEATURES.social !== "hidden") return router.push("/bottles-main");
    if (id === "cards" && FEATURES.games !== "hidden") setCurrentView("games-hub");
  };

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

  if (socialHidden) {
    return <View><Text>Social indisponible</Text><Text>Cette partie de l'expérience sera révélée plus tard.</Text></View>;
  }

  if (result) {
    return (
      <View>
        <Text>{result.won ? "Victoire" : "Partie terminée"}</Text>
        {result.won ? <Text>Gain : {result.reward} pièces</Text> : <Text>Partie perdue.</Text>}
        <Button title="Retour aux jeux" onPress={() => { setResult(null); setGamesHubView(null); setCurrentView("games-hub"); }} />
      </View>
    );
  }

  if (currentView === "games-hub") {
    if (gamesHubView === "card-game") {
      return (
        <ScrollView>
          <Button title="Retour" onPress={() => setGamesHubView(null)} />
          {FEATURES.games !== "hidden" && <CardGame onEnd={handleCardGameEnd} />}
        </ScrollView>
      );
    }
    return (
      <ScrollView>
        <Text>Jeux & Concours</Text>
        <Text>Jouez, participez et remportez des pièces.</Text>
        <Button title="Jeu de cartes" onPress={() => setGamesHubView("card-game")} />
        <Button title="Élection hebdomadaire" onPress={() => router.push("/weekly-profile")} />
        <Button title="Retour" onPress={() => setCurrentView(null)} />
      </ScrollView>
    );
  }

  return (
    <ScrollView>
      <Text>Social</Text>
      <Text>Rencontres et activités</Text>
      {visibleSections.map((section) => (
        <View key={section.id}>
          <Text>{section.name}</Text>
          <Text>{section.desc}</Text>
          <Button title={`Ouvrir ${section.name}`} onPress={() => handlePress(section.id)} />
        </View>
      ))}
    </ScrollView>
  );
}
