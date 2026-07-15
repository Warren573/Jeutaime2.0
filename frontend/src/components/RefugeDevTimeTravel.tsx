/**
 * Refuge DEV Mode - Time Travel Component
 * Allows testing days 1-7 quickly without waiting
 *
 * Only visible in development mode (NODE_ENV !== "production")
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { refugeApi } from "../api/refuge-api";

interface RefugeDevTimeTravelProps {
  sessionId: string | null;
  currentDay: number;
  onDayChanged?: (newDay: number) => void;
}

export function RefugeDevTimeTravel({
  sessionId,
  currentDay,
  onDayChanged,
}: RefugeDevTimeTravelProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Only show in dev mode
  if (
    typeof window !== "undefined" &&
    window.location?.hostname !== "localhost" &&
    !window.location?.hostname?.includes("127.0.0.1")
  ) {
    if (process.env.NODE_ENV === "production") {
      return null;
    }
  }

  if (!sessionId) {
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚙️ DEV - Time Travel</Text>
        <Text style={styles.subtitle}>Current: Day {currentDay}/7</Text>
      </View>

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
