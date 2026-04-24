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

type Question = { text: string; options: [string, string, string]; correctAnswer: 0 | 1 | 2 };
const EMPTY_QUESTION = (): Question => ({ text: '', options: ['', '', ''], correctAnswer: 0 });

function QuestionBlock({ index, question, onChange }: {
  index: number;
  question: Question;
  onChange: (q: Question) => void;
}) {
  return (
    <View style={qStyles.block}>
      <Text style={qStyles.qLabel}>Question {index + 1}</Text>
      <TextInput
        style={qStyles.qInput}
        value={question.text}
        onChangeText={t => onChange({ ...question, text: t })}
        placeholder="Ex: Quelle est ma passion principale ?"
        placeholderTextColor="#B8A082"
      />
      <Text style={qStyles.aLabel}>3 Réponses possibles</Text>
      {([0, 1, 2] as (0 | 1 | 2)[]).map(i => (
        <View key={i} style={qStyles.optionRow}>
          <TextInput
            style={qStyles.optionInput}
            value={question.options[i]}
            onChangeText={t => {
              const opts = [...question.options] as [string, string, string];
              opts[i] = t;
              onChange({ ...question, options: opts });
            }}
            placeholder={`Réponse ${i + 1}`}
            placeholderTextColor="#B8A082"
          />
          <TouchableOpacity
            style={[qStyles.checkBtn, question.correctAnswer === i && qStyles.checkBtnActive]}
            onPress={() => onChange({ ...question, correctAnswer: i })}
          >
            <Text style={qStyles.checkIcon}>{question.correctAnswer === i ? '✓' : ''}</Text>
          </TouchableOpacity>
        </View>
      ))}
      <Text style={qStyles.hint}>Marquez la bonne réponse avec ✓</Text>
    </View>
  );
}

const qStyles = StyleSheet.create({
  block:          { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#d9cec3' },
  qLabel:         { fontSize: 15, fontWeight: '700', color: '#3A2818', marginBottom: 8 },
  qInput:         { backgroundColor: '#f6f1ea', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: '#d9cec3', marginBottom: 12 },
  aLabel:         { fontSize: 13, fontWeight: '600', color: '#8B6F47', marginBottom: 8 },
  optionRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  optionInput:    { flex: 1, backgroundColor: '#f6f1ea', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: '#d9cec3' },
  checkBtn:       { width: 40, height: 40, borderRadius: 10, backgroundColor: '#d9cec3', alignItems: 'center', justifyContent: 'center', marginLeft: 8, borderWidth: 2, borderColor: '#d9cec3' },
  checkBtnActive: { backgroundColor: '#9c2f45', borderColor: '#9c2f45' },
  checkIcon:      { fontSize: 18, color: '#fff', fontWeight: '800' },
  hint:           { fontSize: 12, color: '#B8A082', textAlign: 'right', marginTop: 4 },
});

export default function CreateProfileScreen() {
  const router = useRouter();

  const [pseudo, setPseudo] = useState("");
  const [bio, setBio] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    EMPTY_QUESTION(), EMPTY_QUESTION(), EMPTY_QUESTION(),
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const isValid = pseudo.trim().length >= 2;

  const handleCreateProfile = async () => {
    if (!isValid || isLoading) return;

    try {
      setIsLoading(true);

      await apiFetch("/profiles", {
        method: "POST",
        body: JSON.stringify({
          pseudo: pseudo.trim(),
          bio: bio.trim(),
          questions,
        }),
      });

      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Erreur", err?.message || "Impossible de créer le profil");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Ton profil</Text>
        <Text style={styles.subtitle}>Donne une première impression…</Text>

        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Pseudo</Text>
            <TextInput
              value={pseudo}
              onChangeText={setPseudo}
              placeholder="Ton pseudo"
              style={styles.input}
            />
          </View>

          <View>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Quelques mots sur toi…"
              style={[styles.input, { height: 100 }]}
              multiline
            />
          </View>

          <View>
            <Text style={styles.sectionTitle}>🎲 Jeu des 3 Questions</Text>
            <Text style={styles.sectionSub}>
              Crée 3 questions avec 3 réponses chacune. En cas de match, l'autre personne devra y répondre pour débloquer les lettres.
            </Text>
            {questions.map((q, i) => (
              <QuestionBlock
                key={i}
                index={i}
                question={q}
                onChange={updated => {
                  const copy = [...questions];
                  copy[i] = updated;
                  setQuestions(copy);
                }}
              />
            ))}
          </View>

          <Pressable
            style={[styles.button, (!isValid || isLoading) && { opacity: 0.5 }]}
            onPress={handleCreateProfile}
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Entrer dans l'univers</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:     { flex: 1, backgroundColor: "#f6f1ea" },
  container:    { padding: 24, paddingBottom: 60 },
  title:        { fontSize: 32, fontWeight: "800", color: "#232126", marginBottom: 8, textAlign: "center" },
  subtitle:     { fontSize: 16, color: "#7a746d", marginBottom: 24, textAlign: "center" },
  form:         { gap: 16 },
  label:        { fontSize: 15, fontWeight: "600", color: "#2a272c", marginBottom: 6 },
  input:        { borderWidth: 1, borderColor: "#d9cec3", borderRadius: 12, padding: 12, backgroundColor: "#fff" },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#2a272c", marginBottom: 6 },
  sectionSub:   { fontSize: 13, color: "#7a746d", marginBottom: 14, lineHeight: 20 },
  button:       { marginTop: 16, height: 56, borderRadius: 16, backgroundColor: "#9c2f45", justifyContent: "center", alignItems: "center" },
  buttonText:   { color: "#fff", fontSize: 18, fontWeight: "700" },
});
