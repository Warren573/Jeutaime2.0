import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface RefugeDayResultIconProps {
  status: string;
  symbol: string;
  size?: number;
}

/**
 * Affiche le résultat d'un jour du Refuge.
 * - COMPLETE/INCOMPLETE/NOT_PLAYED: affiche le symbol emoji directement
 * - PARTIAL: affiche un demi-cœur (gauche rouge ❤️, droite grise)
 */
export function RefugeDayResultIcon({ status, symbol, size = 20 }: RefugeDayResultIconProps) {
  if (status === "PARTIAL") {
    return (
      <View style={[styles.halfHeartContainer, { width: size, height: size }]}>
        {/* Left half: red heart */}
        <View style={[styles.heartHalf, styles.heartHalfLeft]}>
          <Text style={[styles.heartText, { fontSize: size * 0.9 }]}>❤️</Text>
        </View>
        {/* Right half: gray heart */}
        <View style={[styles.heartHalf, styles.heartHalfRight]}>
          <Text style={[styles.heartText, { fontSize: size * 0.9 }, styles.grayHeart]}>🤍</Text>
        </View>
      </View>
    );
  }

  return <Text style={{ fontSize: size }}>{symbol}</Text>;
}

const styles = StyleSheet.create({
  halfHeartContainer: {
    flexDirection: "row",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  heartHalf: {
    position: "absolute",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  heartHalfLeft: {
    left: 0,
    width: "50%",
  },
  heartHalfRight: {
    right: 0,
    width: "50%",
  },
  heartText: {
    lineHeight: 1,
  },
  grayHeart: {
    opacity: 0.6,
  },
});
