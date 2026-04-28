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

const INTERESTED_IN_OPTIONS = [
  { label: "Femmes", value: "FEMME" },
  { label: "Hommes", value: "HOMME" },
];

const LOOKING_FOR_OPTIONS = [
  { label: "Relation sérieuse", value: "SERIEUX" },
  { label: "Flirt", value: "FLIRT" },
  { label: "Amitié", value: "AMITIE" },
  { label: "Discussion", value: "DISCUSSION" },
];

const PHYSICAL_DESC_OPTIONS = [
  { label: "Filiforme", value: "filiforme" },
  { label: "Ras des mottes", value: "ras_motte" },
  { label: "Grande gigue", value: "grande_gigue" },
  { label: "Costaud(e)", value: "costaud" },
  { label: "Mignon(ne)", value: "mignon" },
  { label: "Mystérieux(se)", value: "mysterieux" },
  { label: "Athlétique", value: "athletique" },
  { label: "Doux(ce)", value: "doux" },
];

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function CreateProfileScreen() {
  const router = useRouter();
  const { hydrateFromApi } = useStore();

  const [bio, setBio] = useState("");
  const [interestedIn, setInterestedIn] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [physicalDesc, setPhysicalDesc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const bioWords = countWords(bio);
  const isValid =
    bio.trim().length > 0 &&
    interestedIn.length > 0 &&
    lookingFor.length > 0 &&
    physicalDesc !== null;

  function toggleLookingFor(value: string) {
    setLookingFor((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  const handleSave = async () => {
    if (!isValid || isLoading) return;

    try {
      setIsLoading(true);

      await apiFetch("/profiles/me", {
        method: "PATCH",
        body: JSON.stringify({
          bio: bio.trim(),
          interestedIn,
          lookingFor,
          physicalDesc,
        }),
      });

      await hydrateFromApi();
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Erreur", err?.message || "Impossible de sauvegarder le profil");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Ton profil</Text>
        <Text style={styles.subtitle}>Quelques infos pour bien démarrer</Text>

        <View style={styles.form}>
          {/* Bio */}
          <View>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Dis-nous qui tu es, ce que tu aimes, ce qui te fait lever le matin…"
              placeholderTextColor="#B8A082"
              style={[styles.input, styles.inputMultiline]}
              multiline
              textAlignVertical="top"
            />
            <Text style={[styles.wordCount, bioWords >= 50 && styles.wordCountOk]}>
              {bioWords} mot{bioWords !== 1 ? "s" : ""}{bioWords < 50 ? ` — encore ${50 - bioWords} pour un profil complet` : " — parfait !"}
            </Text>
          </View>

          {/* interestedIn */}
          <View>
            <Text style={styles.label}>Je suis intéressé(e) par</Text>
            <View style={styles.chipRow}>
              {INTERESTED_IN_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, interestedIn.includes(opt.value) && styles.chipActive]}
                  onPress={() => {
                    setInterestedIn((prev) =>
                      prev.includes(opt.value)
                        ? prev.filter((v) => v !== opt.value)
                        : [...prev, opt.value]
                    );
                  }}
                >
                  <Text style={[styles.chipText, interestedIn.includes(opt.value) && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* lookingFor */}
          <View>
            <Text style={styles.label}>Je cherche</Text>
            <View style={styles.chipRow}>
              {LOOKING_FOR_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, lookingFor.includes(opt.value) && styles.chipActive]}
                  onPress={() => toggleLookingFor(opt.value)}
                >
                  <Text style={[styles.chipText, lookingFor.includes(opt.value) && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* physicalDesc */}
          <View>
            <Text style={styles.label}>Je me décris physiquement comme</Text>
            <View style={styles.chipGrid}>
              {PHYSICAL_DESC_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, physicalDesc === opt.value && styles.chipActive]}
                  onPress={() => setPhysicalDesc(opt.value)}
                >
                  <Text style={[styles.chipText, physicalDesc === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Pressable
            style={[styles.button, (!isValid || isLoading) && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={!isValid || isLoading}
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:        { flex: 1, backgroundColor: "#f6f1ea" },
  container:       { padding: 24, paddingBottom: 60 },
  title:           { fontSize: 32, fontWeight: "800", color: "#232126", marginBottom: 8, textAlign: "center" },
  subtitle:        { fontSize: 16, color: "#7a746d", marginBottom: 24, textAlign: "center" },
  form:            { gap: 20 },
  label:           { fontSize: 15, fontWeight: "600", color: "#2a272c", marginBottom: 8 },
  input:           { borderWidth: 1, borderColor: "#d9cec3", borderRadius: 12, padding: 12, backgroundColor: "#fff", fontSize: 15, color: "#1f1d21" },
  inputMultiline:  { height: 120 },
  wordCount:       { fontSize: 12, color: "#B8A082", marginTop: 4, textAlign: "right" },
  wordCountOk:     { color: "#4a9c6d" },
  chipRow:         { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chipGrid:        { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip:            { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: "#d9cec3", backgroundColor: "#fff" },
  chipActive:      { backgroundColor: "#9c2f45", borderColor: "#9c2f45" },
  chipText:        { fontSize: 14, fontWeight: "600", color: "#2a272c" },
  chipTextActive:  { color: "#fff" },
  button:          { marginTop: 8, height: 56, borderRadius: 16, backgroundColor: "#9c2f45", justifyContent: "center", alignItems: "center" },
  buttonText:      { color: "#fff", fontSize: 18, fontWeight: "700" },
  skipBtn:         { alignItems: "center", paddingVertical: 12 },
  skipText:        { fontSize: 14, color: "#B8A082", fontWeight: "600" },
});
