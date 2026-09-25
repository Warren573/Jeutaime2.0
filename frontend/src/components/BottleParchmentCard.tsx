import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View
        pointerEvents="none"
        style={[
          styles.backSheet,
          styles.backSheetFar,
          isSent && styles.backSheetSent,
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.backSheet,
          styles.backSheetNear,
          isSent && styles.backSheetSentNear,
        ]}
      />

      <View
        style={[
          styles.paper,
          compact && styles.paperCompact,
          isSent ? styles.paperSent : styles.paperReceived,
        ]}
      >
        <View pointerEvents="none" style={styles.waterStainOne} />
        <View pointerEvents="none" style={styles.waterStainTwo} />
        <View pointerEvents="none" style={styles.wornCornerTop} />
        <View pointerEvents="none" style={styles.wornCornerBottom} />

        {(label || dateLabel) && (
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, isSent && styles.metaLabelSent]}>
              {label || (isSent ? 'TA LETTRE' : 'LETTRE REÇUE')}
            </Text>
            {dateLabel ? <Text style={styles.metaDate}>{dateLabel}</Text> : null}
          </View>
        )}

        <View style={styles.messageWrap}>
          <Text
            style={[styles.message, compact && styles.messageCompact]}
            numberOfLines={compact ? 5 : undefined}
            ellipsizeMode={compact ? 'tail' : undefined}
          >
            {content}
          </Text>
        </View>

        <View pointerEvents="none" style={styles.seaMark}>
          <View style={styles.seaLine} />
          <View style={[styles.seaLine, styles.seaLineShort]} />
          <View style={styles.seaLine} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    marginTop: 18,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  containerCompact: {
    marginTop: 2,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 6,
  },

  backSheet: {
    position: 'absolute',
    left: 22,
    right: 22,
    top: 18,
    bottom: 10,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#D7BE95',
    backgroundColor: '#E9D3AD',
  },
  backSheetFar: {
    transform: [{ rotate: '-1.4deg' }, { translateY: 6 }],
    opacity: 0.62,
  },
  backSheetNear: {
    left: 18,
    right: 18,
    transform: [{ rotate: '0.8deg' }, { translateY: 3 }],
    backgroundColor: '#F0DFC0',
    opacity: 0.88,
  },
  backSheetSent: {
    backgroundColor: '#E8CABD',
    borderColor: '#D7B3A5',
  },
  backSheetSentNear: {
    backgroundColor: '#F2DDD3',
    borderColor: '#D9B9AC',
  },

  paper: {
    minHeight: 330,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#CDAF82',
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 24,
    overflow: 'hidden',
    shadowColor: '#4A2F1B',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  paperCompact: {
    minHeight: 150,
    paddingTop: 18,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  paperReceived: {
    backgroundColor: '#F7EBD2',
  },
  paperSent: {
    backgroundColor: '#F5DED3',
    borderColor: '#D6AE9D',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(117,84,50,0.28)',
  },
  metaLabel: {
    fontSize: 10,
    letterSpacing: 1.7,
    fontWeight: '800',
    color: '#876541',
  },
  metaLabelSent: {
    color: '#9B4352',
  },
  metaDate: {
    fontSize: 11,
    color: '#8C765E',
    fontFamily: 'Georgia',
  },

  messageWrap: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 4,
    paddingBottom: 18,
  },
  message: {
    fontSize: 17,
    lineHeight: 27,
    color: '#3B2A1B',
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    textAlign: 'left',
  },
  messageCompact: {
    fontSize: 15,
    lineHeight: 22,
  },

  waterStainOne: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    right: -30,
    top: -28,
    borderWidth: 13,
    borderColor: 'rgba(166,122,73,0.08)',
  },
  waterStainTwo: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    left: -24,
    bottom: 10,
    borderWidth: 9,
    borderColor: 'rgba(166,122,73,0.06)',
  },
  wornCornerTop: {
    position: 'absolute',
    width: 34,
    height: 18,
    right: 8,
    top: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(130,92,52,0.05)',
    transform: [{ rotate: '-12deg' }],
  },
  wornCornerBottom: {
    position: 'absolute',
    width: 44,
    height: 16,
    left: 12,
    bottom: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(130,92,52,0.045)',
    transform: [{ rotate: '8deg' }],
  },

  seaMark: {
    position: 'absolute',
    right: 18,
    bottom: 13,
    width: 52,
    gap: 3,
    opacity: 0.25,
  },
  seaLine: {
    height: 1.3,
    borderRadius: 2,
    backgroundColor: '#7B654C',
  },
  seaLineShort: {
    width: 38,
    alignSelf: 'flex-end',
  },
});
