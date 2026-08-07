import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppBackButton } from '../components/AppBackButton';
import { APP_COLORS, APP_RADIUS, APP_SHADOWS, APP_SPACING } from '../theme/appTheme';

export default function AccountLifecycleUnavailableScreen({
  mode,
}: {
  mode: 'deactivate' | 'delete';
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDelete = mode === 'delete';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>{isDelete ? 'SUPPRESSION' : 'DÉSACTIVATION'}</Text>
          <Text style={styles.title}>{isDelete ? 'Supprimer mon compte' : 'Désactiver mon compte'}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={[styles.card, isDelete && styles.cardDanger]}>
          <Text style={styles.icon}>{isDelete ? '🗑️' : '⏸️'}</Text>
          <Text style={styles.cardTitle}>Fonction indisponible pour le moment</Text>
          <Text style={styles.cardText}>
            {isDelete
              ? 'La suppression définitive n’est pas encore activée car le backend doit garantir la suppression cohérente de toutes les données liées avant de proposer cette action.'
              : 'La désactivation temporaire n’est pas encore modélisée côté backend. Masquer simplement le profil de la découverte ne suffirait pas à désactiver réellement le compte.'}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Aucun bouton factice n’est proposé ici : tant que l’action n’est pas sûre et complète côté serveur, l’écran reste informatif.
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
  title: { fontSize: 22, fontWeight: '900', color: APP_COLORS.ink, marginTop: 2, textAlign: 'center' },
  content: { padding: APP_SPACING.md },
  card: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: 24,
    ...(APP_SHADOWS.card ?? {}),
  },
  cardDanger: { borderColor: APP_COLORS.danger },
  icon: { fontSize: 44, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: APP_COLORS.ink, textAlign: 'center' },
  cardText: { fontSize: 13, lineHeight: 20, color: APP_COLORS.muted, textAlign: 'center', marginTop: 10 },
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
