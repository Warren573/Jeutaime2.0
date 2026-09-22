import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppBackButton } from '../components/AppBackButton';
import { APP_COLORS, APP_RADIUS, APP_SHADOWS, APP_SPACING } from '../theme/appTheme';

export default function LegalNoticeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>JEUTAIME</Text>
          <Text style={styles.title}>Mentions légales</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>À compléter avant publication</Text>
          <Text style={styles.warningText}>
            Les informations définitives de l’éditeur et de l’hébergeur devront être renseignées avant la mise en ligne commerciale.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Éditeur</Text>
          <Text style={styles.paragraph}>JeuTaime — informations juridiques de l’éditeur à compléter.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Directeur de la publication</Text>
          <Text style={styles.paragraph}>À compléter avant publication.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Hébergement</Text>
          <Text style={styles.paragraph}>Infrastructure applicative et base de données : informations de l’hébergeur à finaliser avant publication.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.paragraph}>Adresse de contact officielle à compléter avant publication.</Text>
        </View>
      </ScrollView>
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
    backgroundColor: APP_COLORS.paper,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  headerText: { flex: 1, alignItems: 'center', paddingHorizontal: APP_SPACING.sm },
  headerSpacer: { width: 52 },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: APP_COLORS.muted },
  title: { fontSize: 22, fontWeight: '900', color: APP_COLORS.ink, marginTop: 2 },
  content: { padding: APP_SPACING.md, paddingBottom: 48 },
  warningCard: {
    backgroundColor: APP_COLORS.paperSoft,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    marginBottom: APP_SPACING.md,
  },
  warningTitle: { fontSize: 14, fontWeight: '900', color: APP_COLORS.burgundy, marginBottom: 5 },
  warningText: { fontSize: 12, lineHeight: 18, color: APP_COLORS.muted },
  card: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    marginBottom: APP_SPACING.sm,
    ...(APP_SHADOWS.card ?? {}),
  },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: APP_COLORS.ink, marginBottom: 8 },
  paragraph: { fontSize: 12.5, lineHeight: 20, color: APP_COLORS.ink },
});
