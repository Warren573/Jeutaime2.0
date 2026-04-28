import { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "../src/api/client";
import { useStore } from "../src/store/useStore";
import { QUESTION_CATALOG } from "../src/config/questions";

interface QAnswers {
  answer: string;
  wrong1: string;
  wrong2: string;
}

function isFilledAnswer(a: QAnswers): boolean {
  return a.answer.trim().length > 0 && a.wrong1.trim().length > 0 && a.wrong2.trim().length > 0;
}

export default function SetupQuestionsScreen() {
  const router = useRouter();
  const { hydrateFromApi } = useStore();

  const [selected, setSelected] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, QAnswers>>({});
  const [isLoading, setIsLoading] = useState(false);

  const isReady =
    selected.length === 3 &&
    selected.every((id) => answers[id] && isFilledAnswer(answers[id]));

  function toggleQuestion(id: string) {
    if (selected.includes(id)) {
      setSelected((prev) => prev.filter((q) => q !== id));
      setAnswers((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else if (selected.length < 3) {
      setSelected((prev) => [...prev, id]);
      setAnswers((prev) => ({ ...prev, [id]: { answer: "", wrong1: "", wrong2: "" } }));
    }
  }

  function updateAnswer(id: string, field: keyof QAnswers, value: string) {
    setAnswers((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { answer: "", wrong1: "", wrong2: "" }), [field]: value },
    }));
  }

  const handleSubmit = async () => {
    if (!isReady || isLoading) return;

    try {
      setIsLoading(true);

      const questions = selected.map((id) => ({
        questionId: id,
        answer: answers[id].answer.trim(),
        wrongAnswers: [answers[id].wrong1.trim(), answers[id].wrong2.trim()],
      }));

      await apiFetch("/profiles/me/questions", {
        method: "PUT",
        body: JSON.stringify({ questions }),
      });

      await hydrateFromApi();
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Erreur", err?.message || "Impossible de sauvegarder les questions");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Tes 3 questions</Text>
        <Text style={styles.subtitle}>
          En cas de match, l'autre devra deviner ta vraie réponse parmi 3 choix.
        </Text>

        <Text style={styles.progress}>
          {selected.length}/3 question{selected.length !== 1 ? "s" : ""} sélectionnée{selected.length !== 1 ? "s" : ""}
        </Text>

        {QUESTION_CATALOG.map((q) => {
          const isSelected = selected.includes(q.id);
          const isDisabled = !isSelected && selected.length >= 3;
          const ans = answers[q.id];

          return (
            <View key={q.id} style={[styles.card, isSelected && styles.cardSelected]}>
              <TouchableOpacity
                onPress={() => toggleQuestion(q.id)}
                disabled={isDisabled}
                style={styles.cardHeader}
                activeOpacity={0.7}
              >
                <View style={[styles.dot, isSelected && styles.dotSelected]} />
                <Text style={[styles.questionText, isDisabled && styles.questionTextDisabled]}>
                  {q.text}
                </Text>
              </TouchableOpacity>

              {isSelected && ans && (
                <View style={styles.answersBlock}>
                  <Text style={styles.answerLabel}>Ta vraie réponse</Text>
                  <TextInput
                    style={styles.answerInput}
                    value={ans.answer}
                    onChangeText={(v) => updateAnswer(q.id, "answer", v)}
                    placeholder="Ta vraie réponse…"
                    placeholderTextColor="#B8A082"
                  />
                  <Text style={styles.answerLabel}>Fausse piste 1</Text>
                  <TextInput
                    style={styles.answerInput}
                    value={ans.wrong1}
                    onChangeText={(v) => updateAnswer(q.id, "wrong1", v)}
                    placeholder="Une réponse plausible mais fausse…"
                    placeholderTextColor="#B8A082"
                  />
                  <Text style={styles.answerLabel}>Fausse piste 2</Text>
                  <TextInput
                    style={styles.answerInput}
                    value={ans.wrong2}
                    onChangeText={(v) => updateAnswer(q.id, "wrong2", v)}
                    placeholder="Une autre réponse plausible mais fausse…"
                    placeholderTextColor="#B8A082"
                  />
                </View>
              )}
            </View>
          );
        })}

        <Pressable
          style={[styles.button, (!isReady || isLoading) && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={!isReady || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Entrer dans l'univers</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.replace("/(tabs)")} style={styles.skipBtn}>
          <Text style={styles.skipText}>Passer pour l'instant</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:             { flex: 1, backgroundColor: "#f6f1ea" },
  container:            { padding: 24, paddingBottom: 60 },
  title:                { fontSize: 32, fontWeight: "800", color: "#232126", marginBottom: 8, textAlign: "center" },
  subtitle:             { fontSize: 15, color: "#7a746d", marginBottom: 8, textAlign: "center", lineHeight: 22 },
  progress:             { fontSize: 13, fontWeight: "700", color: "#9c2f45", textAlign: "center", marginBottom: 20 },
  card:                 { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#d9cec3" },
  cardSelected:         { borderColor: "#9c2f45", borderWidth: 2 },
  cardHeader:           { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  dot:                  { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#d9cec3", marginTop: 2, flexShrink: 0 },
  dotSelected:          { backgroundColor: "#9c2f45", borderColor: "#9c2f45" },
  questionText:         { flex: 1, fontSize: 15, fontWeight: "600", color: "#2a272c", lineHeight: 22 },
  questionTextDisabled: { color: "#B8A082" },
  answersBlock:         { marginTop: 16, gap: 6 },
  answerLabel:          { fontSize: 12, fontWeight: "700", color: "#8B6F47", marginBottom: 2, marginTop: 8 },
  answerInput:          { backgroundColor: "#f6f1ea", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: "#d9cec3", color: "#1f1d21" },
  button:               { marginTop: 24, height: 56, borderRadius: 16, backgroundColor: "#9c2f45", justifyContent: "center", alignItems: "center" },
  buttonText:           { color: "#fff", fontSize: 18, fontWeight: "700" },
  skipBtn:              { alignItems: "center", paddingVertical: 12 },
  skipText:             { fontSize: 14, color: "#B8A082", fontWeight: "600" },
});
