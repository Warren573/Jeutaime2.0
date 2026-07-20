import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useStore } from "../store/useStore";
import { API_URL } from "../api/client";

export default function LoginScreen() {
  const router = useRouter();
  const { login: storeLogin } = useStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // DEBUG: Full login flow tracking
  const [debugLoginFlow, setDebugLoginFlow] = useState({
    loginApiUrl: "",
    rawResponse: null as any,
    accessTokenExtracted: false,
    refreshTokenExtracted: false,
    setAuthCalled: false,
    currentUserAfterStore: null as any,
    routerReplaceCalled: false,
    exactError: null as string | null,
  });

  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

  const handleLogin = async () => {
    if (!isFormValid || isLoading) return;

    try {
      setIsLoading(true);
      setDebugLoginFlow({
        loginApiUrl: "/auth/login",
        rawResponse: null,
        accessTokenExtracted: false,
        refreshTokenExtracted: false,
        setAuthCalled: false,
        currentUserAfterStore: null,
        routerReplaceCalled: false,
        exactError: null,
      });

      const result = await storeLogin(email.trim().toLowerCase(), password);

      setDebugLoginFlow(prev => ({
        ...prev,
        rawResponse: result,
        accessTokenExtracted: !!result?.accessToken,
        refreshTokenExtracted: !!result?.refreshToken,
        setAuthCalled: true,
        currentUserAfterStore: { logged: true },
        routerReplaceCalled: true,
      }));

      router.replace("/(tabs)");
    } catch (err: any) {
      const errorMsg = err?.message || "Une erreur est survenue.";
      setDebugLoginFlow(prev => ({
        ...prev,
        exactError: errorMsg,
      }));
      Alert.alert("Erreur", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = () => {
    router.push("/register");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.container}>
            <View style={styles.card}>
              <Text style={styles.brand}>JEUTAIME</Text>
              <Text style={styles.title}>Connexion</Text>
              <Text style={styles.subtitle}>
                Retrouve ton univers et continue l'aventure.
              </Text>

              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="ton@email.com"
                    placeholderTextColor="#9a948d"
                    style={[styles.input, emailFocused && styles.inputFocused]}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Mot de passe</Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="••••••••"
                    placeholderTextColor="#9a948d"
                    style={[styles.input, passwordFocused && styles.inputFocused]}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                </View>

                <Pressable
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Se connecter</Text>
                  )}
                </Pressable>

                <Pressable disabled={isLoading} onPress={handleRegister}>
                  <Text style={styles.link}>Créer un compte</Text>
                </Pressable>
              </View>
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
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  container: {
    alignItems: "center",
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
  inputFocused: {
    borderColor: "#9c2f45",
    borderWidth: 2,
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
  debugBox: {
    marginTop: 24,
    padding: 12,
    backgroundColor: "#2a1f26",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#9c3d4f",
    width: "100%",
    maxWidth: 420,
  },
  debugTitle: {
    color: "#9c3d4f",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 2,
  },
  debugText: {
    color: "#b8a9a0",
    fontSize: 10,
    fontFamily: "monospace",
    marginVertical: 2,
  },
  debugError: {
    color: "#ff6b6b",
    fontSize: 10,
    fontFamily: "monospace",
    marginVertical: 2,
    fontWeight: "600",
  },
});
