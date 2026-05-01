import { useState } from "react";
import {
  ActivityIndicator,
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

const GENDER_OPTIONS = [
  { label: "Homme", value: "HOMME" },
  { label: "Femme", value: "FEMME" },
  { label: "Autre", value: "AUTRE" },
];

type Status = "idle" | "submitting" | "success" | "error";

export default function RegisterScreen() {
  const router = useRouter();
  const { register: storeRegister } = useStore();

  const [pseudo,   setPseudo]   = useState("");
  const [email,    setEmail]    = useState("");
  const [city,     setCity]     = useState("");
  const [gender,   setGender]   = useState("HOMME");
  const [password, setPassword] = useState("");

  const [dayStr,   setDayStr]   = useState("");
  const [monthStr, setMonthStr] = useState("");
  const [yearStr,  setYearStr]  = useState("");

  const [status,    setStatus]    = useState<Status>("idle");
  const [lastError, setLastError] = useState<string | null>(null);

  // ─── Date validation ─────────────────────────────────────────────────────────
  const allDateFilled = dayStr.length > 0 && monthStr.length > 0 && yearStr.length === 4;

  const parsedDay   = parseInt(dayStr, 10);
  const parsedMonth = parseInt(monthStr, 10);
  const parsedYear  = parseInt(yearStr, 10);

  const isDateValid = allDateFilled &&
    !isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 31 &&
    !isNaN(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12 &&
    !isNaN(parsedYear) && parsedYear >= 1900 && parsedYear <= new Date().getFullYear() &&
    (() => {
      const d = new Date(parsedYear, parsedMonth - 1, parsedDay);
      return (
        d.getFullYear() === parsedYear &&
        d.getMonth() === parsedMonth - 1 &&
        d.getDate() === parsedDay
      );
    })();

  const birthDate = isDateValid
    ? `${parsedYear}-${String(parsedMonth).padStart(2, "0")}-${String(parsedDay).padStart(2, "0")}`
    : null;

  const ageError = birthDate
    ? (Date.now() - new Date(`${birthDate}T00:00:00.000Z`).getTime()) /
        (365.25 * 24 * 60 * 60 * 1000) < 18
      ? "Tu dois avoir au moins 18 ans"
      : null
    : null;

  // ─── Field validation ─────────────────────────────────────────────────────────
  const pseudoError =
    pseudo.length > 0
      ? pseudo.trim().length < 3
        ? "3 caractères minimum"
        : !/^[a-zA-Z0-9_\-.]+$/.test(pseudo.trim())
        ? "Lettres, chiffres, _ - . uniquement"
        : null
      : null;

  const passwordError =
    password.length > 0
      ? password.length < 8
        ? "8 caractères minimum"
        : !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
        ? "Doit contenir une majuscule, une minuscule et un chiffre"
        : null
      : null;

  const isFormValid =
    pseudo.trim().length >= 3 &&
    !pseudoError &&
    email.trim().length > 0 &&
    isDateValid &&
    !ageError &&
    city.trim().length > 0 &&
    password.length >= 8 &&
    !passwordError;

  // ─── Submit ───────────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    console.warn("[Register] handleRegister appelé");

    if (status === "submitting") {
      console.warn("[Register] déjà en cours, ignoré");
      return;
    }

    console.warn("[Register] isFormValid=", isFormValid, {
      pseudo: pseudo.trim(),
      email: email.trim(),
      birthDate,
      city: city.trim(),
      passwordLen: password.length,
      pseudoError,
      passwordError,
      ageError,
      isDateValid,
    });

    if (!isFormValid) {
      const errs: string[] = [];
      if (!pseudo.trim() || pseudoError) errs.push(`Pseudo : ${pseudoError ?? "requis"}`);
      if (!email.trim())                 errs.push("Email : requis");
      if (!isDateValid || ageError)      errs.push(`Date : ${ageError ?? "invalide"}`);
      if (!city.trim())                  errs.push("Ville : requise");
      if (!password || passwordError)    errs.push(`Mot de passe : ${passwordError ?? "requis"}`);
      const msg = errs.join("  •  ");
      console.warn("[Register] formulaire invalide:", msg);
      setLastError(msg);
      setStatus("error");
      return;
    }

    const payload = {
      pseudo:    pseudo.trim(),
      email:     email.trim().toLowerCase(),
      birthDate: new Date(`${birthDate}T00:00:00.000Z`).toISOString(),
      city:      city.trim(),
      gender:    gender as "HOMME" | "FEMME" | "AUTRE",
      password,
    };
    console.warn("[Register] payload:", JSON.stringify(payload));

    setStatus("submitting");
    setLastError(null);

    try {
      console.warn("[Register] appel storeRegister...");
      await storeRegister(payload);
      console.warn("[Register] storeRegister OK");
      setStatus("success");
      setTimeout(() => router.replace("/create-profile"), 800);
    } catch (err: any) {
      const msg = err?.message ?? "Connexion impossible. Vérifie ton réseau.";
      console.warn("[Register] erreur complète:", msg, err);
      setLastError(msg);
      setStatus("error");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.card}>
            <Text style={s.brand}>JEUTAIME</Text>
            <Text style={s.title}>Créer un compte</Text>
            <Text style={s.sub}>Rejoins l'univers et commence l'aventure.</Text>

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
                {pseudoError ? <Text style={s.err}>{pseudoError}</Text> : null}
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

              {/* Date de naissance */}
              <View style={s.field}>
                <Text style={s.label}>Date de naissance</Text>
                <View style={s.dateRow}>
                  <TextInput
                    value={dayStr}
                    onChangeText={(t) => setDayStr(t.replace(/\D/g, "").slice(0, 2))}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="JJ"
                    placeholderTextColor="#9a948d"
                    style={[s.input, s.dateCell]}
                  />
                  <Text style={s.dateSep}>/</Text>
                  <TextInput
                    value={monthStr}
                    onChangeText={(t) => setMonthStr(t.replace(/\D/g, "").slice(0, 2))}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="MM"
                    placeholderTextColor="#9a948d"
                    style={[s.input, s.dateCell]}
                  />
                  <Text style={s.dateSep}>/</Text>
                  <TextInput
                    value={yearStr}
                    onChangeText={(t) => setYearStr(t.replace(/\D/g, "").slice(0, 4))}
                    keyboardType="number-pad"
                    maxLength={4}
                    placeholder="AAAA"
                    placeholderTextColor="#9a948d"
                    style={[s.input, s.dateCellYear]}
                  />
                </View>
                {allDateFilled ? (
                  isDateValid && !ageError ? (
                    <Text style={s.dateOk}>
                      Date sélectionnée :{" "}
                      {String(parsedDay).padStart(2, "0")}/
                      {String(parsedMonth).padStart(2, "0")}/
                      {parsedYear}
                    </Text>
                  ) : (
                    <Text style={s.err}>{ageError ?? "Date invalide"}</Text>
                  )
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
                      style={[s.genderBtn, gender === opt.value && s.genderActive]}
                      onPress={() => setGender(opt.value)}
                    >
                      <Text style={[s.genderTxt, gender === opt.value && s.genderActiveTxt]}>
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
                {passwordError ? (
                  <Text style={s.err}>{passwordError}</Text>
                ) : (
                  <Text style={s.hint}>8 car. min · majuscule · chiffre</Text>
                )}
              </View>

              {/* Bouton */}
              <Pressable
                style={[s.btn, status === "submitting" && s.btnDim]}
                onPress={handleRegister}
              >
                {status === "submitting" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.btnTxt}>Créer mon compte</Text>
                )}
              </Pressable>

              {/* Feedback visible sous le bouton */}
              {status === "submitting" && (
                <Text style={s.statusInfo}>Création du compte en cours…</Text>
              )}
              {status === "success" && (
                <Text style={s.statusOk}>Compte créé ! Redirection…</Text>
              )}
              {status === "error" && lastError ? (
                <Text style={s.statusErr}>{lastError}</Text>
              ) : null}

              {/* Bloc debug */}
              <View style={s.debug}>
                <Text style={s.debugTxt}>isFormValid: {String(isFormValid)}</Text>
                <Text style={s.debugTxt}>birthDate: {birthDate ?? "–"}</Text>
                <Text style={s.debugTxt}>statut: {status}</Text>
                <Text style={s.debugTxt}>erreur: {lastError ?? "–"}</Text>
              </View>

              <Pressable
                disabled={status === "submitting"}
                onPress={() => router.replace("/login")}
              >
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
  flex:  { flex: 1 },
  safe:  { flex: 1, backgroundColor: "#f6f1ea" },
  scroll: {
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
  sub: {
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

  // Date fields
  dateRow:      { flexDirection: "row", alignItems: "center", gap: 8 },
  dateCell:     { flex: 1, textAlign: "center", paddingHorizontal: 4 },
  dateCellYear: { flex: 2, textAlign: "center", paddingHorizontal: 4 },
  dateSep:      { fontSize: 20, color: "#9a948d", fontWeight: "600" },
  dateOk:       { fontSize: 13, color: "#4a9c6d", fontWeight: "600" },

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
  genderActive:    { backgroundColor: "#9c2f45", borderColor: "#9c2f45" },
  genderTxt:       { fontSize: 15, fontWeight: "600", color: "#2a272c" },
  genderActiveTxt: { color: "#fff" },

  btn: {
    marginTop: 8,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#9c2f45",
    justifyContent: "center",
    alignItems: "center",
  },
  btnDim:  { opacity: 0.5 },
  btnTxt:  { color: "#fff", fontSize: 18, fontWeight: "700" },

  // Feedback sous le bouton
  statusInfo: { textAlign: "center", fontSize: 14, color: "#7a746d", marginTop: 6 },
  statusOk:   { textAlign: "center", fontSize: 14, color: "#4a9c6d", fontWeight: "700", marginTop: 6 },
  statusErr:  { textAlign: "center", fontSize: 14, color: "#c0392b", fontWeight: "600", marginTop: 6 },

  // Debug bloc
  debug: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#f0ebe4",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d9cec3",
    gap: 2,
  },
  debugTxt: { fontSize: 11, color: "#7a746d", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },

  err:  { fontSize: 13, color: "#c0392b" },
  hint: { fontSize: 12, color: "#9a948d" },
  link: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    color: "#9c3d4f",
  },
});
