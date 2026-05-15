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

type Question = {
  text: string;
  options: [string, string, string];
  correctAnswer: 0 | 1 | 2;
};

const EMPTY_QUESTION = (): Question => ({ text: "", options: ["", "", ""], correctAnswer: 0 });

function QuestionBlock({
  index,
  question,
  onChange,
}: {
  index: number;
  question: Question;
  onChange: (next: Question) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Question {index + 1}</Text>
      <TextInput
        style={styles.input}
        value={question.text}
        onChangeText={(t) => onChange({ ...question, text: t })}
        placeholder="Écris ta question…"
        placeholderTextColor="#B8A082"
      />

      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.answerRow}>
          <TextInput
            style={[styles.input, styles.answerInput]}
            value={question.options[i]}
            onChangeText={(t) => {
              const options = [...question.options] as [string, string, string];
              options[i] = t;
              onChange({ ...question, options });
            }}
            placeholder={`Réponse ${i + 1}`}
            placeholderTextColor="#B8A082"
          />
          <TouchableOpacity
            style={[styles.checkBtn, question.correctAnswer === i && styles.checkBtnActive]}
            onPress={() => onChange({ ...question, correctAnswer: i as 0 | 1 | 2 })}
            activeOpacity={0.8}
          >
            <Text style={styles.checkIcon}>{question.correctAnswer === i ? "✓" : ""}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

export default function SetupQuestionsScreen() {
  const router = useRouter();
  const { hydrateFromApi } = useStore();

  const [questions, setQuestions] = useState<Question[]>([
    EMPTY_QUESTION(),
    EMPTY_QUESTION(),
    EMPTY_QUESTION(),
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const isReady = questions.every(
    (q) => q.text.trim().length > 0 && q.options.every((o) => o.trim().length > 0)
  );

  const handleSubmit = async () => {
    if (!isReady || isLoading) return;

    try {
      setIsLoading(true);

      await apiFetch("/profiles/me/questions", {
        method: "PUT",
        body: JSON.stringify({
          questions: questions.map((q) => {
            const trimmedOptions = q.options.map((o) => o.trim());
            const correctAnswer = trimmedOptions[q.correctAnswer];
            const wrongAnswers = trimmedOptions.filter((_, i) => i !== q.correctAnswer);
            return {
              questionText: q.text.trim(),
              answer: correctAnswer,
              wrongAnswers,
            };
          }),
        }),
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
          Écris tes 3 questions et 3 réponses par question. Coche la bonne réponse pour chacune.
        </Text>

        {questions.map((q, i) => (
          <QuestionBlock
            key={i}
            index={i}
            question={q}
            onChange={(next) => {
              const copy = [...questions];
              copy[i] = next;
              setQuestions(copy);
            }}
          />
        ))}

        <Pressable
          style={[styles.button, (!isReady || isLoading) && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={!isReady || isLoading}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrer dans l’univers</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f6f1ea" },
  container: { padding: 24, paddingBottom: 60 },
  title: { fontSize: 32, fontWeight: "800", color: "#232126", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 15, color: "#7a746d", marginBottom: 20, textAlign: "center", lineHeight: 22 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#d9cec3" },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#7b2a3f", marginBottom: 10 },
  input: { backgroundColor: "#f6f1ea", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: "#d9cec3", color: "#1f1d21" },
  answerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  answerInput: { flex: 1 },
  checkBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: "#d9cec3", alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  checkBtnActive: { borderColor: "#9c2f45", backgroundColor: "#9c2f45" },
  checkIcon: { color: "#fff", fontWeight: "900" },
  button: { marginTop: 24, height: 56, borderRadius: 16, backgroundColor: "#9c2f45", justifyContent: "center", alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
