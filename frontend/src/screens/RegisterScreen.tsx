import { useState, useRef, useCallback, useEffect } from "react";
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

// ─── Date picker constants ────────────────────────────────────────────────────

const ITEM_H = 50;          // height of each picker row
const VISIBLE = 5;          // visible rows per column (must be odd)
const PAD = 2;              // (VISIBLE - 1) / 2  — invisible padding rows top & bottom

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const MAX_BIRTH_YEAR = new Date().getFullYear() - 18;  // youngest allowed (18 y/o)
const MIN_BIRTH_YEAR = 1930;

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();  // day 0 of month+1 = last day of month
}

// ─── PickerColumn ─────────────────────────────────────────────────────────────

interface ColProps {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  flex?: number;
}

function PickerColumn({ items, selectedIndex, onChange, flex = 1 }: ColProps) {
  const scrollRef = useRef<ScrollView>(null);
  const inited = useRef(false);

  // Stable refs so the onSnap callback never captures stale values
  const itemsLenRef = useRef(items.length);
  const onChangeRef = useRef(onChange);
  itemsLenRef.current = items.length;
  onChangeRef.current = onChange;

  // Initial scroll — needs a small delay so the layout is complete
  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
      inited.current = true;
    }, 80);
    return () => clearTimeout(t);
  }, []); // mount only

  // External selectedIndex change (e.g., day clamped when month changes)
  useEffect(() => {
    if (inited.current) {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: true });
    }
  }, [selectedIndex]);

  const onSnap = useCallback((e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_H);
    const clamped = Math.max(0, Math.min(idx, itemsLenRef.current - 1));
    onChangeRef.current(clamped);
    // snapToInterval handles the visual snap — no manual scrollTo needed
  }, []);

  // Padding rows so first/last item can reach the center position
  const empty = Array(PAD).fill('');
  const all = [...empty, ...items, ...empty];

  return (
    <View style={{ flex, height: ITEM_H * VISIBLE, overflow: 'hidden' }}>
      {/* Fixed selection highlight band at the center */}
      <View
        pointerEvents="none"
        style={pickerStyles.highlight}
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={onSnap}
        onScrollEndDrag={onSnap}
        scrollEventThrottle={32}
      >
        {all.map((item, i) => {
          const realIdx = i - PAD;
          const isSelected = realIdx === selectedIndex;
          return (
            <View key={i} style={pickerStyles.row}>
              <Text style={[
                pickerStyles.itemText,
                isSelected && pickerStyles.itemTextSelected,
                item === '' && pickerStyles.itemTextHidden,
              ]}>
                {item || ' '}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  highlight: {
    position: 'absolute',
    top: ITEM_H * PAD,
    left: 6,
    right: 6,
    height: ITEM_H,
    backgroundColor: 'rgba(156, 47, 69, 0.08)',
    borderRadius: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(156, 47, 69, 0.35)',
    zIndex: 2,
  },
  row: {
    height: ITEM_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 15,
    color: '#9a948d',
    fontWeight: '400',
  },
  itemTextSelected: {
    fontSize: 17,
    color: '#9c2f45',
    fontWeight: '700',
  },
  itemTextHidden: {
    color: 'transparent',
  },
});

// ─── DateScrollPicker ─────────────────────────────────────────────────────────

interface DatePickerProps {
  day: number;
  month: number;
  year: number;
  onDayChange: (d: number) => void;
  onMonthChange: (m: number) => void;
  onYearChange: (y: number) => void;
}

function DateScrollPicker({ day, month, year, onDayChange, onMonthChange, onYearChange }: DatePickerProps) {
  const maxDay = daysInMonth(month, year);
  const dayItems = Array.from({ length: maxDay }, (_, i) =>
    String(i + 1).padStart(2, '0')
  );
  const yearItems = Array.from(
    { length: MAX_BIRTH_YEAR - MIN_BIRTH_YEAR + 1 },
    (_, i) => String(MAX_BIRTH_YEAR - i)
  );

  return (
    <View style={datePickerStyles.container}>
      {/* Jour */}
      <PickerColumn
        items={dayItems}
        selectedIndex={Math.min(day - 1, maxDay - 1)}
        onChange={(i) => onDayChange(i + 1)}
        flex={1}
      />
      <View style={datePickerStyles.divider} />
      {/* Mois */}
      <PickerColumn
        items={MONTHS_FR}
        selectedIndex={month - 1}
        onChange={(i) => onMonthChange(i + 1)}
        flex={2}
      />
      <View style={datePickerStyles.divider} />
      {/* Année */}
      <PickerColumn
        items={yearItems}
        selectedIndex={Math.max(0, MAX_BIRTH_YEAR - year)}
        onChange={(i) => onYearChange(MAX_BIRTH_YEAR - i)}
        flex={1.4}
      />
    </View>
  );
}

const datePickerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#d9cec3',
    borderRadius: 14,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#d9cec3',
    alignSelf: 'stretch',
  },
});

