import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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

// ─── Constantes date ──────────────────────────────────────────────────────────

const MONTHS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];
const MAX_YEAR = new Date().getFullYear() - 18;
const MIN_YEAR = 1930;
const ROW_H    = 52;

function daysInMonth(m: number, y: number) {
  return new Date(y, m, 0).getDate();
}

// ─── PickerModal ──────────────────────────────────────────────────────────────

interface PickerModalProps {
  visible:       boolean;
  title:         string;
  items:         string[];
  selectedIndex: number;
  onSelect:      (index: number) => void;
  onClose:       () => void;
}

function PickerModal({ visible, title, items, selectedIndex, onSelect, onClose }: PickerModalProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) return;
    // Scroll pour centrer l'élément sélectionné
    const t = setTimeout(() => {
      const y = Math.max(0, (selectedIndex - 3) * ROW_H);
      scrollRef.current?.scrollTo({ y, animated: false });
    }, 80);
    return () => clearTimeout(t);
  }, [visible, selectedIndex]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={pm.overlay}>
        {/* backdrop — tap pour fermer */}
        <Pressable style={pm.backdrop} onPress={onClose} />

        {/* feuille centrée */}
        <View style={pm.sheet}>
          <View style={pm.header}>
            <Text style={pm.title}>{title}</Text>
            <Pressable onPress={onClose} style={pm.closeBtn}>
              <Text style={pm.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            style={pm.list}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item, i) => {
              const selected = i === selectedIndex;
              return (
                <Pressable
                  key={i}
                  style={[pm.row, selected && pm.rowSelected]}
                  onPress={() => onSelect(i)}
                >
                  <Text style={[pm.rowText, selected && pm.rowTextSelected]}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const pm = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  backdrop: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
  },
  sheet: {
    width: "85%",
    maxWidth: 360,
    maxHeight: 400,
    backgroundColor: "#fffaf5",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e7ddd2",
  },
  title:     { fontSize: 17, fontWeight: "700", color: "#232126" },
  closeBtn:  { padding: 4 },
  closeText: { fontSize: 18, color: "#9a948d", fontWeight: "600" },
  list:      { maxHeight: 320 },
  row: {
    height: ROW_H,
    paddingHorizontal: 20,
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0e8df",
  },
  rowSelected:     { backgroundColor: "rgba(156,47,69,0.08)" },
  rowText:         { fontSize: 16, color: "#4a4247" },
  rowTextSelected: { fontSize: 17, fontWeight: "700", color: "#9c2f45" },
});

// ─── Genre ────────────────────────────────────────────────────────────────────

const GENDER_OPTIONS = [
  { label: "Homme", value: "HOMME" },
  { label: "Femme", value: "FEMME" },
  { label: "Autre", value: "AUTRE" },
];

type Status = "idle" | "submitting" | "success" | "error";
type PickerType = "day" | "month" | "year" | null;

