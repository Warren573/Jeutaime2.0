import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Dimensions } from 'react-native';

interface BottleParchmentCardProps {
  content: string;
  compact?: boolean;
}

const PARCHMENT_BG = require('../../assets/images/bottle/letter-bg4.png');
const { width } = Dimensions.get('window');

export const BottleParchmentCard: React.FC<BottleParchmentCardProps> = ({
  content,
  compact = false,
}) => {
  const cardHeight = compact ? Math.min(width * 0.34, 150) : width * (885 / 624);

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <ImageBackground
        source={PARCHMENT_BG}
        style={[
          styles.parchment,
          {
            height: cardHeight,
          },
        ]}
        resizeMode="cover"
      >
        <View style={[styles.textArea, compact && styles.textAreaCompact]}>
          <Text
            style={[styles.message, compact && styles.messageCompact]}
            numberOfLines={compact ? 3 : undefined}
            ellipsizeMode={compact ? 'tail' : undefined}
          >
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
    marginHorizontal: 0,
    marginVertical: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginTop: 24,
  },
  containerCompact: {
    marginTop: 0,
    marginBottom: 8,
    overflow: 'hidden',
  },
  parchment: {
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  textArea: {
    width: '85%',
    paddingTop: 80,
    paddingBottom: 60,
    paddingHorizontal: 28,
    justifyContent: 'flex-start',
    alignSelf: 'center',
  },
  textAreaCompact: {
    width: '84%',
    paddingTop: 34,
    paddingBottom: 18,
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
