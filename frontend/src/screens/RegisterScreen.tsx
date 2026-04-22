import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "../api/client";
import { saveToken } from "../utils/session";
import { useStore } from "../store/useStore";

const AUTH_ENABLED = true;

const GENDER_OPTIONS = [
  { label: "Homme", value: "HOMME" },
  { label: "Femme", value: "FEMME" },
  { label: "Autre", value: "AUTRE" },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { hydrateFromApi } = useStore();

  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("HOMME");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isFormValid =
    pseudo.trim().length >= 2 &&
    email.trim().length > 0 &&
    birthDate.trim().length === 10 &&
    city.trim().length > 0 &&
    password.length >= 6;

  const handleRegister = async () => {
    if (!isFormValid || isLoading) return;

    // TEMP: skip API call, enter app directly
    if (!AUTH_ENABLED) {
      router.replace("/(tabs)");
      return;
    }

    try {
      setIsLoading(true);

      const birthDateIso = new Date(
        `${birthDate.trim()}T00:00:00.000Z`
      ).toISOString();

      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          pseudo: pseudo.trim(),
          email: email.trim().toLowerCase(),
          birthDate: birthDateIso,
          city: city.trim(),
          gender,
          password,
        }),
      });

      const token =
        res?.data?.accessToken ?? res?.data?.token ??
        res?.accessToken ?? res?.token ?? null;

      if (!token) {
        Alert.alert("Compte créé", "Connecte-toi pour continuer.");
        router.replace("/login");
        return;
      }

      await saveToken(token);
      await hydrateFromApi();
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Erreur", err?.message || "Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.brand}>JEUTAIME</Text>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>
              Rejoins l'univers et commence l'aventure.
            </Text>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Pseudo</Text>
                <TextInput
                  value={pseudo}
                  onChangeText={setPseudo}
                  placeholder="Ton pseudo"
                  placeholderTextColor="#9a948d"
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="ton@email.com"
                  placeholderTextColor="#9a948d"
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Date de naissance</Text>
                <TextInput
                  value={birthDate}
                  onChangeText={setBirthDate}
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor="#9a948d"
                  keyboardType="numeric"
                  style={styles.input}
                  maxLength={10}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Ville</Text>
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="Ta ville"
                  placeholderTextColor="#9a948d"
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Genre</Text>
                <View style={styles.genderRow}>
                  {GENDER_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[
                        styles.genderBtn,
                        gender === opt.value && styles.genderBtnActive,
                      ]}
                      onPress={() => setGender(opt.value)}
                    >
                      <Text
                        style={[
                          styles.genderBtnText,
                          gender === opt.value && styles.genderBtnTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Mot de passe</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor="#9a948d"
                  style={styles.input}
                />
              </View>

              <Pressable
                style={[
                  styles.button,
                  (!isFormValid || isLoading) && styles.buttonDisabled,
                ]}
                onPress={handleRegister}
                disabled={!isFormValid || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Créer mon compte</Text>
                )}
              </Pressable>

              <Pressable disabled={isLoading} onPress={() => router.replace("/login")}>
                <Text style={styles.link}>Déjà un compte ? Se connecter</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#f6f1ea",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fffaf5",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: "#e7ddd2",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  brand: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 4,
    color: "#9c3d4f",
    marginBottom: 14,
  },
  title: {
    textAlign: "center",
    fontSize: 34,
    fontWeight: "800",
    color: "#232126",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 17,
    lineHeight: 24,
    color: "#7a746d",
    marginBottom: 28,
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2a272c",
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: "#d9cec3",
    borderRadius: 14,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1f1d21",
  },
  genderRow: {
    flexDirection: "row",
    gap: 10,
  },
  genderBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d9cec3",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  genderBtnActive: {
    backgroundColor: "#9c2f45",
    borderColor: "#9c2f45",
  },
  genderBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2a272c",
  },
  genderBtnTextActive: {
    color: "#fff",
  },
  button: {
    marginTop: 8,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#9c2f45",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  link: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    color: "#9c3d4f",
  },
});
