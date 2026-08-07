import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppBackButton } from '../components/AppBackButton';
import { APP_COLORS, APP_RADIUS, APP_SPACING } from '../theme/appTheme';

const RULES = [
  ['1. Découvrir', 'Parcours les profils et réagis avec un Sourire ou une Grimace.'],
  ['2. Sourire mutuel', 'Quand deux personnes se choisissent, un match peut être créé.'],
  ['3. Jeu des 3 questions', 'Avant les échanges privés, chacun répond aux questions de l’autre. La validation du jeu ouvre la suite de la relation.'],
  ['4. Lettres', 'La discussion avance lettre après lettre, chacun son tour. Le but est de prendre le temps plutôt que de consommer les profils.'],
  ['5. Dévoilement progressif', 'Les informations et photos se révèlent progressivement selon l’évolution de la relation et les règles actives.'],
  ['6. Univers sociaux', 'Salons, Bouteille à la mer, Refuge et Offrandes proposent d’autres façons de créer du lien sans remplacer la discussion.'],
  ['7. Respect', 'Blocage et signalement sont disponibles en cas de comportement indésirable. Les sanctions et décisions de modération restent côté serveur.'],
];

export default function GameRulesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>JEUTAIME</Text>
          <Text style={styles.title}>Règles du jeu</Text>
          <Text style={styles.subtitle}>Créer du lien avant de juger sur une photo.</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {RULES.map(([title, body]) => (
          <View key={title} style={styles.card}>
            <Text style={styles.ruleTitle}>{title}</Text>
            <Text style={styles.ruleText}>{body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: APP_COLORS.background },
  header: { minHeight: 92, flexDirection: 'row', alignItems: 'center', paddingHorizontal: APP_SPACING.md, borderBottomWidth: 1, borderBottomColor: APP_COLORS.border, backgroundColor: APP_COLORS.paper },
  headerText: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerSpacer: { width: 52 },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: APP_COLORS.muted },
  title: { fontSize: 24, fontWeight: '900', color: APP_COLORS.ink, marginTop: 2 },
  subtitle: { fontSize: 12, color: APP_COLORS.muted, marginTop: 2, textAlign: 'center' },
  content: { padding: APP_SPACING.md, paddingBottom: 40 },
  card: { backgroundColor: APP_COLORS.paper, borderRadius: APP_RADIUS.lg, borderWidth: 1, borderColor: APP_COLORS.border, padding: APP_SPACING.md, marginBottom: APP_SPACING.sm },
  ruleTitle: { fontSize: 15, fontWeight: '800', color: APP_COLORS.ink },
  ruleText: { fontSize: 13, lineHeight: 19, color: APP_COLORS.muted, marginTop: 6 },
});
