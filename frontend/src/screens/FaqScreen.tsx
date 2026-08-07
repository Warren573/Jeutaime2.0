import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppBackButton } from '../components/AppBackButton';
import { APP_COLORS, APP_RADIUS, APP_SPACING } from '../theme/appTheme';

const FAQ = [
  ['Comment rencontrer quelqu’un ?', 'La découverte te propose des profils. Tu peux envoyer un Sourire ou passer avec une Grimace.'],
  ['Que se passe-t-il après un Sourire mutuel ?', 'Un match peut se créer et le jeu des 3 questions sert ensuite à valider l’échange avant les lettres.'],
  ['À quoi servent les lettres ?', 'Les lettres permettent de prendre le temps de discuter avant que davantage d’informations du profil ne soient révélées.'],
  ['À quoi servent les pièces ?', 'Elles alimentent l’économie interne : bonus, certaines actions, offrandes et Premium selon les fonctionnalités disponibles.'],
  ['Comment gérer une personne indésirable ?', 'Depuis son profil ou un échange, tu peux bloquer ou signaler. Les blocages sont gérables dans Paramètres.'],
  ['Pourquoi certaines fonctions ne sont-elles pas disponibles ?', 'JeuTaime active progressivement ses modules. Certains écrans restent volontairement limités tant que leur backend n’est pas complet.'],
];

export default function FaqScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>SUPPORT</Text>
          <Text style={styles.title}>FAQ</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {FAQ.map(([q, a]) => (
          <View key={q} style={styles.card}>
            <Text style={styles.question}>{q}</Text>
            <Text style={styles.answer}>{a}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: APP_COLORS.background },
  header: { minHeight: 82, flexDirection: 'row', alignItems: 'center', paddingHorizontal: APP_SPACING.md, borderBottomWidth: 1, borderBottomColor: APP_COLORS.border, backgroundColor: APP_COLORS.paper },
  headerText: { flex: 1, alignItems: 'center' },
  headerSpacer: { width: 52 },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: APP_COLORS.muted },
  title: { fontSize: 24, fontWeight: '900', color: APP_COLORS.ink, marginTop: 2 },
  content: { padding: APP_SPACING.md, paddingBottom: 40 },
  card: { backgroundColor: APP_COLORS.paper, borderRadius: APP_RADIUS.lg, borderWidth: 1, borderColor: APP_COLORS.border, padding: APP_SPACING.md, marginBottom: APP_SPACING.sm },
  question: { fontSize: 15, fontWeight: '800', color: APP_COLORS.ink },
  answer: { fontSize: 13, lineHeight: 19, color: APP_COLORS.muted, marginTop: 6 },
});
