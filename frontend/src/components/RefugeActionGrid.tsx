import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { BouncyButton } from "./BouncyButton";
import { ACTION_LABELS } from "../data/refugeActions";

const screenWidth = Dimensions.get("window").width;

export type RefugeActionType = "feed" | "play" | "pet" | "wash";

interface RefugeActionGridProps {
  selectedActions: RefugeActionType[];
  onToggleAction: (action: RefugeActionType) => void;
  disabled?: boolean;
  submitted?: boolean;
}

const actions: RefugeActionType[] = ["feed", "play", "pet", "wash"];

export function RefugeActionGrid({
  selectedActions,
  onToggleAction,
  disabled = false,
  submitted = false,
}: RefugeActionGridProps) {
  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <BouncyButton
          key={action}
          style={[
            styles.button,
            selectedActions.includes(action) && styles.buttonSelected,
            (disabled || submitted) && styles.buttonDisabled,
          ]}
          onPress={() => !disabled && !submitted && onToggleAction(action)}
          disabled={disabled || submitted || (selectedActions.length === 2 && !selectedActions.includes(action))}
        >
          <Text style={styles.icon}>
            {action === "feed" ? "🍖" : action === "play" ? "🎾" : action === "pet" ? "🤗" : "🧼"}
          </Text>
          <Text
            style={[
              styles.label,
              selectedActions.includes(action) && styles.labelSelected,
            ]}
          >
            {ACTION_LABELS[action]}
          </Text>
        </BouncyButton>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 16,
  },
  button: {
    width: (screenWidth - 52) / 2,
    aspectRatio: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: "#E8D5C4",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  buttonSelected: {
    backgroundColor: "#FF9800",
    borderColor: "#FF7500",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  icon: {
    fontSize: 24,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2D1F0E",
    textAlign: "center",
  },
  labelSelected: {
    color: "#FFFFFF",
  },
});
