import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Image,
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
}

export const BottleParchmentCard: React.FC<BottleParchmentCardProps> = ({
  content,
  compact = false,
  variant = 'neutral',
  label,
  dateLabel,
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
          pointerEvents="none"
        />

        <View
          style={[
            styles.content,
            compact ? styles.contentCompact : styles.contentFull,
          ]}
        >
          {(label || dateLabel) && (
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, isSent && styles.metaLabelSent]}>
                {label || (isSent ? 'TA LETTRE' : 'LETTRE REÇUE')}
              </Text>
              {dateLabel ? <Text style={styles.metaDate}>{dateLabel}</Text> : null}
            </View>
          )}

          <View style={[styles.rule, compact && styles.ruleCompact]} />

          <Text
            style={[styles.message, compact && styles.messageCompact]}
            numberOfLines={compact ? 6 : undefined}
            ellipsizeMode={compact ? 'tail' : undefined}
          >
            {content}
          </Text>
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
    shadowColor: '#3C291B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 11,
    elevation: 5,
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
    paddingTop: 64,
    paddingBottom: 56,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 10.5,
    letterSpacing: 2.4,
    fontWeight: '800',
    color: '#7F5D3E',
  },
  metaLabelSent: {
    color: '#9E3E50',
  },
  metaDate: {
    fontSize: 12,
    color: '#8D7358',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },

  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(113,82,50,0.34)',
    marginTop: 14,
    marginBottom: 24,
  },
  ruleCompact: {
    marginTop: 12,
    marginBottom: 16,
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
