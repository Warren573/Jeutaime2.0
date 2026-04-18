import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";

export default function ProfileTwoStepDemo() {
  const [open, setOpen] = useState(false);

  return (
    <ScrollView style={styles.container}>
      {!open ? (
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.avatar} />
            <View>
              <Text style={styles.name}>Sophie, 28</Text>
              <Text style={styles.meta}>Paris · Romantique curieuse</Text>
            </View>
          </View>

          <Text style={styles.bio}>
            Je crois qu'on se comprend mieux autour d'un plat qu'on a cuisiné
            ensemble. J'aime les gens qui savent écrire une vraie phrase, rire
            un peu d'eux-mêmes, et rester quand la conversation devient
            intéressante.
          </Text>

          <Pressable onPress={() => setOpen(true)}>
            <Text style={styles.link}>Découvrir le profil →</Text>
          </Pressable>

          <View style={styles.actions}>
            <View style={styles.bad}><Text>😬 Grimace</Text></View>
            <View style={styles.neutral}><Text>🚩 Signaler</Text></View>
            <View style={styles.good}><Text>😊 Sourire</Text></View>
          </View>
        </View>
      ) : (
        <View>
          <Text style={styles.quote}>
            "Un mélange de sérieux et d'autodérision."
          </Text>

          <View style={styles.highlight}>
            <Text style={styles.sectionTitle}>Ce que je cherche ici</Text>
            <Text style={styles.text}>
              Quelqu'un avec qui écrire plus de 10 lettres sans disparaître.
              Une vraie histoire, pas juste un passage rapide.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mon univers</Text>
            <Text style={styles.text}>— Voyages lointains</Text>
            <Text style={styles.text}>— Cinéma d'auteur</Text>
            <Text style={styles.text}>— Cuisine du monde</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Compétences (version fun)</Text>
            <Text style={styles.text}>Communication — répond vraiment</Text>
            <Text style={styles.text}>Cuisine — maîtrise les pâtes</Text>
            <Text style={styles.text}>Organisation — procrastination pro</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mes + et -</Text>
            <Text style={styles.text}>+ Douce</Text>
            <Text style={styles.text}>+ Attentionnée</Text>
            <Text style={styles.text}>- Têtue parfois</Text>
          </View>

          <View style={styles.journal}>
            <Text style={styles.sectionTitle}>Journée idéale</Text>
            <Text style={styles.text}>08:00 → café tranquille</Text>
            <Text style={styles.text}>
              19:00 → rire avec quelqu'un (ou Netflix)
            </Text>
            <Text style={styles.text}>
              23:00 → discuter jusqu'à oublier l'heure
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EFE3D3",
    padding: 16,
  },

  card: {
    backgroundColor: "#F6EBDD",
    padding: 18,
    borderRadius: 20,
  },

  header: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  avatar: {
    width: 60,
    height: 60,
    backgroundColor: "#DDD",
    borderRadius: 12,
  },

  name: {
    fontSize: 20,
    fontWeight: "700",
  },

  meta: {
    color: "#7a6a5a",
    fontStyle: "italic",
  },

  bio: {
    fontSize: 20,
    lineHeight: 30,
    marginVertical: 16,
  },

  link: {
    color: "#9c7a4d",
    marginBottom: 16,
  },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  bad: {
    backgroundColor: "#f1d9d9",
    padding: 10,
    borderRadius: 12,
  },

  neutral: {
    backgroundColor: "#e9dfd2",
    padding: 10,
    borderRadius: 12,
  },

  good: {
    backgroundColor: "#ddeadf",
    padding: 10,
    borderRadius: 12,
  },

  quote: {
    fontStyle: "italic",
    marginBottom: 16,
  },

  highlight: {
    backgroundColor: "#E7D6C1",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },

  section: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontStyle: "italic",
    marginBottom: 8,
    color: "#7A5C3E",
  },

  text: {
    fontSize: 16,
    marginBottom: 4,
  },

  journal: {
    backgroundColor: "#EAD7C2",
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#C89B5B",
  },
});
