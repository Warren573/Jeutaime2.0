import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppBackButton } from '../components/AppBackButton';
import { APP_COLORS, APP_RADIUS, APP_SPACING } from '../theme/appTheme';

const RULES = [
  [
    '1. Respect des autres',
    'Le harcèlement, les menaces, l’intimidation, les insultes répétées, les propos haineux ou discriminatoires et les comportements visant à humilier une personne sont interdits.',
  ],
  [
    '2. Sécurité et consentement',
    'Les contenus ou comportements sexuels non sollicités, la pression, le chantage, les menaces, l’exploitation ou toute atteinte au consentement sont interdits. JeuTaime est réservé aux personnes majeures.',
  ],
  [
    '3. Identité et authenticité',
    'Les faux profils, l’usurpation d’identité, les informations volontairement trompeuses destinées à manipuler les autres membres et l’utilisation de photos d’une autre personne sans autorisation sont interdits.',
  ],
  [
    '4. Arnaques, spam et sollicitations',
    'Les arnaques, demandes d’argent frauduleuses, liens malveillants, publicités non sollicitées, spam et tentatives de détourner les utilisateurs à des fins frauduleuses sont interdits.',
  ],
  [
    '5. Contenus interdits',
    'Il est interdit de publier ou transmettre des contenus illégaux, violents, haineux, exploitant des personnes, portant atteinte à la vie privée d’autrui ou enfreignant les droits de tiers.',
  ],
  [
    '6. Photos, bios et messages',
    'Les photos, biographies, pseudos et messages publics doivent respecter ces règles. Un contenu peut être masqué ou supprimé lorsqu’il enfreint les Conditions d’utilisation ou les présentes règles.',
  ],
  [
    '7. Signaler et bloquer',
    'Tu peux signaler un profil, une photo ou un message disponible dans l’application et bloquer un utilisateur avec lequel tu ne souhaites plus interagir. Les signalements sont transmis à la modération.',
  ],
  [
    '8. Sanctions',
    'Selon la gravité ou la répétition des faits, JeuTaime peut avertir un utilisateur, retirer un contenu, limiter sa visibilité, suspendre temporairement son compte ou le suspendre sans date de fin.',
  ],
  [
    '9. Abus du système de signalement',
    'Les signalements volontairement mensongers, répétés dans le but de nuire ou utilisés pour harceler un autre membre peuvent eux-mêmes faire l’objet d’une mesure de modération.',
  ],
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
          <Text style={styles.title}>Règles de la communauté</Text>
          <Text style={styles.subtitle}>Les mêmes règles s’appliquent à tous les membres.</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.introCard}>
          <Text style={styles.introText}>
            En utilisant les fonctions sociales de JeuTaime, chaque membre s’engage à respecter ces règles ainsi que les Conditions d’utilisation.
          </Text>
        </View>

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
  header: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: APP_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.paper,
  },
  headerText: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerSpacer: { width: 52 },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: APP_COLORS.muted },
  title: { fontSize: 22, fontWeight: '900', color: APP_COLORS.ink, marginTop: 2, textAlign: 'center' },
  subtitle: { fontSize: 12, color: APP_COLORS.muted, marginTop: 2, textAlign: 'center' },
  content: { padding: APP_SPACING.md, paddingBottom: 40 },
  introCard: {
    backgroundColor: APP_COLORS.paperSoft,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    marginBottom: APP_SPACING.md,
  },
  introText: { fontSize: 13, lineHeight: 20, color: APP_COLORS.ink },
  card: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    marginBottom: APP_SPACING.sm,
  },
  ruleTitle: { fontSize: 15, fontWeight: '800', color: APP_COLORS.ink },
  ruleText: { fontSize: 13, lineHeight: 19, color: APP_COLORS.muted, marginTop: 6 },
});
