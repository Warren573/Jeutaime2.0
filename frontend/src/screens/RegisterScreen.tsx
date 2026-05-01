import { useEffect, useRef, useState } from "react";
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

// ─── Scroll picker ─────────────────────────────────────────────────────────────

const ROW_H  = 40;   // height of each item row
const SHOW   = 3;    // visible rows  (must be odd — middle = selected)
const PAD    = 1;    // padding rows top & bottom = (SHOW-1)/2

const MONTHS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];
const MAX_YEAR = new Date().getFullYear() - 18;
const MIN_YEAR = 1930;

function daysInMonth(m: number, y: number) {
  return new Date(y, m, 0).getDate();
}

interface ColProps {
  items: string[];
  selected: number;          // 0-based index of selected item
  onChange: (i: number) => void;
}

function PickerCol({ items, selected, onChange }: ColProps) {
  const ref = useRef<ScrollView>(null);
  const selectedRef = useRef(selected);
  const itemsLen = useRef(items.length);
  selectedRef.current = selected;
  itemsLen.current = items.length;

  // Initial scroll to selected item
  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.scrollTo({ y: selected * ROW_H, animated: false });
    }, 60);
    return () => clearTimeout(t);
  }, []); // mount only

  // External change (e.g. day clamped)
  useEffect(() => {
    ref.current?.scrollTo({ y: selected * ROW_H, animated: true });
  }, [selected]);

  // Snap on scroll end
  const onEnd = (e: any) => {
    const y   = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(Math.round(y / ROW_H), itemsLen.current - 1));
    onChange(idx);
    ref.current?.scrollTo({ y: idx * ROW_H, animated: false });
  };

  const empty = Array(PAD).fill("");
  const all   = [...empty, ...items, ...empty];

  return (
    <View style={col.wrap}>
      {/* fixed selection band at center */}
      <View pointerEvents="none" style={col.band} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW_H}
        decelerationRate="fast"
        onMomentumScrollEnd={onEnd}
        onScrollEndDrag={onEnd}
        scrollEventThrottle={16}
      >
        {all.map((item, i) => {
          const realIdx = i - PAD;
          const isSel   = realIdx === selected;
          return (
            <Pressable
              key={i}
              style={col.row}
              onPress={() => item !== "" && onChange(realIdx)}
            >
              <Text style={[col.text, isSel && col.textSel, item === "" && col.textHide]}>
                {item || " "}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const col = StyleSheet.create({
  wrap: {
    flex: 1,
    height: ROW_H * SHOW,
    overflow: "hidden",
  },
  band: {
    position:  "absolute",
    top:       ROW_H * PAD,
    left:      4,
    right:     4,
    height:    ROW_H,
    backgroundColor: "rgba(156,47,69,0.08)",
    borderTopWidth:  StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(156,47,69,0.35)",
    borderRadius: 6,
    zIndex: 2,
  },
  row:      { height: ROW_H, justifyContent: "center", alignItems: "center" },
  text:     { fontSize: 15, color: "#9a948d" },
  textSel:  { fontSize: 17, fontWeight: "700", color: "#9c2f45" },
  textHide: { color: "transparent" },
});

// ─── Date picker (3 columns) ───────────────────────────────────────────────────

interface DatePickerProps {
  day: number; month: number; year: number;
  onDay: (d: number) => void;
  onMonth: (m: number) => void;
  onYear: (y: number) => void;
}

function DatePicker({ day, month, year, onDay, onMonth, onYear }: DatePickerProps) {
  const maxDay  = daysInMonth(month, year);
  const days    = Array.from({ length: maxDay },  (_, i) => String(i + 1).padStart(2, "0"));
  const years   = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => String(MAX_YEAR - i));

  return (
    <View style={dp.container}>
      {/* Jour */}
      <PickerCol
        items={days}
        selected={Math.min(day - 1, maxDay - 1)}
        onChange={(i) => onDay(i + 1)}
      />
      <View style={dp.divider} />
      {/* Mois */}
      <View style={{ flex: 2 }}>
        <PickerCol
          items={MONTHS_FR}
          selected={month - 1}
          onChange={(i) => onMonth(i + 1)}
        />
      </View>
      <View style={dp.divider} />
      {/* Année */}
      <View style={{ flex: 1.4 }}>
        <PickerCol
          items={years}
          selected={Math.max(0, MAX_YEAR - year)}
          onChange={(i) => onYear(MAX_YEAR - i)}
        />
      </View>
    </View>
  );
}

const dp = StyleSheet.create({
  container: {
    flexDirection:  "row",
    height:         ROW_H * SHOW,
    borderWidth:    1,
    borderColor:    "#d9cec3",
    borderRadius:   14,
    backgroundColor: "#fff",
    overflow:       "hidden",
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: "#d9cec3",
    alignSelf: "stretch",
  },
});

// ─── RegisterScreen ────────────────────────────────────────────────────────────

const GENDER_OPTIONS = [
  { label: "Homme", value: "HOMME" },
  { label: "Femme", value: "FEMME" },
  { label: "Autre", value: "AUTRE" },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { register: storeRegister } = useStore();

  const [pseudo,   setPseudo]   = useState("");
  const [email,    setEmail]    = useState("");
  const [city,     setCity]     = useState("");
  const [gender,   setGender]   = useState("HOMME");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Date state — default 01/01/2000
  const [day,   setDay]   = useState(1);
  const [month, setMonth] = useState(1);
  const [year,  setYear]  = useState(2000);

  // Auto-clamp day when month/year change
  const handleMonth = (m: number) => {
    setMonth(m);
    const max = daysInMonth(m, year);
    if (day > max) setDay(max);
  };
  const handleYear = (y: number) => {
    setYear(y);
    const max = daysInMonth(month, y);
    if (day > max) setDay(max);
  };

  // Computed birthDate always valid
  const birthDate = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

  // Validation
  const pseudoError = pseudo.length > 0
    ? pseudo.trim().length < 3 ? "3 caractères minimum"
    : !/^[a-zA-Z0-9_\-\.]+$/.test(pseudo.trim()) ? "Lettres, chiffres, _ - . uniquement"
    : null : null;

  const passwordError = password.length > 0
    ? password.length < 8 ? "8 caractères minimum"
    : !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password) ? "Doit contenir une majuscule, une minuscule et un chiffre"
    : null : null;

  const ageError = (() => {
    const age = (Date.now() - new Date(`${birthDate}T00:00:00.000Z`).getTime())
                / (1000 * 60 * 60 * 24 * 365.25);
    return age < 18 ? "Tu dois avoir au moins 18 ans" : null;
  })();

  const isFormValid =
    pseudo.trim().length >= 3 && !pseudoError &&
    email.trim().length > 0 &&
    !ageError &&
    city.trim().length > 0 &&
    password.length >= 8 && !passwordError;

  const handleRegister = async () => {
    console.warn("[Register] handleRegister appelé");

    if (isLoading) {
      console.warn("[Register] isLoading=true, ignoré");
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
    });

    if (!isFormValid) {
      const errs: string[] = [];
      if (!pseudo.trim() || pseudoError) errs.push(`• Pseudo : ${pseudoError ?? "requis"}`);
      if (!email.trim())                 errs.push("• Email : requis");
      if (ageError)                      errs.push(`• Date de naissance : ${ageError}`);
      if (!city.trim())                  errs.push("• Ville : requise");
      if (!password || passwordError)    errs.push(`• Mot de passe : ${passwordError ?? "requis"}`);
      Alert.alert("Formulaire incomplet", errs.join("\n"));
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

    try {
      setIsLoading(true);
      console.warn("[Register] appel storeRegister...");
      await storeRegister(payload);
      console.warn("[Register] storeRegister OK");
      Alert.alert(
        "Compte créé !",
        "Bienvenue sur JeuTaime.\nComplète maintenant ton profil pour commencer.",
        [{ text: "Continuer", onPress: () => router.replace("/create-profile") }]
      );
    } catch (err: any) {
      const msg = err?.message ?? "Connexion impossible. Vérifie ton réseau.";
      console.warn("[Register] erreur complète:", msg, err);
      Alert.alert("Erreur inscription", msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.card}>
            <Text style={s.brand}>JEUTAIME</Text>
            <Text style={s.title}>Créer un compte</Text>
            <Text style={s.sub}>Rejoins l'univers et commence l'aventure.</Text>

            <View style={s.form}>

              <View style={s.field}>
                <Text style={s.label}>Pseudo</Text>
                <TextInput value={pseudo} onChangeText={setPseudo}
                  placeholder="Ton pseudo" placeholderTextColor="#9a948d"
                  autoCapitalize="none" style={s.input} />
                {pseudoError ? <Text style={s.err}>{pseudoError}</Text> : null}
              </View>

              <View style={s.field}>
                <Text style={s.label}>Email</Text>
                <TextInput value={email} onChangeText={setEmail}
                  autoCapitalize="none" keyboardType="email-address"
                  placeholder="ton@email.com" placeholderTextColor="#9a948d"
                  style={s.input} />
              </View>

              <View style={s.field}>
                {/* Column headers */}
                <View style={s.dateHeader}>
                  <Text style={[s.dateColLabel, { flex: 1 }]}>Jour</Text>
                  <Text style={[s.dateColLabel, { flex: 2 }]}>Mois</Text>
                  <Text style={[s.dateColLabel, { flex: 1.4 }]}>Année</Text>
                </View>
                <DatePicker
                  day={day} month={month} year={year}
                  onDay={setDay} onMonth={handleMonth} onYear={handleYear}
                />
                {ageError ? <Text style={s.err}>{ageError}</Text> : null}
              </View>

              <View style={s.field}>
                <Text style={s.label}>Ville</Text>
                <TextInput value={city} onChangeText={setCity}
                  placeholder="Ta ville" placeholderTextColor="#9a948d"
                  style={s.input} />
              </View>

              <View style={s.field}>
                <Text style={s.label}>Genre</Text>
                <View style={s.genderRow}>
                  {GENDER_OPTIONS.map((opt) => (
                    <Pressable key={opt.value}
                      style={[s.genderBtn, gender === opt.value && s.genderActive]}
                      onPress={() => setGender(opt.value)}>
                      <Text style={[s.genderTxt, gender === opt.value && s.genderActiveTxt]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={s.field}>
                <Text style={s.label}>Mot de passe</Text>
                <TextInput value={password} onChangeText={setPassword}
                  secureTextEntry placeholder="••••••••" placeholderTextColor="#9a948d"
                  style={s.input} />
                {passwordError
                  ? <Text style={s.err}>{passwordError}</Text>
                  : <Text style={s.hint}>8 car. min. · une majuscule · un chiffre</Text>}
              </View>

              <Pressable
                style={[s.btn, (!isFormValid || isLoading) && s.btnDim]}
                onPress={handleRegister}>
                {isLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnTxt}>Créer mon compte</Text>}
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
  flex:  { flex: 1 },
  safe:  { flex: 1, backgroundColor: "#f6f1ea" },
  scroll: {
    flexGrow: 1, justifyContent: "center", alignItems: "center",
    paddingHorizontal: 24, paddingVertical: 32,
  },
  card: {
    width: "100%", maxWidth: 420,
    backgroundColor: "#fffaf5",
    borderRadius: 24,
    paddingHorizontal: 24, paddingVertical: 28,
    borderWidth: 1, borderColor: "#e7ddd2",
    shadowColor: "#000", shadowOpacity: 0.06,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
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
    height: 54, borderWidth: 1, borderColor: "#d9cec3",
    borderRadius: 14, backgroundColor: "#fff",
    paddingHorizontal: 16, fontSize: 16, color: "#1f1d21",
  },

  // Date column headers
  dateHeader: { flexDirection: "row", paddingHorizontal: 6, marginBottom: 3 },
  dateColLabel: {
    textAlign: "center", fontSize: 11, fontWeight: "600",
    color: "#9a948d", textTransform: "uppercase", letterSpacing: 0.5,
  },

  genderRow: { flexDirection: "row", gap: 10 },
  genderBtn: {
    flex: 1, height: 46, borderRadius: 12,
    borderWidth: 1, borderColor: "#d9cec3",
    backgroundColor: "#fff", justifyContent: "center", alignItems: "center",
  },
  genderActive:    { backgroundColor: "#9c2f45", borderColor: "#9c2f45" },
  genderTxt:       { fontSize: 15, fontWeight: "600", color: "#2a272c" },
  genderActiveTxt: { color: "#fff" },

  btn: {
    marginTop: 8, height: 56, borderRadius: 16,
    backgroundColor: "#9c2f45", justifyContent: "center", alignItems: "center",
  },
  btnDim:  { opacity: 0.5 },
  btnTxt:  { color: "#fff", fontSize: 18, fontWeight: "700" },
  link: {
    marginTop: 10, textAlign: "center",
    fontSize: 15, fontWeight: "600", color: "#9c3d4f",
  },
  err:  { fontSize: 13, color: "#c0392b" },
  hint: { fontSize: 12, color: "#9a948d" },
});
