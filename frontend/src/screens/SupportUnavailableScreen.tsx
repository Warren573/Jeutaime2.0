import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppBackButton } from '../components/AppBackButton';
import { APP_COLORS, APP_RADIUS, APP_SHADOWS, APP_SPACING } from '../theme/appTheme';

export default function SupportUnavailableScreen({ mode }: { mode: 'bug' | 'contact' }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bug = mode === 'bug';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>SUPPORT</Text>
          <Text style={styles.title}>{bug ? 'Signaler un bug' : 'Contacter le support'}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.icon}>{bug ? '🐛' : '📩'}</Text>
          <Text style={styles.cardTitle}>Canal pas encore connecté</Text>
          <Text style={styles.cardText}>
            {bug
              ? 'Le backend ne possède pas encore de système de tickets de bug. Aucun formulaire n’est affiché pour éviter de laisser croire qu’un signalement technique serait réellement envoyé.'
              : 'Aucune adresse ou messagerie de support n’est encore configurée dans l’application. Cet écran restera informatif tant qu’un vrai canal de contact n’est pas branché.'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: APP_COLORS.background },
  header: { minHeight: 88, flexDirection: 'row', alignItems: 'center', paddingHorizontal: APP_SPACING.md, borderBottomWidth: 1, borderBottomColor: APP_COLORS.border, backgroundColor: APP_COLORS.paper },
  headerText: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerSpacer: { width: 52 },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: APP_COLORS.muted },
  title: { fontSize: 22, fontWeight: '900', color: APP_COLORS.ink, marginTop: 2, textAlign: 'center' },
  content: { padding: APP_SPACING.md },
  card: { alignItems: 'center', backgroundColor: APP_COLORS.paper, borderRadius: APP_RADIUS.lg, borderWidth: 1, borderColor: APP_COLORS.border, padding: 28, ...(APP_SHADOWS.card ?? {}) },
  icon: { fontSize: 44, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: APP_COLORS.ink, textAlign: 'center' },
  cardText: { fontSize: 13, lineHeight: 20, color: APP_COLORS.muted, textAlign: 'center', marginTop: 10 },
});
