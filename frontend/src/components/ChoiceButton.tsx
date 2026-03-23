import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
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
        <Text style={styles.emoji}>{choice.emoji}</Text>
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
    borderRadius: 20,
    backgroundColor: '#F8F6FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(180,124,255,0.25)',
    shadowColor: '#B47CFF',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  disabled: {
    opacity: 0.45,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2740',
    letterSpacing: 0.3,
  },
});
