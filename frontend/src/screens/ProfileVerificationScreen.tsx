import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppBackButton } from '../components/AppBackButton';
import {
  APP_COLORS,
  APP_RADIUS,
  APP_SHADOWS,
  APP_SPACING,
} from '../theme/appTheme';

export default function ProfileVerificationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>SÉCURITÉ</Text>
          <Text style={styles.title}>Vérification du profil</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroIcon}>✅</Text>
          <Text style={styles.heroTitle}>Bientôt disponible</Text>
          <Text style={styles.heroText}>
            La vérification d’identité n’est pas encore activée dans cette version de JeuTaime.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>CE QUE LA VÉRIFICATION DEVRA GARANTIR</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowIcon}>👤</Text>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Une personne réelle</Text>
              <Text style={styles.rowText}>Limiter les faux profils sans exposer les documents aux autres membres.</Text>
            </View>
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowIcon}>🔞</Text>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>L’âge minimum</Text>
              <Text style={styles.rowText}>Confirmer l’éligibilité à l’application sans afficher la date de naissance complète.</Text>
            </View>
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowIcon}>🔒</Text>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Des données protégées</Text>
              <Text style={styles.rowText}>La future solution devra limiter au strict nécessaire les données conservées.</Text>
            </View>
          </View>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteIcon}>ℹ️</Text>
          <Text style={styles.noteText}>
            Aucun document d’identité n’est demandé ni envoyé par cet écran aujourd’hui.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: APP_COLORS.background },
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: APP_SPACING.md,
    paddingVertical: APP_SPACING.sm,
    backgroundColor: APP_COLORS.paper,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  headerText: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerSpacer: { width: 52 },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: APP_COLORS.muted, marginBottom: 2 },
  title: { fontSize: 20, fontWeight: '900', color: APP_COLORS.ink, textAlign: 'center' },
  content: { padding: APP_SPACING.md, paddingBottom: 48 },
  heroCard: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.xl,
    marginBottom: APP_SPACING.lg,
    ...(APP_SHADOWS.card ?? {}),
  },
  heroIcon: { fontSize: 42, marginBottom: 10 },
  heroTitle: { fontSize: 20, fontWeight: '900', color: APP_COLORS.ink, marginBottom: 6 },
  heroText: { fontSize: 13, lineHeight: 20, color: APP_COLORS.muted, textAlign: 'center' },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: APP_COLORS.muted, marginBottom: 10 },
  card: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    overflow: 'hidden',
    ...(APP_SHADOWS.card ?? {}),
  },
  row: { flexDirection: 'row', padding: APP_SPACING.md, alignItems: 'flex-start' },
  rowBorder: { borderTopWidth: 1, borderTopColor: APP_COLORS.paperSoft },
  rowIcon: { width: 34, fontSize: 20 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '800', color: APP_COLORS.ink, marginBottom: 3 },
  rowText: { fontSize: 12, lineHeight: 18, color: APP_COLORS.muted },
  noteCard: {
    flexDirection: 'row',
    marginTop: APP_SPACING.md,
    backgroundColor: APP_COLORS.paperSoft,
    borderRadius: APP_RADIUS.md,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
  },
  noteIcon: { fontSize: 18, marginRight: 10 },
  noteText: { flex: 1, fontSize: 11, lineHeight: 17, color: APP_COLORS.muted },
});
