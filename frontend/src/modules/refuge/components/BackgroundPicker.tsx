import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BACKGROUND_DEFINITIONS } from "../refugeBackgrounds";

interface BackgroundPickerProps {
  visible: boolean;
  currentBackground: string;
  onSelect: (background: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function BackgroundPicker({
  visible,
  currentBackground,
  onSelect,
  onClose,
  isLoading = false,
}: BackgroundPickerProps) {
  const [selectedBackground, setSelectedBackground] = useState(currentBackground);

  const handleSelect = async (backgroundId: string) => {
    setSelectedBackground(backgroundId);
    await onSelect(backgroundId);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>🎨 Choisir un fond</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.gridContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {Object.values(BACKGROUND_DEFINITIONS).map((bg) => (
                <TouchableOpacity
                  key={bg.id}
                  style={styles.backgroundCard}
                  onPress={() => handleSelect(bg.id)}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={bg.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientPreview}
                  >
                    {selectedBackground === bg.id && (
                      <View style={styles.checkmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </LinearGradient>
                  <Text style={styles.backgroundName}>{bg.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#2196F3" />
            </View>
          )}

          <TouchableOpacity style={styles.closeActionButton} onPress={onClose}>
            <Text style={styles.closeActionButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingTop: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    fontSize: 24,
    color: "#999",
  },
  gridContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  backgroundCard: {
    width: "30%",
    alignItems: "center",
    marginBottom: 8,
  },
  gradientPreview: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  checkmark: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  backgroundName: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  closeActionButton: {
    marginHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#666",
    borderRadius: 8,
    alignItems: "center",
  },
  closeActionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
