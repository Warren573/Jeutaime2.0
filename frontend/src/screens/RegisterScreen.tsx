import { useRef, useState } from "react";
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
import { useStore } from "../store/useStore";

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

const GENDER_OPTIONS = [
  { label: "Homme", value: "HOMME" },
  { label: "Femme", value: "FEMME" },
  { label: "Autre", value: "AUTRE" },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { register: storeRegister } = useStore();

  const [pseudo, setPseudo]     = useState("");
  const [email, setEmail]       = useState("");
  const [city, setCity]         = useState("");
  const [gender, setGender]     = useState("HOMME");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Date — separate fields, auto-advance focus
  const [day, setDay]     = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear]   = useState("");
  const monthRef = useRef<TextInput>(null);
  const yearRef  = useRef<TextInput>(null);

  const handleDayChange = (t: string) => {
    const v = t.replace(/\D/g, "").slice(0, 2);
    setDay(v);
    if (v.length === 2) monthRef.current?.focus();
  };
  const handleMonthChange = (t: string) => {
    const v = t.replace(/\D/g, "").slice(0, 2);
    setMonth(v);
    if (v.length === 2) yearRef.current?.focus();
  };
  const handleYearChange = (t: string) => {
    setYear(t.replace(/\D/g, "").slice(0, 4));
  };

  // Date validation
  const isDateFilled = day.length === 2 && month.length === 2 && year.length === 4;
  const birthDateStr = isDateFilled ? `${year}-${month}-${day}` : "";

  const birthDateError = (() => {
    if (!isDateFilled) return null;
    const d = new Date(`${birthDateStr}T00:00:00.000Z`);
    if (
      isNaN(d.getTime()) ||
      d.getDate() !== parseInt(day, 10) ||
      d.getMonth() + 1 !== parseInt(month, 10)
    ) {
      return "Date invalide";
    }
    const age = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return age < 18 ? "Tu dois avoir au moins 18 ans" : null;
  })();

  // Field validation
  const pseudoError = pseudo.length > 0
    ? pseudo.trim().length < 3
      ? "3 caractères minimum"
      : !/^[a-zA-Z0-9_\-\.]+$/.test(pseudo.trim())
        ? "Lettres, chiffres, _ - . uniquement"
        : null
    : null;

  const passwordError = password.length > 0
    ? password.length < 8
      ? "8 caractères minimum"
      : !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
        ? "Doit contenir une majuscule, une minuscule et un chiffre"
        : null
    : null;

  const VALID_GENDERS = ["HOMME", "FEMME", "AUTRE"];

  const isFormValid =
    pseudo.trim().length >= 3 && pseudoError === null &&
    email.trim().length > 0 &&
    isDateFilled && birthDateError === null &&
    city.trim().length > 0 &&
    VALID_GENDERS.includes(gender) &&
    password.length >= 8 && passwordError === null;

  const handleRegister = async () => {
    if (isLoading) return;

    if (!isFormValid) {
      const errors: string[] = [];
      if (!pseudo.trim() || pseudoError)
        errors.push(`• Pseudo : ${pseudoError ?? "requis"}`);
      if (!email.trim())
        errors.push("• Email : requis");
      if (!isDateFilled)
        errors.push("• Date de naissance : JJ / MM / AAAA");
      else if (birthDateError)
        errors.push(`• Date de naissance : ${birthDateError}`);
      if (!city.trim())
        errors.push("• Ville : requise");
      if (!password || passwordError)
        errors.push(`• Mot de passe : ${passwordError ?? "requis — 8 car. min. avec MAJ et chiffre"}`);
      Alert.alert("Formulaire incomplet", errors.join("\n"));
      return;
    }

    try {
      setIsLoading(true);
      console.warn("[Register] envoi →", {
        pseudo: pseudo.trim(),
        email: email.trim(),
        birthDate: birthDateStr,
        city: city.trim(),
        gender,
      });

      await storeRegister({
        pseudo:    pseudo.trim(),
        email:     email.trim().toLowerCase(),
        birthDate: new Date(`${birthDateStr}T00:00:00.000Z`).toISOString(),
        city:      city.trim(),
        gender:    gender as "HOMME" | "FEMME" | "AUTRE",
        password,
      });

      console.warn("[Register] succès → /create-profile");
      router.replace("/create-profile");
    } catch (err: any) {
      console.warn("[Register] erreur →", err?.message);
      Alert.alert(
        "Inscription impossible",
        err?.message ?? "Une erreur est survenue. Vérifie ta connexion et réessaie."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safeArea}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.card}>
            <Text style={s.brand}>JEUTAIME</Text>
            <Text style={s.title}>Créer un compte</Text>
            <Text style={s.subtitle}>
              Rejoins l'univers et commence l'aventure.
            </Text>

            <View style={s.form}>

              {/* Pseudo */}
              <View style={s.field}>
                <Text style={s.label}>Pseudo</Text>
                <TextInput
                  value={pseudo}
                  onChangeText={setPseudo}
                  placeholder="Ton pseudo"
                  placeholderTextColor="#9a948d"
                  autoCapitalize="none"
                  style={s.input}
                />
                {pseudoError ? <Text style={s.fieldError}>{pseudoError}</Text> : null}
              </View>

              {/* Email */}
              <View style={s.field}>
                <Text style={s.label}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="ton@email.com"
                  placeholderTextColor="#9a948d"
                  style={s.input}
                />
              </View>

              {/* Date de naissance — 3 champs JJ / MM / AAAA */}
              <View style={s.field}>
                <Text style={s.label}>Date de naissance</Text>
                <View style={s.dateRow}>
                  <TextInput
                    value={day}
                    onChangeText={handleDayChange}
                    placeholder="JJ"
                    placeholderTextColor="#9a948d"
                    keyboardType="number-pad"
                    maxLength={2}
                    style={[s.input, s.dateInput]}
                    textAlign="center"
                  />
                  <Text style={s.dateSep}>/</Text>
                  <TextInput
                    ref={monthRef}
                    value={month}
                    onChangeText={handleMonthChange}
                    placeholder="MM"
                    placeholderTextColor="#9a948d"
                    keyboardType="number-pad"
                    maxLength={2}
                    style={[s.input, s.dateInput]}
                    textAlign="center"
                  />
                  <Text style={s.dateSep}>/</Text>
                  <TextInput
                    ref={yearRef}
                    value={year}
                    onChangeText={handleYearChange}
                    placeholder="AAAA"
                    placeholderTextColor="#9a948d"
                    keyboardType="number-pad"
                    maxLength={4}
                    style={[s.input, s.dateInputYear]}
                    textAlign="center"
                  />
                </View>
                {birthDateError ? (
                  <Text style={s.fieldError}>{birthDateError}</Text>
                ) : null}
              </View>

              {/* Ville */}
              <View style={s.field}>
                <Text style={s.label}>Ville</Text>
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="Ta ville"
                  placeholderTextColor="#9a948d"
                  style={s.input}
                />
              </View>

              {/* Genre */}
              <View style={s.field}>
                <Text style={s.label}>Genre</Text>
                <View style={s.genderRow}>
                  {GENDER_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[s.genderBtn, gender === opt.value && s.genderBtnActive]}
                      onPress={() => setGender(opt.value)}
                    >
                      <Text style={[s.genderBtnText, gender === opt.value && s.genderBtnTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Mot de passe */}
              <View style={s.field}>
                <Text style={s.label}>Mot de passe</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor="#9a948d"
                  style={s.input}
                />
                {passwordError
                  ? <Text style={s.fieldError}>{passwordError}</Text>
                  : <Text style={s.fieldHint}>8 caractères min. · une majuscule · un chiffre</Text>
                }
              </View>

              {/* Bouton — toujours tappable, affiche les erreurs si formulaire incomplet */}
              <Pressable
                style={[s.button, (!isFormValid || isLoading) && s.buttonDisabled]}
                onPress={handleRegister}
              >
                {isLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.buttonText}>Créer mon compte</Text>
                }
              </Pressable>

              <Pressable disabled={isLoading} onPress={() => router.replace("/login")}>
                <Text style={s.link}>Déjà un compte ? Se connecter</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex:       { flex: 1 },
  safeArea:   { flex: 1, backgroundColor: "#f6f1ea" },
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
  form:  { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 16, fontWeight: "600", color: "#2a272c" },
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

  // Date row
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateInput: {
    flex: 1,
    paddingHorizontal: 0,
  },
  dateInputYear: {
    flex: 1.6,
    paddingHorizontal: 0,
  },
  dateSep: {
    fontSize: 20,
    color: "#d9cec3",
    fontWeight: "300",
  },

  genderRow: { flexDirection: "row", gap: 10 },
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
  genderBtnActive:     { backgroundColor: "#9c2f45", borderColor: "#9c2f45" },
  genderBtnText:       { fontSize: 15, fontWeight: "600", color: "#2a272c" },
  genderBtnTextActive: { color: "#fff" },

  button: {
    marginTop: 8,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#9c2f45",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText:     { color: "#fff", fontSize: 18, fontWeight: "700" },
  link: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    color: "#9c3d4f",
  },
  fieldError: { fontSize: 13, color: "#c0392b" },
  fieldHint:  { fontSize: 12, color: "#9a948d" },
});
