import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Dimensions } from 'react-native';

interface BottleParchmentCardProps {
  content: string;
  compact?: boolean;
}

const PARCHMENT_BG = require('../../assets/images/bottle/letter-bg2.jpg');
const { width } = Dimensions.get('window');

export const BottleParchmentCard: React.FC<BottleParchmentCardProps> = ({
  content,
  compact = false,
}) => {
  // Parchemin: prend toute la largeur
  const cardWidth = width;
  const cardHeight = width * 1.33;

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
        resizeMode="cover"
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
    alignItems: 'stretch',
    marginBottom: 0,
    marginHorizontal: -16,
    paddingHorizontal: 0,
  },
  containerCompact: {
    marginBottom: 12,
  },
  parchment: {
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  textArea: {
    width: '100%',
    paddingTop: 80,
    paddingBottom: 60,
    paddingHorizontal: 28,
    justifyContent: 'flex-start',
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
    textAlign: 'left',
  },
  messageCompact: {
    fontSize: 13,
    lineHeight: 20,
  },
});
