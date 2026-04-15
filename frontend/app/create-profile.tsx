import { useState } from "react";
import {
  SafeAreaView,
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

  const [pseudo, setPseudo] = useState("");
  const [bio, setBio] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isValid = pseudo.trim().length >= 2;

  const handleCreateProfile = async () => {
    if (!isValid || isLoading) return;

    try {
      setIsLoading(true);

      await apiFetch("/profiles", {
        method: "POST",
        body: JSON.stringify({
          pseudo: pseudo.trim(),
          bio: bio.trim(),
        }),
      });

      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Erreur", err?.message || "Impossible de créer le profil");
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

        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Pseudo</Text>
            <TextInput
              value={pseudo}
              onChangeText={setPseudo}
              placeholder="Ton pseudo"
              style={styles.input}
            />
          </View>

          <View>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Quelques mots sur toi…"
              style={[styles.input, { height: 100 }]}
              multiline
            />
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
});