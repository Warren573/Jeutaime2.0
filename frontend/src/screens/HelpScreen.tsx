import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppBackButton } from '../components/AppBackButton';
import { APP_COLORS, APP_RADIUS, APP_SHADOWS, APP_SPACING } from '../theme/appTheme';

const ITEMS = [
  { icon: '💬', title: 'FAQ', subtitle: 'Réponses aux questions fréquentes', route: '/faq' },
  { icon: '📜', title: 'Règles du jeu', subtitle: 'Comprendre l’esprit et les mécaniques', route: '/game-rules' },
  { icon: '🔒', title: 'Confidentialité', subtitle: 'Visibilité et localisation', route: '/privacy' },
  { icon: '🚫', title: 'Blocages', subtitle: 'Voir et gérer les personnes bloquées', route: '/blocked-users' },
  { icon: '🚩', title: 'Signalements', subtitle: 'Suivre les signalements envoyés', route: '/user-reports' },
  { icon: '🗄️', title: 'Données personnelles', subtitle: 'Consulter les données du compte', route: '/personal-data' },
  { icon: '🔑', title: 'Mot de passe', subtitle: 'Modifier les informations de connexion', route: '/password' },
];

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>SUPPORT</Text>
          <Text style={styles.title}>Aide</Text>
          <Text style={styles.subtitle}>Retrouve rapidement le bon espace.</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {ITEMS.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.card}
            onPress={() => router.push(item.route as never)}
            activeOpacity={0.78}
          >
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
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
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.paper,
  },
  headerText: { flex: 1, alignItems: 'center', paddingHorizontal: APP_SPACING.sm },
  headerSpacer: { width: 52 },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: APP_COLORS.muted },
  title: { fontSize: 24, fontWeight: '900', color: APP_COLORS.ink, marginTop: 2 },
  subtitle: { fontSize: 12, color: APP_COLORS.muted, marginTop: 2 },
  content: { padding: APP_SPACING.md, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    marginBottom: APP_SPACING.sm,
    ...(APP_SHADOWS.card ?? {}),
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: APP_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.paperSoft,
    marginRight: 12,
  },
  icon: { fontSize: 23 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: APP_COLORS.ink },
  cardSubtitle: { fontSize: 12, color: APP_COLORS.muted, marginTop: 3 },
  arrow: { fontSize: 26, color: APP_COLORS.muted, marginLeft: 8 },
});
