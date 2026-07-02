import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore } from "../store/useStore";

export function RefugeAdoptantStep3() {
  const router = useRouter();
  const pulseAnim = React.useRef(new Animated.Value(0.8)).current;
  const [step, setStep] = useState(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const steps = [
      { delay: 0, icon: "✓" },
      { delay: 800, icon: "✉️" },
      { delay: 1600, icon: "🔍" },
    ];

    steps.forEach(s => {
      setTimeout(() => setStep(prev => prev + 1), s.delay);
    });
  }, [pulseAnim]);

  const handleContinue = () => {
    useStore.setState({
      adoptantPreferences: [],
      adoptantLifestyle: "",
      adoptantMessage: "",
    });
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.step}>Étape 3/4</Text>

        <Text style={styles.title}>Prière envoyée</Text>
        <Text style={styles.subtitle}>
          Le Refuge transmet votre demande aux créatures
        </Text>

        {/* Journey visualization */}
        <View style={styles.journey}>
          {/* Step 1 */}
          <View style={styles.journeyItem}>
            <View style={styles.journeyDot}>
              {step >= 1 ? (
                <Text style={styles.checkmark}>✓</Text>
              ) : (
                <View style={styles.journeyDotEmpty} />
              )}
            </View>
            <Text
              style={[
                styles.journeyLabel,
                step >= 1 && styles.journeyLabelDone,
              ]}
            >
              Demande envoyée
            </Text>
          </View>

          {/* Connector line */}
          <View style={styles.connector} />

          {/* Step 2 */}
          <View style={styles.journeyItem}>
            <View style={styles.journeyDot}>
              {step >= 2 ? (
                <Text style={styles.checkmark}>✉️</Text>
              ) : (
                <View style={styles.journeyDotEmpty} />
              )}
            </View>
            <Text
              style={[
                styles.journeyLabel,
                step >= 2 && styles.journeyLabelDone,
              ]}
            >
              En cours de révision
            </Text>
          </View>

          {/* Connector line */}
          <View style={styles.connector} />

          {/* Step 3 */}
          <View style={styles.journeyItem}>
            <View style={styles.journeyDot}>
              {step >= 3 ? (
                <Animated.View
                  style={{
                    transform: [{ scale: pulseAnim }],
                  }}
                >
                  <Text style={styles.heartEmoji}>🔍</Text>
                </Animated.View>
              ) : (
                <View style={styles.journeyDotEmpty} />
              )}
            </View>
            <Text
              style={[
                styles.journeyLabel,
                step >= 3 && styles.journeyLabelActive,
              ]}
            >
              À l&apos;attente
            </Text>
          </View>
        </View>

        {/* Message */}
        <View style={styles.messageBox}>
          <Text style={styles.messageTitle}>Pendant ce temps&hellip;</Text>
          <Text style={styles.messageText}>
            Le Refuge scrute les horizons. Peut-être qu&apos;une créature, quelque part, rêve aussi de vous connaître.
          </Text>
        </View>

        {/* Action */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleContinue}
        >
          <Text style={styles.ctaButtonText}>Retourner à l&apos;accueil</Text>
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
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
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
  journey: {
    flex: 1,
    justifyContent: "center",
    gap: 0,
  },
  journeyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 12,
  },
  journeyDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  journeyDotEmpty: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#DDD",
  },
  checkmark: {
    fontSize: 20,
    color: "#4CAF50",
    fontWeight: "700",
  },
  heartEmoji: {
    fontSize: 24,
  },
  journeyLabel: {
    flex: 1,
    fontSize: 14,
    color: "#999",
    fontWeight: "500",
  },
  journeyLabelDone: {
    color: "#2D1F0E",
  },
  journeyLabelActive: {
    color: "#FF9800",
    fontWeight: "700",
  },
  connector: {
    marginLeft: 23,
    width: 2,
    height: 16,
    backgroundColor: "#DDD",
  },
  messageBox: {
    backgroundColor: "rgba(180, 215, 255, 0.15)",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#B4D7FF",
    padding: 16,
    marginBottom: 24,
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2D1F0E",
    marginBottom: 8,
  },
  messageText: {
    fontSize: 13,
    color: "#2D1F0E",
    lineHeight: 20,
    fontStyle: "italic",
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
  ctaButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2D1F0E",
  },
});
