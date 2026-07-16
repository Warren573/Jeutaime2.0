/**
 * Refuge DEV Mode - Time Travel Component
 * Allows testing days 1-7 quickly without waiting
 *
 * Visible if:
 * - Local dev (__DEV__ true)
 * - OR EXPO_PUBLIC_REFUGE_DEV=true (for preview deployments)
 * Hidden in production builds without flag
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { refugeApi } from "../api/refuge-api";

interface RefugeDevTimeTravelProps {
  sessionId: string | null;
  currentDay: number;
  canAdvanceDay?: boolean;
  onDayChanged?: (newDay: number) => void;
  onSessionReset?: () => void;
}

export function RefugeDevTimeTravel({
  sessionId,
  currentDay,
  canAdvanceDay = false,
  onDayChanged,
  onSessionReset,
}: RefugeDevTimeTravelProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Only show if DEV mode is explicitly enabled
  const isLocalDev = __DEV__;
  const isDevFlagEnabled = process.env.EXPO_PUBLIC_REFUGE_DEV === "true";
  const shouldShow = isLocalDev || isDevFlagEnabled;

  if (!shouldShow || !sessionId) {
    return null;
  }

  const handleSetDay = async (day: number) => {
    if (day < 1 || day > 7) {
      setMessage("Day must be 1-7");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Passe par apiFetch : base URL + Authorization (la route exige l'auth)
      await refugeApi.devSetDay(sessionId, day);
      setMessage(`✅ Jumped to Day ${day}.`);
      onDayChanged?.(day);
    } catch (err) {
      setMessage(`❌ Error: ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceDay = async () => {
    setLoading(true);
    setMessage("");

    try {
      const session = await refugeApi.devAdvanceDay(sessionId);
      setMessage(`✅ Jour suivant : Day ${session?.currentDay ?? currentDay + 1}.`);
      onDayChanged?.(session?.currentDay ?? currentDay + 1);
    } catch (err) {
      setMessage(`❌ ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (mode: "reset" | "abandon" | "consent") => {
    setLoading(true);
    setMessage("");

    try {
      await refugeApi.devResetSession(sessionId, mode);
      if (mode === "consent") {
        // On reste sur la session : seuls les consentements sont effacés
        setMessage("✅ Consentements effacés.");
        onDayChanged?.(currentDay);
      } else {
        setMessage(mode === "abandon" ? "✅ Session abandonnée." : "✅ Session remise à zéro.");
        onSessionReset?.();
      }
    } catch (err) {
      setMessage(`❌ Error: ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚙️ DEV - Time Travel</Text>
        <Text style={styles.subtitle}>Current: Day {currentDay}/7</Text>
      </View>

      {/* Mode 1 — Jour suivant : uniquement si le jour courant est terminé */}
      <View style={styles.resetRow}>
        <TouchableOpacity
          style={[
            styles.advanceButton,
            (!canAdvanceDay || loading) && styles.dayButtonDisabled,
          ]}
          onPress={handleAdvanceDay}
          disabled={!canAdvanceDay || loading}
        >
          <Text style={styles.advanceButtonText}>
            ⏭️ Jour suivant
            {canAdvanceDay ? "" : currentDay >= 7 ? " (jour 7 : phase finale)" : " (jour en cours non terminé)"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Mode 2 — Forcer un jour (test) : ne fabrique aucune donnée, jours sautés restent blancs */}
      <Text style={styles.sectionLabel}>Forcer un jour (test)</Text>
      <View style={styles.buttonGrid}>
        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
          <TouchableOpacity
            key={day}
            style={[
              styles.dayButton,
              day === currentDay && styles.dayButtonActive,
              loading && styles.dayButtonDisabled,
            ]}
            onPress={() => handleSetDay(day)}
            disabled={loading}
          >
            <Text
              style={[
                styles.dayButtonText,
                day === currentDay && styles.dayButtonTextActive,
              ]}
            >
              Day {day}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.resetRow}>
        <TouchableOpacity
          style={[styles.resetButton, loading && styles.dayButtonDisabled]}
          onPress={() => handleReset("reset")}
          disabled={loading}
        >
          <Text style={styles.resetButtonText}>♻️ Remettre à zéro</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.resetButton, styles.abandonButton, loading && styles.dayButtonDisabled]}
          onPress={() => handleReset("abandon")}
          disabled={loading}
        >
          <Text style={styles.resetButtonText}>🗑️ Abandonner</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.resetRow}>
        <TouchableOpacity
          style={[styles.resetButton, loading && styles.dayButtonDisabled]}
          onPress={() => handleReset("consent")}
          disabled={loading}
        >
          <Text style={styles.resetButtonText}>↩️ Reset consentements (phase finale)</Text>
        </TouchableOpacity>
      </View>

      {message && (
        <Text
          style={[
            styles.message,
            message.startsWith("✅") ? styles.messageSuccess : styles.messageError,
          ]}
        >
          {message}
        </Text>
      )}

      <Text style={styles.warning}>
        ⚠️ DEV ONLY - Cette route n&apos;existe pas en production
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1e1e2e",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#ff6b6b",
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ff6b6b",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#aaaaaa",
  },
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  dayButton: {
    flex: Platform.OS === "web" ? 0 : 1,
    minWidth: "13%",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#2d2d44",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#444444",
    alignItems: "center",
  },
  dayButtonActive: {
    backgroundColor: "#ff6b6b",
    borderColor: "#ff6b6b",
  },
  dayButtonDisabled: {
    opacity: 0.5,
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#aaaaaa",
  },
  dayButtonTextActive: {
    color: "#ffffff",
  },
  resetRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  advanceButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#2d5d2d",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#4a8a4a",
    alignItems: "center",
  },
  advanceButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#c8f0c8",
  },
  sectionLabel: {
    fontSize: 11,
    color: "#8888aa",
    marginBottom: 6,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#2d2d44",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#666688",
    alignItems: "center",
  },
  abandonButton: {
    borderColor: "#aa4444",
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#dddddd",
  },
  message: {
    fontSize: 11,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  messageSuccess: {
    backgroundColor: "#2d5d2d",
    color: "#7fff7f",
  },
  messageError: {
    backgroundColor: "#5d2d2d",
    color: "#ff7f7f",
  },
  warning: {
    fontSize: 10,
    color: "#ffaa00",
    fontStyle: "italic",
  },
});
