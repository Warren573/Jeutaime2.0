import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, {
  Path,
  Circle,
  Ellipse,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

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
  const cardHeight = compact ? 245 : 430;

  const frontStart = isSent ? '#F7E3D8' : '#F8EBCF';
  const frontEnd = isSent ? '#EECFBE' : '#EFD8AE';
  const backOne = isSent ? '#E6C6B7' : '#E4C99D';
  const backTwo = isSent ? '#F0D8CC' : '#EEDCB9';
  const edge = isSent ? '#C99988' : '#C8A36C';
  const stain = isSent ? '#B47767' : '#9A6E3F';

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={[styles.shadowWrap, { height: cardHeight }]}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 1000 650"
          preserveAspectRatio="none"
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient id="frontPaper" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={frontStart} />
              <Stop offset="0.55" stopColor={frontStart} />
              <Stop offset="1" stopColor={frontEnd} />
            </LinearGradient>
          </Defs>

          {/* Two imperfect sheets behind the main page */}
          <Path
            d="M58 63 C145 43 235 56 326 47 C430 37 518 52 612 45 C715 37 810 47 919 54 L946 589 C845 607 754 597 656 605 C548 614 442 599 334 609 C239 618 145 608 56 594 Z"
            fill={backOne}
            opacity="0.62"
            transform="rotate(-1.4 500 325)"
          />
          <Path
            d="M45 55 C145 48 252 60 348 50 C457 40 565 58 665 49 C768 40 858 52 948 61 L938 601 C842 615 736 606 641 615 C533 624 429 609 324 618 C220 626 134 615 51 603 Z"
            fill={backTwo}
            opacity="0.9"
            transform="rotate(0.8 500 325)"
          />

          {/* Main weathered sheet with intentionally irregular edges */}
          <Path
            d="M42 47
               C92 28 145 45 197 37
               C257 28 318 43 374 35
               C433 27 487 43 546 34
               C610 24 671 43 733 34
               C791 26 848 43 909 35
               C941 31 964 42 966 69
               C972 112 957 148 966 190
               C974 233 959 270 966 313
               C974 360 956 402 966 446
               C973 491 958 529 964 573
               C967 596 950 612 926 616
               C870 624 822 611 768 618
               C704 627 644 610 583 619
               C521 629 459 611 398 620
               C339 629 285 611 226 620
               C169 628 115 612 61 618
               C34 615 22 597 24 572
               C31 522 16 478 25 432
               C33 389 18 347 26 304
               C34 261 19 217 27 174
               C34 132 18 91 28 61
               C31 54 35 50 42 47 Z"
            fill="url(#frontPaper)"
            stroke={edge}
            strokeWidth="3.2"
          />

          {/* Water / salt damage */}
          <Circle cx="838" cy="172" r="95" fill="none" stroke={stain} strokeWidth="26" opacity="0.09" />
          <Circle cx="838" cy="172" r="65" fill="none" stroke={stain} strokeWidth="8" opacity="0.045" />
          <Ellipse cx="112" cy="524" rx="115" ry="66" fill={stain} opacity="0.055" />
          <Ellipse cx="149" cy="495" rx="66" ry="42" fill={stain} opacity="0.045" />
          <Circle cx="731" cy="485" r="10" fill={stain} opacity="0.17" />
          <Circle cx="699" cy="513" r="6" fill={stain} opacity="0.11" />
          <Circle cx="203" cy="519" r="7" fill={stain} opacity="0.13" />
          <Circle cx="176" cy="535" r="5" fill={stain} opacity="0.09" />

          {/* Soft folds / wrinkles */}
          <Path d="M122 118 C260 140 376 103 510 126 C639 148 758 112 885 132" fill="none" stroke={stain} strokeWidth="2" opacity="0.045" />
          <Path d="M168 352 C310 330 443 370 585 348 C710 329 796 359 874 346" fill="none" stroke={stain} strokeWidth="2" opacity="0.04" />
          <Path d="M430 80 C452 192 423 304 449 423 C459 472 462 528 450 585" fill="none" stroke={stain} strokeWidth="2" opacity="0.035" />

          {/* Tiny edge wear */}
          <Path d="M70 66 L104 53 L136 61 L166 50" fill="none" stroke={edge} strokeWidth="5" opacity="0.26" />
          <Path d="M820 606 L851 593 L884 601 L914 590" fill="none" stroke={edge} strokeWidth="5" opacity="0.22" />
        </Svg>

        <View style={styles.content}>
          {(label || dateLabel) && (
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, isSent && styles.metaLabelSent]}>
                {label || (isSent ? 'TA LETTRE' : 'LETTRE REÇUE')}
              </Text>
              {dateLabel ? <Text style={styles.metaDate}>{dateLabel}</Text> : null}
            </View>
          )}

          <View style={styles.rule} />

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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  containerCompact: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  shadowWrap: {
    width: '100%',
    position: 'relative',
    shadowColor: '#3C291B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.17,
    shadowRadius: 11,
    elevation: 5,
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 48,
    paddingTop: 44,
    paddingBottom: 40,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 10.5,
    letterSpacing: 2.5,
    fontWeight: '800',
    color: '#85603D',
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
    backgroundColor: 'rgba(113,82,50,0.38)',
    marginTop: 16,
    marginBottom: 22,
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
    lineHeight: 26,
  },
});
