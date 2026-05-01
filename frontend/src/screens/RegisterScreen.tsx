import { useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
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

// ─── Date constants ────────────────────────────────────────────────────────────

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const MAX_BIRTH_YEAR = new Date().getFullYear() - 18;
const MIN_BIRTH_YEAR = 1930;

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

// ─── PickerBottomSheet ────────────────────────────────────────────────────────

interface SheetProps {
  visible: boolean;
  title: string;
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

const SHEET_ITEM_H = 52;

function PickerBottomSheet({ visible, title, items, selectedIndex, onSelect, onClose }: SheetProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      // Scroll so selected item is roughly centered (2 items above)
      const y = Math.max(0, (selectedIndex - 2) * SHEET_ITEM_H);
      scrollRef.current?.scrollTo({ y, animated: false });
    }, 80);
    return () => clearTimeout(t);
  }, [visible, selectedIndex]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ss.modalWrap}>
        {/* Tap outside to close */}
        <Pressable style={ss.overlay} onPress={onClose} />

        {/* Bottom sheet */}
        <Pressable style={ss.sheet} onPress={() => {}}>
          <View style={ss.handle} />
          <Text style={ss.sheetTitle}>{title}</Text>
          <ScrollView
            ref={scrollRef}
            style={{ maxHeight: 300 }}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item, i) => {
              const isSelected = i === selectedIndex;
              return (
                <Pressable
                  key={i}
                  style={[ss.item, isSelected && ss.itemSelected]}
                  onPress={() => { onSelect(i); onClose(); }}
                >
                  <Text style={[ss.itemText, isSelected && ss.itemTextSelected]}>
                    {item}
                  </Text>
                  {isSelected && <Text style={ss.check}>✓</Text>}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </View>
    </Modal>
  );
}

const ss = StyleSheet.create({
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#fffaf5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingBottom: 36,
  },
  handle: {
    alignSelf: 'center',
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: '#d9cec3',
    marginBottom: 12,
  },
  sheetTitle: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#232126',
    paddingBottom: 10,
    marginHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#e7ddd2',
    marginBottom: 4,
  },
  item: {
    height: SHEET_ITEM_H,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemSelected: { backgroundColor: 'rgba(156,47,69,0.07)' },
  itemText: { fontSize: 16, color: '#2a272c' },
  itemTextSelected: { fontWeight: '700', color: '#9c2f45' },
  check: { fontSize: 15, color: '#9c2f45' },
});

// ─── RegisterScreen ───────────────────────────────────────────────────────────

const GENDER_OPTIONS = [
  { label: 'Homme', value: 'HOMME' },
  { label: 'Femme', value: 'FEMME' },
  { label: 'Autre', value: 'AUTRE' },
];

type PickerField = 'day' | 'month' | 'year';