// ─── RegisterScreen ───────────────────────────────────────────────────────────

const GENDER_OPTIONS = [
  { label: "Homme", value: "HOMME" },
  { label: "Femme", value: "FEMME" },
  { label: "Autre", value: "AUTRE" },
];

export default function RegisterScreen() {
  const router = useRouter();
  const { register: storeRegister } = useStore();

  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [day, setDay] = useState(1);
  const [month, setMonth] = useState(1);
  const [year, setYear] = useState(2000);
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("HOMME");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const VALID_GENDERS = ["HOMME", "FEMME", "AUTRE"];

  // Computed birthDate always in YYYY-MM-DD format — always valid (day auto-clamped)
  const birthDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // Auto-clamp day when month/year changes (e.g. March 31 → February 28)
  const handleMonthChange = (m: number) => {
    setMonth(m);
    const max = daysInMonth(m, year);
    if (day > max) setDay(max);
  };

  const handleYearChange = (y: number) => {
    setYear(y);
    const max = daysInMonth(month, y);
    if (day > max) setDay(max);
  };

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

  const birthDateError = (() => {
    const age = (Date.now() - new Date(`${birthDate}T00:00:00.000Z`).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return age < 18 ? "Tu dois avoir au moins 18 ans" : null;
  })();

  const isFormValid =
    pseudo.trim().length >= 3 &&
    pseudoError === null &&
    email.trim().length > 0 &&
    birthDateError === null &&
    city.trim().length > 0 &&
    VALID_GENDERS.includes(gender) &&
    password.length >= 8 &&
    passwordError === null;

  const handleRegister = async () => {
    if (!isFormValid || isLoading) return;

    try {
      setIsLoading(true);

      await storeRegister({
        pseudo: pseudo.trim(),
        email: email.trim().toLowerCase(),
        birthDate: new Date(`${birthDate}T00:00:00.000Z`).toISOString(),
        city: city.trim(),
        gender: gender as "HOMME" | "FEMME" | "AUTRE",
        password,
      });

      router.replace("/create-profile");
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
                {pseudoError ? <Text style={styles.fieldError}>{pseudoError}</Text> : null}
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
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerColLabel}>Jour</Text>
                  <Text style={[styles.pickerColLabel, { flex: 2 }]}>Mois</Text>
                  <Text style={[styles.pickerColLabel, { flex: 1.4 }]}>Année</Text>
                </View>
                <DateScrollPicker
                  day={day}
                  month={month}
                  year={year}
                  onDayChange={setDay}
                  onMonthChange={handleMonthChange}
                  onYearChange={handleYearChange}
                />
                {birthDateError ? <Text style={styles.fieldError}>{birthDateError}</Text> : null}
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
                {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}
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
  pickerHeader: {
    flexDirection: 'row',
    paddingHorizontal: 2,
  },
  pickerColLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#9a948d',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
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
  fieldError: {
    fontSize: 13,
    color: "#c0392b",
    marginTop: 2,
  },
});
