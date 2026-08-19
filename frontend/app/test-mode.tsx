import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TEST_MODE_ENABLED, TEST_SCENARIOS } from '../src/dev/TestMode';

export default function TestModeScreen() {
  if (!TEST_MODE_ENABLED) {
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Mode Test JeuTaime</Text>
      <Text style={styles.subtitle}>Outils réservés aux builds de développement.</Text>

      <View style={styles.warning}>
        <Text style={styles.warningText}>Aucun de ces outils ne doit être disponible en production.</Text>
      </View>

      <Text style={styles.sectionTitle}>Scénarios</Text>
      {TEST_SCENARIOS.map((scenario) => (
        <View key={scenario.id} style={styles.card}>
          <Text style={styles.cardTitle}>{scenario.label}</Text>
          <Text style={styles.cardText}>{scenario.description}</Text>
          <Text style={styles.pending}>À brancher sur les données de test</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.7,
    marginBottom: 8,
  },
  warning: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  warningText: {
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardText: {
    fontSize: 14,
    opacity: 0.75,
  },
  pending: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 4,
  },
});
