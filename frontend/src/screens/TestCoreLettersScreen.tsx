import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { acceptMatch, listMatches, type MatchDTO } from "../api/matches";

export default function TestCoreLettersScreen() {
  const [matches, setMatches] = useState<MatchDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listMatches();
      setMatches(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleAccept(matchId: string) {
    setBusyId(matchId);
    setError(null);
    try {
      await acceptMatch(matchId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'accepter le match");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { setLoading(true); void load(); }} />}
    >
      <Text style={styles.title}>Lettres</Text>
      <Text style={styles.subtitle}>Correspondances et état réel des matchs</Text>

      {loading && matches.length === 0 ? <ActivityIndicator /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && matches.length === 0 ? <Text>Aucune correspondance pour ce compte.</Text> : null}

      {matches.map((match) => {
        const name = match.otherProfile?.pseudo || match.otherUserId;
        return (
          <View key={match.id} style={styles.card}>
            <Text style={styles.name}>{name}</Text>
            <Text>Statut : {match.status}</Text>
            <Text>Questions validées : {match.questionsValidated ? "oui" : "non"}</Text>
            <Text>Lettres : {match.letterCountA + match.letterCountB}</Text>
            <Text>Mon tour : {match.canSend ? "oui" : "non"}</Text>
            {match.canSendReason ? <Text>Raison : {match.canSendReason}</Text> : null}

            {match.status === "PENDING" ? (
              <Pressable
                disabled={busyId === match.id}
                style={styles.button}
                onPress={() => void handleAccept(match.id)}
              >
                <Text>{busyId === match.id ? "Traitement..." : "Accepter le match"}</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14 },
  error: { borderWidth: 1, padding: 10 },
  card: { borderWidth: 1, padding: 12, gap: 4 },
  name: { fontSize: 18, fontWeight: "700" },
  button: { borderWidth: 1, padding: 10, alignSelf: "flex-start", marginTop: 8 },
});
