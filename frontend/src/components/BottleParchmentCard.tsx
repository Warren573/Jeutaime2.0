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
            d="M42 49
               L72 39 L91 44 L118 35 L142 42 L170 33 L201 39
               L232 34 L258 41 L289 32 L321 38 L351 31 L384 39
               L416 33 L444 41 L475 31 L506 38 L536 30 L568 40
               L597 32 L628 39 L662 30 L694 38 L724 32 L756 40
               L789 31 L818 39 L851 34 L881 41 L912 35 L940 43
               L960 58 L963 83 L958 109 L966 136 L960 166 L967 195
               L958 224 L965 254 L959 286 L967 314 L958 346 L966 378
               L957 409 L965 439 L958 472 L965 503 L956 536 L962 566
               L956 591 L937 610 L910 614 L884 608 L853 619 L821 612
               L790 620 L758 611 L726 619 L695 610 L662 621 L630 612
               L599 620 L568 611 L536 621 L503 612 L472 620 L440 611
               L408 621 L376 611 L345 620 L313 612 L281 621 L249 611
               L218 619 L188 611 L157 620 L128 611 L98 617 L70 610
               L47 613 L31 596 L27 573 L34 545 L25 517 L33 486 L24 455
               L32 424 L24 394 L33 362 L24 331 L32 300 L24 270 L33 240
               L25 208 L34 179 L26 148 L35 119 L27 90 L31 65 Z"
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

          {/* Torn fibres / little missing bites on the edges */}
          <Path d="M68 61 L91 52 L111 60 L133 49 L153 56" fill="none" stroke={edge} strokeWidth="4.5" opacity="0.28" />
          <Path d="M842 608 L860 596 L880 605 L900 592 L921 600" fill="none" stroke={edge} strokeWidth="4.5" opacity="0.24" />
          <Path d="M30 198 L45 207 L31 221" fill="none" stroke={edge} strokeWidth="3.5" opacity="0.34" />
          <Path d="M958 383 L942 392 L960 407" fill="none" stroke={edge} strokeWidth="3.5" opacity="0.30" />
          <Ellipse cx="325" cy="43" rx="15" ry="5" fill={stain} opacity="0.08" />
          <Ellipse cx="620" cy="614" rx="20" ry="6" fill={stain} opacity="0.07" />
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
    backgroundColor: 'transparent',
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
