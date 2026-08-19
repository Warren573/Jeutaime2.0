import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { TEST_MODE_ENABLED } from './TestMode';

export function TestModeLink() {
  if (!TEST_MODE_ENABLED) {
    return null;
  }

  return (
    <Pressable style={styles.button} onPress={() => router.push('/test-mode')}>
      <Text style={styles.text}>Mode Test</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    zIndex: 9999,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
