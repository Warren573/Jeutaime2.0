import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

const COIN_ICON = require('../../assets/ui-icons/coin.png');

export function CoinIcon({
  size = 18,
  style,
}: {
  size?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={COIN_ICON}
      style={[{ width: size, height: size, resizeMode: 'contain' }, style]}
    />
  );
}
