import { useMemo, useState } from "react";
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

const GENDER_OPTIONS = [
  { label: "Homme", value: "HOMME" },
  { label: "Femme", value: "FEMME" },
];

function extractToken(res: any): string | null {
  if (!res) return null;

  return (
    res?.accessToken ||
    res?.token ||
    res?.access_token ||
    res?.data?.accessToken ||
    res?.data?.token ||
    res?.data?.access_token ||
    res?.tokens?.accessToken ||
    res?.tokens?.token ||
    res?.tokens?.access_token ||
    null
  );
}

export default function RegisterScreen() {
  const router = useRouter();

  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState<"HOMME" | "FEMME" | "">("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const emailValid = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const birthDateValid = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim())) return false;

    const isoCandidate = new Date(`${birthDate.trim()}T00:00:00.000Z`);
    return !Number.isNaN(isoCandidate.getTime());
  }, [birthDate]);

  const passwordValid = password.trim().length >= 8;
  const passwordsMatch = password === confirmPassword;

  const isFormValid =
    pseudo.trim().length >= 2 &&
    emailValid &&
    birthDateValid &&
    city.trim().length >= 2 &&
    !!gender &&
    passwordValid &&
    passwordsMatch;

  const handleRegister = async () => {
    if (!isFormValid || isLoading) return;

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

      const token = extractToken(res);

      if (!token) {
        Alert.alert(
          "Compte créé",
          "Le compte a bien été créé. Connecte-toi maintenant."
        );
        router.replace("/login");
        return;
      }

      await saveToken(token);
      router.replace("/create-profile");
    } catch (err: any) {
      Alert.alert("Erreur", err?.message || "Impossible de créer le compte.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    fieldKey: string,
    options?: {
      placeholder?: string;
      secureTextEntry?: boolean;
      keyboardType?: "default" | "email-address";
      autoCapitalize?: "none" | "words" | "sentences" | "characters";
    }
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={options?.placeholder}
        placeholderTextColor="#9a948d"
        secureTextEntry={options?.secureTextEntry}
        keyboardType={options?.keyboardType}
        autoCapitalize={options?.autoCapitalize ?? "sentences"}
        style={[styles.input, focusedField === fieldKey && styles.inputFocused]}
        onFocus={() => setFocusedField(fieldKey)}
        onBlur={() => setFocusedField(null)}
      />
    </View>
  );

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
              Commence ton aventure en quelques informations.
            </Text>

            <View style={styles.form}>
              {renderField("Pseudo", pseudo, setPseudo, "pseudo", {
                placeholder: "Ton pseudo",
                autoCapitalize: "words",
              })}

              {renderField("Email", email, setEmail, "email", {
                placeholder: "ton@email.com",
                keyboardType: "email-address",
                autoCapitalize: "none",
              })}

              {renderField(
                "Date de naissance",
                birthDate,
                setBirthDate,
                "birthDate",
                {
                  placeholder: "1984-08-28",
                  autoCapitalize: "none",
                }
              )}

              {renderField("Ville", city, setCity, "city", {
                placeholder: "Paris",
                autoCapitalize: "words",
              })}

              <View style={styles.field}>
                <Text style={styles.label}>Genre</Text>
                <View style={styles.genderRow}>
                  {GENDER_OPTIONS.map((option) => {
                    const active = gender === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        style={[
                          styles.genderButton,
                          active && styles.genderButtonActive,
                        ]}
                        onPress={() => setGender(option.value as "HOMME" | "FEMME")}
                      >
                        <Text
                          style={[
                            styles.genderButtonText,
                            active && styles.genderButtonTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {renderField("Mot de passe", password, setPassword, "password", {
                placeholder: "Minimum 8 caractères",
                secureTextEntry: true,
                autoCapitalize: "none",
              })}

              {renderField(
                "Confirmer le mot de passe",
                confirmPassword,
                setConfirmPassword,
                "confirmPassword",
                {
                  placeholder: "••••••••",
                  secureTextEntry: true,
                  autoCapitalize: "none",
                }
              )}

              <View style={styles.hints}>
                {!emailValid && email.length > 0 ? (
                  <Text style={styles.hintError}>Email invalide.</Text>
                ) : null}
                {!birthDateValid && birthDate.length > 0 ? (
                  <Text style={styles.hintError}>
                    Utilise le format YYYY-MM-DD.
                  </Text>
                ) : null}
                {!passwordValid && password.length > 0 ? (
                  <Text style={styles.hintError}>
                    Le mot de passe doit contenir au moins 8 caractères.
                  </Text>
                ) : null}
                {!passwordsMatch && confirmPassword.length > 0 ? (
                  <Text style={styles.hintError}>
                    Les mots de passe ne correspondent pas.
                  </Text>
                ) : null}
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

              <Pressable disabled={isLoading} onPress={() => router.back()}>
                <Text style={styles.link}>Retour à la connexion</Text>
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
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
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
    fontSize: 32,
    fontWeight: "800",
    color: "#232126",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 16,
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
  inputFocused: {
    borderColor: "#9c2f45",
    borderWidth: 2,
  },
  genderRow: {
    flexDirection: "row",
    gap: 10,
  },
  genderButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d9cec3",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  genderButtonActive: {
    borderColor: "#9c2f45",
    backgroundColor: "#f8e7eb",
  },
  genderButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4b454d",
  },
  genderButtonTextActive: {
    color: "#9c2f45",
  },
  hints: {
    gap: 6,
  },
  hintError: {
    fontSize: 13,
    color: "#b03a48",
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
