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
} from "react-native";
import { useRouter } from "expo-router";
import { useStore } from "../store/useStore";

export default function LoginScreen() {
  const router = useRouter();
  const { login: storeLogin, authDebug } = useStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // DEBUG: Login flow status
  const [debugStatus, setDebugStatus] = useState<"idle" | "calling_login" | "login_returned" | "error">("idle");
  const [debugError, setDebugError] = useState<string | null>(null);
  const [debugRateLimited, setDebugRateLimited] = useState(false);
  const [debugExtraction, setDebugExtraction] = useState<string | null>(null);

  const isFormValid = email.trim().length > 0 && password.trim().length > 0;

  const handleLogin = async () => {
    if (!isFormValid || isLoading) return;

    try {
      setIsLoading(true);
      setDebugStatus("calling_login");
      setDebugError(null);
      setDebugRateLimited(false);
      setDebugExtraction(null);

      await storeLogin(email.trim().toLowerCase(), password);

      setDebugStatus("login_returned");

      // Small delay to see the debug state before navigation
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 500);
    } catch (err: any) {
      const errorMsg = err?.message || "Une erreur est survenue.";
      const isRateLimited = errorMsg?.includes("Trop de tentatives");
      const isExtractionError = errorMsg?.includes("Tokens manquants");

      setDebugStatus("error");
      setDebugError(errorMsg);
      setDebugRateLimited(isRateLimited);

      if (isExtractionError) {
        setDebugExtraction(errorMsg);
      }

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

          {/* DEBUG: Full auth flow diagnostics */}
          <View style={styles.debugBox}>
            <Text style={styles.debugTitle}>TOKEN DEBUG</Text>
            <Text style={styles.debugText}>Status: {debugStatus}</Text>
            <Text style={styles.debugText}>AccessToken: {authDebug?.tokenStored ? "✓ YES" : "✗ NO"}</Text>
            <Text style={styles.debugText}>RefreshToken: {authDebug?.tokenStored ? "✓ YES" : "✗ NO"}</Text>
            <Text style={styles.debugText}>Store: {authDebug?.tokenStored ? "✓ YES" : "✗ NO"}</Text>
            <Text style={styles.debugText}>JWT_EXP: {authDebug?.accessTokenExp ?? "—"}</Text>
            <Text style={styles.debugText}>CURRENT_TIME: {authDebug?.currentTime ?? "—"}</Text>
            <Text style={styles.debugText}>SECONDS_UNTIL_EXP: {authDebug?.secondsUntilExp ?? "—"}</Text>
            <Text style={styles.debugText}>TOKEN_EXPIRED_CHECK: {authDebug?.tokenExpired ? "✗ YES" : "✓ NO"}</Text>
            <Text style={styles.debugText}>FIRST_401_ENDPOINT: {authDebug?.first401Endpoint ?? "—"}</Text>
            <Text style={styles.debugText}>AUTO_LOGOUT_TRIGGERED: {authDebug?.autoLogoutTriggered ? "✗ YES" : "✓ NO"}</Text>
            <Text style={styles.debugText}>RAW_RESPONSE:</Text>
            <Text style={styles.debugText}>{JSON.stringify(authDebug?.rawLoginResponse, null, 2) ?? "—"}</Text>
            {debugRateLimited && <Text style={styles.debugError}>RateLimit: ✗ YES</Text>}
            {debugExtraction && <Text style={styles.debugError}>TokenError: {debugExtraction}</Text>}
            {debugError && <Text style={styles.debugError}>Error: {debugError}</Text>}
          </View>
        </View>
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
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
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
    padding: 16,
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
    fontSize: 11,
    fontFamily: "monospace",
    marginVertical: 3,
  },
  debugError: {
    color: "#ff6b6b",
    fontSize: 11,
    fontFamily: "monospace",
    marginVertical: 3,
    fontWeight: "600",
  },
});
