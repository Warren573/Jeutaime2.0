import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Image,
  ScrollView,
} from 'react-native';

const RECEIVED_CARD = require('../../assets/images/bottle/bottle-letter-received.png');
const RECEIVED_FULL = require('../../assets/images/bottle/bottle-letter-received-full.png');
const SENT_CARD = require('../../assets/images/bottle/bottle-letter-sent.png');
const SENT_FULL = require('../../assets/images/bottle/bottle-letter-sent-full.png');

interface BottleParchmentCardProps {
  content: string;
  compact?: boolean;
  variant?: 'received' | 'sent' | 'neutral';
  label?: string;
  dateLabel?: string;
  /**
   * Version pleine uniquement : le texte défile à l'intérieur du parchemin
   * au lieu d'être tranché par la hauteur fixe (aspectRatio 0.75).
   * Désactivé par défaut : les autres écrans gardent leur rendu actuel.
   */
  scrollableContent?: boolean;
}

export const BottleParchmentCard: React.FC<BottleParchmentCardProps> = ({
  content,
  compact = false,
  variant = 'neutral',
  label,
  dateLabel,
  scrollableContent = false,
}) => {
  const isSent = variant === 'sent';

  const paperSource = compact
    ? (isSent ? SENT_CARD : RECEIVED_CARD)
    : (isSent ? SENT_FULL : RECEIVED_FULL);

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={[styles.paperWrap, compact ? styles.paperCompact : styles.paperFull]}>
        <Image
          source={paperSource}
          resizeMode="stretch"
          style={styles.paperImage}
        />

        {!!dateLabel && (
          <Text style={[styles.dateLabel, compact && styles.dateLabelCompact]}>
            {isSent ? 'Envoyée' : 'Reçue'} · {dateLabel}
          </Text>
        )}

        <View
          style={[
            styles.content,
            compact ? styles.contentCompact : styles.contentFull,
          ]}
        >
          {scrollableContent && !compact ? (
            <ScrollView
              style={styles.messageScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              <Text style={styles.message}>{content}</Text>
            </ScrollView>
          ) : (
            <Text
              style={[styles.message, compact && styles.messageCompact]}
              numberOfLines={compact ? 6 : undefined}
              ellipsizeMode={compact ? 'tail' : undefined}
            >
              {content}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
  containerCompact: {
    paddingHorizontal: 2,
    paddingTop: 4,
    paddingBottom: 4,
  },

  paperWrap: {
    width: '100%',
    position: 'relative',
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
  paperCompact: {
    aspectRatio: 1.5,
  },
  paperFull: {
    aspectRatio: 0.75,
  },
  paperImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },

  dateLabel: {
    position: 'absolute',
    top: 46,
    right: 48,
    zIndex: 2,
    fontSize: 11,
    color: 'rgba(82, 58, 39, 0.58)',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
  },
  dateLabelCompact: {
    top: 27,
    right: 30,
    fontSize: 10,
  },

  content: {
    ...StyleSheet.absoluteFillObject,
  },
  contentCompact: {
    paddingHorizontal: 38,
    paddingTop: 34,
    paddingBottom: 30,
  },
  contentFull: {
    paddingHorizontal: 52,
    paddingTop: 54,
    paddingBottom: 56,
  },

  messageScroll: {
    flex: 1,
  },
  message: {
    fontSize: 20,
    lineHeight: 31,
    color: '#3A281A',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
  },
  messageCompact: {
    fontSize: 17,
    lineHeight: 25,
  },
});
