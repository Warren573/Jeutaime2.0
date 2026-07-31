import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Dimensions } from 'react-native';

interface BottleParchmentCardProps {
  content: string;
  compact?: boolean;
}

const PARCHMENT_BG = require('../../assets/images/bottle/letter-bg.png');
const { width } = Dimensions.get('window');

export const BottleParchmentCard: React.FC<BottleParchmentCardProps> = ({
  content,
  compact = false,
}) => {
  // Parchemin: aspect ratio environ 3:4 (portrait)
  const cardWidth = Math.min(width * 0.95, 340);
  const cardHeight = cardWidth * 1.33;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <ImageBackground
        source={PARCHMENT_BG}
        style={[
          styles.parchment,
          {
            width: cardWidth,
            height: cardHeight,
          },
        ]}
        resizeMode="contain"
      >
        <View style={[styles.textArea, compact && styles.textAreaCompact]}>
          <Text style={[styles.message, compact && styles.messageCompact]}>
            {content}
          </Text>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  containerCompact: {
    marginBottom: 12,
  },
  parchment: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textArea: {
    width: '85%',
    paddingVertical: 32,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  textAreaCompact: {
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  message: {
    fontSize: 15,
    lineHeight: 24,
    color: '#3A2A1A',
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    textAlign: 'justify',
  },
  messageCompact: {
    fontSize: 13,
    lineHeight: 20,
  },
});
