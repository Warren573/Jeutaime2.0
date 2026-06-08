import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  cancelText?: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
  isDangerous?: boolean;
}

const { width } = Dimensions.get('window');

export default function ConfirmationModal({
  visible,
  title,
  message,
  cancelText = 'Annuler',
  confirmText = 'Confirmer',
  onCancel,
  onConfirm,
  isDangerous = false,
}: ConfirmationModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#FFF8E7', '#FFF0D9']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            {/* Title */}
            <Text style={styles.title}>{title}</Text>

            {/* Message */}
            <Text style={styles.message}>{message}</Text>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>
                  {cancelText}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.confirmButton,
                  isDangerous && styles.dangerousButton,
                ]}
                onPress={onConfirm}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.buttonText,
                    styles.confirmButtonText,
                    isDangerous && styles.dangerousButtonText,
                  ]}
                >
                  {confirmText}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: Math.min(width - 40, 320),
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  gradient: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3A2818',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#5A4835',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1.5,
    borderColor: '#D4EDDA',
  },
  cancelButtonText: {
    color: '#667eea',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#667eea',
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  dangerousButton: {
    backgroundColor: '#E74C3C',
  },
  dangerousButtonText: {
    color: '#FFF',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
