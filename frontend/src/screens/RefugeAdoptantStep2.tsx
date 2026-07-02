import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore } from "../store/useStore";

export function RefugeAdoptantStep2() {
  const router = useRouter();
  const { adoptantPreferences } = useStore();
  const [lifestyle, setLifestyle] = useState("");
  const [message, setMessage] = useState("");

  const handleContinue = () => {
    if (lifestyle && message) {
      useStore.setState({
        adoptantLifestyle: lifestyle,
        adoptantMessage: message,
      });
      router.push("/refuge/adoptant/step3");
    }
  };

  const isValid = lifestyle.length > 0 && message.length > 0;

  if (!adoptantPreferences || adoptantPreferences.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>Missing preferences</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.step}>Étape 2/4</Text>

        <Text style={styles.title}>Parlez de vous</Text>
        <Text style={styles.subtitle}>
          Aidez les créatures à vous connaître
        </Text>

        {/* Lifestyle */}
        <View style={styles.formSection}>
          <Text style={styles.label}>Votre quotidien</Text>
          <Text style={styles.labelHint}>
            Comment vivez-vous ? Décrivez votre environnement, vos habitudes&hellip;
          </Text>
          <TextInput
            style={styles.textarea}
            placeholder="Je suis une personne casanière qui aime les jeux de société..."
            placeholderTextColor="#CCC"
            value={lifestyle}
            onChangeText={setLifestyle}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{lifestyle.length}/300</Text>
        </View>

        {/* Message */}
        <View style={styles.formSection}>
          <Text style={styles.label}>Votre message</Text>
          <Text style={styles.labelHint}>
            Qu&apos;aimeriez-vous dire aux créatures du Refuge ?
          </Text>
          <TextInput
            style={styles.textarea}
            placeholder="J'aimerais trouver une créature douce et curieuse..."
            placeholderTextColor="#CCC"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{message.length}/300</Text>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Que se passe-t-il ensuite ?</Text>
          <Text style={styles.infoText}>
            Le Refuge examinera votre demande. Si une créature avec un accueillant vous plaît, vous pourrez vous mettre en contact. Peut-être sera-ce le début d&apos;une belle histoire.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.ctaButton, !isValid && styles.ctaButtonDisabled]}
          onPress={handleContinue}
          disabled={!isValid}
        >
          <Text style={styles.ctaButtonText}>Continuer</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8E7",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  step: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#2D1F0E",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#8B6F47",
    marginBottom: 32,
  },
  formSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2D1F0E",
    marginBottom: 4,
  },
  labelHint: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
  },
  textarea: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEE",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#2D1F0E",
    minHeight: 100,
  },
  charCount: {
    fontSize: 11,
    color: "#CCC",
    marginTop: 8,
    textAlign: "right",
  },
  infoBox: {
    backgroundColor: "rgba(180, 215, 255, 0.15)",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#B4D7FF",
    padding: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2D1F0E",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#2D1F0E",
    lineHeight: 20,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "#FFF8E7",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  ctaButton: {
    backgroundColor: "#B4D7FF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ctaButtonDisabled: {
    opacity: 0.5,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2D1F0E",
  },
  error: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
  },
});