export default function RegisterScreen() {
  const router = useRouter();
  const { register: storeRegister } = useStore();

  // Text fields
  const [pseudo, setPseudo]   = useState('');
  const [email, setEmail]     = useState('');
  const [city, setCity]       = useState('');
  const [gender, setGender]   = useState('HOMME');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Date fields
  const [day, setDay]     = useState(1);
  const [month, setMonth] = useState(1);
  const [year, setYear]   = useState(2000);

  // Date picker modal
  const [activePicker, setActivePicker] = useState<PickerField | null>(null);

  const VALID_GENDERS = ['HOMME', 'FEMME', 'AUTRE'];

  // Computed birthDate — always valid (day auto-clamped)
  const birthDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // Picker items
  const maxDay   = daysInMonth(month, year);
  const dayItems = Array.from({ length: maxDay }, (_, i) => String(i + 1).padStart(2, '0'));
  const yearItems = Array.from(
    { length: MAX_BIRTH_YEAR - MIN_BIRTH_YEAR + 1 },
    (_, i) => String(MAX_BIRTH_YEAR - i)
  );

  // Auto-clamp day when month/year changes
  const handleMonthSelect = (i: number) => {
    const m = i + 1;
    setMonth(m);
    const max = daysInMonth(m, year);
    if (day > max) setDay(max);
  };

  const handleYearSelect = (i: number) => {
    const y = MAX_BIRTH_YEAR - i;
    setYear(y);
    const max = daysInMonth(month, y);
    if (day > max) setDay(max);
  };

  const pickerConfig: Record<PickerField, { title: string; items: string[]; selectedIndex: number; onSelect: (i: number) => void }> = {
    day:   { title: 'Jour de naissance',   items: dayItems,  selectedIndex: day - 1,                        onSelect: (i) => setDay(i + 1) },
    month: { title: 'Mois de naissance',   items: MONTHS_FR, selectedIndex: month - 1,                      onSelect: handleMonthSelect },
    year:  { title: 'Année de naissance',  items: yearItems, selectedIndex: Math.max(0, MAX_BIRTH_YEAR - year), onSelect: handleYearSelect },
  };

  // Validation
  const pseudoError = pseudo.length > 0
    ? pseudo.trim().length < 3
      ? '3 caractères minimum'
      : !/^[a-zA-Z0-9_\-\.]+$/.test(pseudo.trim())
        ? 'Lettres, chiffres, _ - . uniquement'
        : null
    : null;

  const passwordError = password.length > 0
    ? password.length < 8
      ? '8 caractères minimum'
      : !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
        ? 'Doit contenir une majuscule, une minuscule et un chiffre'
        : null
    : null;

  const ageError = (() => {
    const age = (Date.now() - new Date(`${birthDate}T00:00:00.000Z`).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return age < 18 ? 'Tu dois avoir au moins 18 ans' : null;
  })();

  const isFormValid =
    pseudo.trim().length >= 3 && pseudoError === null &&
    email.trim().length > 0 &&
    ageError === null &&
    city.trim().length > 0 &&
    VALID_GENDERS.includes(gender) &&
    password.length >= 8 && passwordError === null;

  const handleRegister = async () => {
    if (isLoading) return;

    // Show explicit validation feedback instead of silently blocking
    if (!isFormValid) {
      const errors: string[] = [];
      if (!pseudo.trim() || pseudoError) errors.push(`• Pseudo : ${pseudoError || 'requis'}`);
      if (!email.trim())                  errors.push('• Email : requis');
      if (ageError)                       errors.push(`• Date de naissance : ${ageError}`);
      if (!city.trim())                   errors.push('• Ville : requise');
      if (!password || passwordError)     errors.push(`• Mot de passe : ${passwordError || 'requis'}`);
      Alert.alert('Formulaire incomplet', errors.join('\n') || 'Remplis tous les champs.');
      return;
    }

    try {
      setIsLoading(true);
      console.warn('[Register] payload →', { pseudo: pseudo.trim(), email: email.trim().toLowerCase(), birthDate, city: city.trim(), gender });

      await storeRegister({
        pseudo:    pseudo.trim(),
        email:     email.trim().toLowerCase(),
        birthDate: new Date(`${birthDate}T00:00:00.000Z`).toISOString(),
        city:      city.trim(),
        gender:    gender as 'HOMME' | 'FEMME' | 'AUTRE',
        password,
      });

      console.warn('[Register] success → /create-profile');
      router.replace('/create-profile');
    } catch (err: any) {
      console.warn('[Register] error →', err?.message);
      Alert.alert('Erreur', err?.message || 'Une erreur est survenue. Vérifie ta connexion.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentPicker = activePicker ? pickerConfig[activePicker] : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
              {/* Pseudo */}
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

              {/* Email */}
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

              {/* Date de naissance */}
              <View style={styles.field}>
                <Text style={styles.label}>Date de naissance</Text>

                {/* Column labels */}
                <View style={styles.dateLabels}>
                  <Text style={[styles.dateColLabel, { flex: 1 }]}>Jour</Text>
                  <Text style={[styles.dateColLabel, { flex: 2 }]}>Mois</Text>
                  <Text style={[styles.dateColLabel, { flex: 1.5 }]}>Année</Text>
                </View>

                {/* Compact selector row */}
                <View style={styles.dateRow}>
                  <Pressable style={[styles.dateBtn, { flex: 1 }]} onPress={() => setActivePicker('day')}>
                    <Text style={styles.dateBtnText}>{String(day).padStart(2, '0')}</Text>
                    <Text style={styles.dateBtnChevron}>▾</Text>
                  </Pressable>

                  <View style={styles.dateSep} />

                  <Pressable style={[styles.dateBtn, { flex: 2 }]} onPress={() => setActivePicker('month')}>
                    <Text style={styles.dateBtnText} numberOfLines={1}>{MONTHS_FR[month - 1]}</Text>
                    <Text style={styles.dateBtnChevron}>▾</Text>
                  </Pressable>

                  <View style={styles.dateSep} />

                  <Pressable style={[styles.dateBtn, { flex: 1.5 }]} onPress={() => setActivePicker('year')}>
                    <Text style={styles.dateBtnText}>{String(year)}</Text>
                    <Text style={styles.dateBtnChevron}>▾</Text>
                  </Pressable>
                </View>

                {ageError ? <Text style={styles.fieldError}>{ageError}</Text> : null}
              </View>

              {/* Ville */}
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

              {/* Genre */}
              <View style={styles.field}>
                <Text style={styles.label}>Genre</Text>
                <View style={styles.genderRow}>
                  {GENDER_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      style={[styles.genderBtn, gender === opt.value && styles.genderBtnActive]}
                      onPress={() => setGender(opt.value)}
                    >
                      <Text style={[styles.genderBtnText, gender === opt.value && styles.genderBtnTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Mot de passe */}
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

              {/* Submit — always tappable, shows validation message if incomplete */}
              <Pressable
                style={[styles.button, (!isFormValid || isLoading) && styles.buttonDisabled]}
                onPress={handleRegister}
              >
                {isLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.buttonText}>Créer mon compte</Text>
                }
              </Pressable>

              <Pressable disabled={isLoading} onPress={() => router.replace('/login')}>
                <Text style={styles.link}>Déjà un compte ? Se connecter</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date bottom-sheet picker */}
      {currentPicker && (
        <PickerBottomSheet
          visible={activePicker !== null}
          title={currentPicker.title}
          items={currentPicker.items}
          selectedIndex={currentPicker.selectedIndex}
          onSelect={currentPicker.onSelect}
          onClose={() => setActivePicker(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex:       { flex: 1 },
  safeArea:   { flex: 1, backgroundColor: '#f6f1ea' },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fffaf5',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: '#e7ddd2',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  brand: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 4,
    color: '#9c3d4f',
    marginBottom: 14,
  },
  title: {
    textAlign: 'center',
    fontSize: 34,
    fontWeight: '800',
    color: '#232126',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 24,
    color: '#7a746d',
    marginBottom: 28,
  },
  form:  { gap: 16 },
  field: { gap: 8 },
  label: { fontSize: 16, fontWeight: '600', color: '#2a272c' },

  // Date picker row
  dateLabels: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  dateColLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9a948d',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  dateRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#d9cec3',
    borderRadius: 14,
    backgroundColor: '#fff',
    overflow: 'hidden',
    height: 54,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  dateBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f1d21',
    flexShrink: 1,
  },
  dateBtnChevron: {
    fontSize: 11,
    color: '#9a948d',
  },
  dateSep: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#d9cec3',
    alignSelf: 'stretch',
  },

  input: {
    height: 54,
    borderWidth: 1,
    borderColor: '#d9cec3',
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1f1d21',
  },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d9cec3',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderBtnActive:     { backgroundColor: '#9c2f45', borderColor: '#9c2f45' },
  genderBtnText:       { fontSize: 15, fontWeight: '600', color: '#2a272c' },
  genderBtnTextActive: { color: '#fff' },

  button: {
    marginTop: 8,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#9c2f45',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText:     { color: '#fff', fontSize: 18, fontWeight: '700' },
  link: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#9c3d4f',
  },
  fieldError: { fontSize: 13, color: '#c0392b', marginTop: 2 },
});
