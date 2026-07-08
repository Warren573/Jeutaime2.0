import React, { useRef } from 'react';
import { Animated, TouchableWithoutFeedback, StyleProp, ViewStyle } from 'react-native';

interface BouncyButtonProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  children: React.ReactNode;
}

/** Bouton avec micro-bounce tactile : scale-down au press, spring-back au relâchement. */
export function BouncyButton({ onPress, style, disabled, children }: BouncyButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();
  };

  return (
    <TouchableWithoutFeedback
      onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={disabled ? undefined : handlePressOut}
    >
      <Animated.View style={[style, { transform: [{ scale }] }, disabled ? { opacity: 0.5 } : null]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
