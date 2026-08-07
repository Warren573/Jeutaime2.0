import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

export type AppBackButtonProps = {
  onPress: () => void;
  label?: string;
  tone?: 'default' | 'inverse';
  style?: ViewStyle;
};

export function AppBackButton({
  onPress,
  label = 'Retour',
  tone = 'default',
  style,
}: AppBackButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={[styles.button, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.text, tone === 'inverse' && styles.textInverse]}>← {label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    minWidth: 84,
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    color: '#8B2E3C',
    fontWeight: '700',
  },
  textInverse: {
    color: '#F0D98C',
  },
});