// ─── RegisterScreen ───────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const router = useRouter();
  const { register: storeRegister } = useStore();

  const [pseudo,   setPseudo]   = useState("");
  const [email,    setEmail]    = useState("");
  const [city,     setCity]     = useState("");
  const [gender,   setGender]   = useState("HOMME");
  const [password, setPassword] = useState("");

  // Date — valeurs numériques, initialisées sur une date valide
  const [day,   setDay]   = useState(1);
  const [month, setMonth] = useState(1);
  const [year,  setYear]  = useState(2000);

  const [pickerOpen, setPickerOpen] = useState<PickerType>(null);
  const [status,     setStatus]     = useState<Status>("idle");
  const [lastError,  setLastError]  = useState<string | null>(null);

  // ─── Listes picker ──────────────────────────────────────────────────────────
  const maxDay  = daysInMonth(month, year);
  const days    = Array.from({ length: maxDay  }, (_, i) => String(i + 1).padStart(2, "0"));
  const months  = MONTHS_FR;
  const years   = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => String(MAX_YEAR - i));

  // ─── Handlers avec auto-clamp ───────────────────────────────────────────────
  const handleDay = (i: number) => {
    setDay(i + 1);
    setPickerOpen(null);
  };
  const handleMonth = (i: number) => {
    const newMonth = i + 1;
    setMonth(newMonth);
    const max = daysInMonth(newMonth, year);
    if (day > max) setDay(max);
    setPickerOpen(null);
  };
  const handleYear = (i: number) => {
    const newYear = MAX_YEAR - i;
    setYear(newYear);
    const max = daysInMonth(month, newYear);
    if (day > max) setDay(max);
    setPickerOpen(null);
  };

  // ─── Date calculée ──────────────────────────────────────────────────────────
  const mm        = String(month).padStart(2, "0");
  const dd        = String(day).padStart(2, "0");
  const birthDate = `${year}-${mm}-${dd}`;

  const ageError = (() => {
    const age =
      (Date.now() - new Date(`${birthDate}T00:00:00.000Z`).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000);
    return age < 18 ? "Tu dois avoir au moins 18 ans" : null;
  })();

  // ─── Validation champs ──────────────────────────────────────────────────────
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
    !ageError &&
    city.trim().length > 0 &&
    password.length >= 8 &&
    !passwordError;

  // ─── Submit ─────────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    console.warn("[Register] handleRegister appelé");
    if (status === "submitting") return;

    console.warn("[Register] isFormValid=", isFormValid, {
      pseudo: pseudo.trim(), email: email.trim(), birthDate,
      city: city.trim(), passwordLen: password.length,
      pseudoError, passwordError, ageError,
    });

    if (!isFormValid) {
      const errs: string[] = [];
      if (!pseudo.trim() || pseudoError) errs.push(`Pseudo : ${pseudoError ?? "requis"}`);
      if (!email.trim())                 errs.push("Email : requis");
      if (ageError)                      errs.push(`Date : ${ageError}`);
      if (!city.trim())                  errs.push("Ville : requise");
      if (!password || passwordError)    errs.push(`Mot de passe : ${passwordError ?? "requis"}`);
      setLastError(errs.join("  •  "));
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
      console.warn("[Register] OK");
      setStatus("success");
      setTimeout(() => router.replace("/create-profile"), 800);
    } catch (err: any) {
      const msg = err?.message ?? "Connexion impossible. Vérifie ton réseau.";
      console.warn("[Register] erreur:", msg, err);
      setLastError(msg);
      setStatus("error");
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
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
                  value={pseudo} onChangeText={setPseudo}
                  placeholder="Ton pseudo" placeholderTextColor="#9a948d"
                  autoCapitalize="none" style={s.input}
                />
                {pseudoError ? <Text style={s.err}>{pseudoError}</Text> : null}
              </View>

              {/* Email */}
              <View style={s.field}>
                <Text style={s.label}>Email</Text>
                <TextInput
                  value={email} onChangeText={setEmail}
                  autoCapitalize="none" keyboardType="email-address"
                  placeholder="ton@email.com" placeholderTextColor="#9a948d"
                  style={s.input}
                />
              </View>

              {/* Date de naissance — 3 boutons */}
              <View style={s.field}>
                <Text style={s.label}>Date de naissance</Text>
                <View style={s.dateRow}>

                  {/* Jour */}
                  <Pressable style={s.dateBtn} onPress={() => setPickerOpen("day")}>
                    <Text style={s.dateBtnLabel}>Jour</Text>
                    <Text style={s.dateBtnValue}>{dd}</Text>
                  </Pressable>

                  {/* Mois */}
                  <Pressable style={[s.dateBtn, { flex: 2 }]} onPress={() => setPickerOpen("month")}>
                    <Text style={s.dateBtnLabel}>Mois</Text>
                    <Text style={s.dateBtnValue}>{MONTHS_FR[month - 1]}</Text>
                  </Pressable>

                  {/* Année */}
                  <Pressable style={s.dateBtn} onPress={() => setPickerOpen("year")}>
                    <Text style={s.dateBtnLabel}>Année</Text>
                    <Text style={s.dateBtnValue}>{year}</Text>
                  </Pressable>

                </View>

                {ageError ? (
                  <Text style={s.err}>{ageError}</Text>
                ) : (
                  <Text style={s.dateOk}>
                    Date sélectionnée : {dd}/{mm}/{year}
                  </Text>
                )}
              </View>

              {/* Ville */}
              <View style={s.field}>
                <Text style={s.label}>Ville</Text>
                <TextInput
                  value={city} onChangeText={setCity}
                  placeholder="Ta ville" placeholderTextColor="#9a948d"
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
                  value={password} onChangeText={setPassword}
                  secureTextEntry placeholder="••••••••" placeholderTextColor="#9a948d"
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

              {/* Feedback statut */}
              {status === "submitting" && (
                <Text style={s.statusInfo}>Création du compte en cours…</Text>
              )}
              {status === "success" && (
                <Text style={s.statusOk}>Compte créé ! Redirection…</Text>
              )}
              {status === "error" && lastError ? (
                <Text style={s.statusErr}>{lastError}</Text>
              ) : null}

              {/* Debug */}
              <View style={s.debug}>
                <Text style={s.debugTxt}>isFormValid: {String(isFormValid)}</Text>
                <Text style={s.debugTxt}>birthDate: {birthDate}</Text>
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

      {/* Modals picker */}
      <PickerModal
        visible={pickerOpen === "day"}
        title="Jour"
        items={days}
        selectedIndex={day - 1}
        onSelect={handleDay}
        onClose={() => setPickerOpen(null)}
      />
      <PickerModal
        visible={pickerOpen === "month"}
        title="Mois"
        items={months}
        selectedIndex={month - 1}
        onSelect={handleMonth}
        onClose={() => setPickerOpen(null)}
      />
      <PickerModal
        visible={pickerOpen === "year"}
        title="Année"
        items={years}
        selectedIndex={MAX_YEAR - year}
        onSelect={handleYear}
        onClose={() => setPickerOpen(null)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    textAlign: "center", fontSize: 14, fontWeight: "700",
    letterSpacing: 4, color: "#9c3d4f", marginBottom: 14,
  },
  title: {
    textAlign: "center", fontSize: 34, fontWeight: "800",
    color: "#232126", marginBottom: 8,
  },
  sub: {
    textAlign: "center", fontSize: 17, lineHeight: 24,
    color: "#7a746d", marginBottom: 28,
  },
  form:  { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 16, fontWeight: "600", color: "#2a272c" },
  input: {
    height: 54,
    borderWidth: 1, borderColor: "#d9cec3",
    borderRadius: 14, backgroundColor: "#fff",
    paddingHorizontal: 16, fontSize: 16, color: "#1f1d21",
  },

  // Date
  dateRow:       { flexDirection: "row", gap: 8 },
  dateBtn: {
    flex: 1,
    borderWidth: 1, borderColor: "#d9cec3",
    borderRadius: 14, backgroundColor: "#fff",
    paddingVertical: 10, paddingHorizontal: 8,
    alignItems: "center",
  },
  dateBtnLabel:  { fontSize: 11, fontWeight: "600", color: "#9a948d", textTransform: "uppercase", letterSpacing: 0.5 },
  dateBtnValue:  { fontSize: 16, fontWeight: "700", color: "#232126", marginTop: 2 },
  dateOk:        { fontSize: 13, color: "#4a9c6d", fontWeight: "600" },

  // Genre
  genderRow: { flexDirection: "row", gap: 10 },
  genderBtn: {
    flex: 1, height: 46, borderRadius: 12,
    borderWidth: 1, borderColor: "#d9cec3",
    backgroundColor: "#fff", justifyContent: "center", alignItems: "center",
  },
  genderActive:    { backgroundColor: "#9c2f45", borderColor: "#9c2f45" },
  genderTxt:       { fontSize: 15, fontWeight: "600", color: "#2a272c" },
  genderActiveTxt: { color: "#fff" },

  // Bouton
  btn: {
    marginTop: 8, height: 56, borderRadius: 16,
    backgroundColor: "#9c2f45", justifyContent: "center", alignItems: "center",
  },
  btnDim:  { opacity: 0.5 },
  btnTxt:  { color: "#fff", fontSize: 18, fontWeight: "700" },

  // Statut
  statusInfo: { textAlign: "center", fontSize: 14, color: "#7a746d", marginTop: 6 },
  statusOk:   { textAlign: "center", fontSize: 14, color: "#4a9c6d", fontWeight: "700", marginTop: 6 },
  statusErr:  { textAlign: "center", fontSize: 14, color: "#c0392b", fontWeight: "600", marginTop: 6 },

  // Debug
  debug: {
    marginTop: 8, padding: 10,
    backgroundColor: "#f0ebe4", borderRadius: 10,
    borderWidth: 1, borderColor: "#d9cec3", gap: 2,
  },
  debugTxt: {
    fontSize: 11, color: "#7a746d",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  err:  { fontSize: 13, color: "#c0392b" },
  hint: { fontSize: 12, color: "#9a948d" },
  link: {
    marginTop: 10, textAlign: "center",
    fontSize: 15, fontWeight: "600", color: "#9c3d4f",
  },
});
