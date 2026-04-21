import { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "../src/api/client";

export default function CreateProfileScreen() {
  const router = useRouter();

  const [pseudo,     setPseudo]     = useState("");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [city,       setCity]       = useState("");
  const [gender,     setGender]     = useState<"HOMME" | "FEMME" | "AUTRE" | null>(null);
  const [birthDay,   setBirthDay]   = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear,  setBirthYear]  = useState("");
  const [isLoading,  setIsLoading]  = useState(false);

  const birthDateISO = (() => {
    const d = parseInt(birthDay), m = parseInt(birthMonth), y = parseInt(birthYear);
    if (!d || !m || !y || y < 1900 || y > new Date().getFullYear()) return null;
    const age = new Date().getFullYear() - y;
    if (age < 18) return null;
    return new Date(Date.UTC(y, m - 1, d)).toISOString();
  })();

  const isValid =
    pseudo.trim().length >= 3 &&
    email.trim().includes("@") &&
    password.length >= 8 &&
    city.trim().length >= 1 &&
    !!gender &&
    !!birthDateISO;

  const handleCreateProfile = async () => {
    if (!isValid || isLoading) return;

    try {
      setIsLoading(true);

      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          pseudo:    pseudo.trim(),
          email:     email.trim().toLowerCase(),
          password,
          city:      city.trim(),
          gender:    gender!,
          birthDate: birthDateISO!,
        }),
      });

      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Erreur", err?.message || "Impossible de créer le compte");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Ton profil</Text>
        <Text style={styles.subtitle}>
          Donne une première impression…
        </Text>

        <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Pseudo</Text>
            <TextInput
              value={pseudo}
              onChangeText={setPseudo}
              placeholder="letters, chiffres, _ - ."
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ton@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="8 car. min, maj + chiffre"
              secureTextEntry
              style={styles.input}
            />
          </View>

          <View>
            <Text style={styles.label}>Ville</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="Ex: Paris"
              style={styles.input}
            />
          </View>

          <View>
            <Text style={styles.label}>Genre</Text>
            <View style={styles.chipRow}>
              {(["FEMME", "HOMME", "AUTRE"] as const).map((g) => (
                <Pressable
                  key={g}
                  style={[styles.chip, gender === g && styles.chipActive]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>
                    {g === "FEMME" ? "Femme" : g === "HOMME" ? "Homme" : "Autre"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.label}>Date de naissance (18 ans min.)</Text>
            <View style={styles.birthRow}>
              <TextInput
                value={birthDay}
                onChangeText={setBirthDay}
                placeholder="JJ"
                keyboardType="numeric"
                maxLength={2}
                style={[styles.input, styles.birthField]}
              />
              <Text style={styles.birthSep}>/</Text>
              <TextInput
                value={birthMonth}
                onChangeText={setBirthMonth}
                placeholder="MM"
                keyboardType="numeric"
                maxLength={2}
                style={[styles.input, styles.birthField]}
              />
              <Text style={styles.birthSep}>/</Text>
              <TextInput
                value={birthYear}
                onChangeText={setBirthYear}
                placeholder="AAAA"
                keyboardType="numeric"
                maxLength={4}
                style={[styles.input, styles.birthFieldYear]}
              />
            </View>
          </View>

          <Pressable
            style={[
              styles.button,
              (!isValid || isLoading) && { opacity: 0.5 },
            ]}
            onPress={handleCreateProfile}
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                Entrer dans l’univers
              </Text>
            )}
          </Pressable>
        </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6f1ea",
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#232126",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#7a746d",
    marginBottom: 24,
    textAlign: "center",
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2a272c",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d9cec3",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
  },
  button: {
    marginTop: 16,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#9c2f45",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  chipRow: {
    flexDirection: "row",
    gap: 10,
  },
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d9cec3",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  chipActive: {
    borderColor: "#9c2f45",
    backgroundColor: "#f9eaea",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7a746d",
  },
  chipTextActive: {
    color: "#9c2f45",
  },
  birthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  birthField: {
    width: 56,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  birthFieldYear: {
    width: 80,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  birthSep: {
    fontSize: 18,
    color: "#b8a082",
    fontWeight: "700",
  },
});