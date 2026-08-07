import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppBackButton } from '../components/AppBackButton';
import { APP_COLORS, APP_RADIUS, APP_SHADOWS, APP_SPACING } from '../theme/appTheme';

export default function SoundsSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>AMBIANCE</Text>
          <Text style={styles.title}>Sons</Text>
          <Text style={styles.subtitle}>Les réglages audio seront disponibles avec le moteur sonore.</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>🔊</Text>
          </View>
          <Text style={styles.cardTitle}>Effets sonores à venir</Text>
          <Text style={styles.cardText}>
            L’application ne possède pas encore de moteur audio actif. Aucun interrupteur n’est affiché tant que couper ou activer les sons ne produit pas un effet réel dans l’app.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Les vibrations seront ajoutées au même moment, avec un réglage séparé uniquement lorsqu’elles seront réellement prises en charge.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: APP_COLORS.background },
  header: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: APP_SPACING.md,
    paddingVertical: APP_SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.paper,
  },
  headerText: { flex: 1, alignItems: 'center', paddingHorizontal: APP_SPACING.sm },
  headerSpacer: { width: 52 },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: APP_COLORS.muted },
  title: { fontSize: 24, fontWeight: '900', color: APP_COLORS.ink, marginTop: 2 },
  subtitle: { fontSize: 12, color: APP_COLORS.muted, marginTop: 2, textAlign: 'center' },
  content: { padding: APP_SPACING.md },
  card: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.lg,
    alignItems: 'center',
    ...(APP_SHADOWS.card ?? {}),
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: APP_RADIUS.lg,
    backgroundColor: APP_COLORS.paperSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: APP_SPACING.md,
  },
  icon: { fontSize: 30 },
  cardTitle: { fontSize: 17, fontWeight: '900', color: APP_COLORS.ink, textAlign: 'center' },
  cardText: { fontSize: 13, lineHeight: 20, color: APP_COLORS.muted, textAlign: 'center', marginTop: 8 },
  infoCard: {
    marginTop: APP_SPACING.md,
    backgroundColor: APP_COLORS.paperSoft,
    borderRadius: APP_RADIUS.md,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
  },
  infoText: { fontSize: 12, lineHeight: 18, color: APP_COLORS.muted, textAlign: 'center' },
});
