import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTLE_LAYOUT } from '../constants/bottleLayout';

interface BottleScreenLayoutProps {
  header?: ReactNode;
  parchment: ReactNode;
  actions: ReactNode;
  backgroundColor?: string;
}

/**
 * Common layout structure for bottle screens
 * Ensures consistent parchment positioning across all screens
 *
 * Structure:
 * - Container with paddingTop: insets.top
 *   - HeaderSlot (fixed height BOTTLE_LAYOUT.HEADER_HEIGHT)
 *   - ParchmentSlot
 *   - ActionsSlot
 */
export const BottleScreenLayout: React.FC<BottleScreenLayoutProps> = ({
  header,
  parchment,
  actions,
  backgroundColor = '#FBF8F3',
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bg, { backgroundColor }]}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* HeaderSlot - Fixed height on all screens */}
        <View style={[styles.headerSlot, { height: BOTTLE_LAYOUT.HEADER_HEIGHT }]}>
          {header}
        </View>

        {/* ParchmentSlot */}
        <View
          style={[
            styles.parchmentSlot,
            { marginTop: BOTTLE_LAYOUT.GAP_BEFORE_PARCHMENT },
          ]}
        >
          {parchment}
        </View>

        {/* ActionsSlot */}
        <View
          style={[
            styles.actionsSlot,
            { marginTop: BOTTLE_LAYOUT.GAP_AFTER_PARCHMENT },
          ]}
        >
          {actions}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerSlot: {
    overflow: 'hidden',
  },
  parchmentSlot: {
    alignItems: 'center',
    width: '100%',
  },
  actionsSlot: {
    width: '100%',
  },
});
