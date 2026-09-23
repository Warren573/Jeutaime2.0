import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import type { DuelChoice } from '../logic/duelEngine';

interface Props {
  choice: DuelChoice;
  onPress: (choice: DuelChoice) => void;
  disabled?: boolean;
}

export default function ChoiceButton({ choice, onPress, disabled = false }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 30 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={() => onPress(choice)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.pressable}
    >
      <Animated.View style={[styles.button, disabled && styles.disabled, { transform: [{ scale }] }]}>
        <FontAwesome5 name={choice.icon} size={31} color="#6A472E" style={styles.choiceIcon} />
        <Text style={styles.label}>{choice.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  button: {
    borderRadius: 16,
    backgroundColor: '#FEFAF0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: '#B8956A',
    shadowColor: '#5A3A1A',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  disabled: {
    opacity: 0.45,
  },
  choiceIcon: {
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C1A0E',
    letterSpacing: 0.3,
  },
});
