import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";

import { Avatar } from "../avatar/png/Avatar";
import { DEFAULT_AVATAR } from "../avatar/png/defaults";

export default function ProfileTwoStepDemo() {
  const [step, setStep] = useState<1 | 2>(1);

  const profile = {
    firstName: "Sophie",
    age: 28,
    city: "Paris",
    vibe: "Romantique curieuse",
    bio:
      "Je crois qu'on se comprend mieux autour d'un plat qu'on a cuisiné ensemble. J'aime les gens qui savent écrire une vraie phrase, rire un peu d'eux-mêmes, et rester quand la conversation devient intéressante.",
  };

  if (step === 1) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.avatarFrame}>
              <Avatar {...DEFAULT_AVATAR} size={56} />
            </View>

            <View>
              <Text style={styles.name}>
                {profile.firstName}, {profile.age}
              </Text>
              <Text style={styles.meta}>
                {profile.city} · {profile.vibe}
              </Text>
            </View>
          </View>

          <Text style={styles.bio}>{profile.bio}</Text>

          <Pressable onPress={() => setStep(2)}>
            <Text style={styles.link}>Découvrir le profil →</Text>
          </Pressable>

          <View style={styles.actions}>
            <View style={styles.btnBad}>
              <Text>😬 Grimace</Text>
            </View>
            <View style={styles.btnNeutral}>
              <Text>🚩 Signaler</Text>
            </View>
            <View style={styles.btnGood}>
              <Text>😊 Sourire</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Pressable onPress={() => setStep(1)}>
        <Text style={styles.back}>← Seconde chance</Text>
      </Pressable>

      <View style={styles.detailHeader}>
        <View style={styles.avatarFrameBig}>
          <Avatar {...DEFAULT_AVATAR} size={64} />
        </View>

        <View>
          <Text style={styles.name}>
            {profile.firstName}, {profile.age}
          </Text>
          <Text style={styles.meta}>{profile.vibe}</Text>
        </View>
      </View>

      <Text style={styles.quote}>
        "Un mélange de sérieux et d'autodérision."
      </Text>

      <View style={styles.sectionHighlight}>
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
        <Text style={styles.sectionTitle}>Mes petits + et −</Text>
        <Text style={styles.text}>+ Douce</Text>
        <Text style={styles.text}>+ Attentionnée</Text>
        <Text style={styles.text}>− Têtue parfois</Text>
      </View>

      <View style={styles.sectionJournal}>
        <Text style={styles.sectionTitle}>Journée idéale</Text>
        <Text style={styles.text}>08:00 → café tranquille</Text>
        <Text style={styles.text}>
          19:00 → rire avec quelqu'un (ou Netflix)
        </Text>
        <Text style={styles.text}>
          23:00 → discuter jusqu'à oublier l'heure
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5EBDD",
    padding: 16,
  },

  card: {
    backgroundColor: "#F8F1E4",
    borderRadius: 16,
    padding: 16,
  },

  header: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },

  avatarFrame: {
    backgroundColor: "#FFF",
    padding: 6,
    borderRadius: 10,
  },

  avatarFrameBig: {
    backgroundColor: "#FFF",
    padding: 8,
    borderRadius: 12,
  },

  name: {
    fontSize: 20,
    fontWeight: "600",
  },

  meta: {
    fontStyle: "italic",
    color: "#7a6f63",
  },

  bio: {
    fontSize: 18,
    marginVertical: 12,
  },

  link: {
    color: "#8a6f4d",
    marginBottom: 16,
  },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  btnBad: {
    backgroundColor: "#F4DADA",
    padding: 10,
    borderRadius: 12,
  },

  btnNeutral: {
    backgroundColor: "#EEE4D6",
    padding: 10,
    borderRadius: 12,
  },

  btnGood: {
    backgroundColor: "#DCEFE1",
    padding: 10,
    borderRadius: 12,
  },

  back: {
    marginBottom: 16,
    color: "#7a6f63",
  },

  detailHeader: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },

  quote: {
    fontStyle: "italic",
    marginBottom: 20,
  },

  section: {
    marginBottom: 20,
  },

  sectionHighlight: {
    backgroundColor: "#F0E4D2",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },

  sectionJournal: {
    backgroundColor: "#EAD7C2",
    padding: 16,
    borderRadius: 16,
    marginBottom: 40,
  },

  sectionTitle: {
    fontWeight: "600",
    marginBottom: 8,
  },

  text: {
    fontSize: 15,
    marginBottom: 4,
  },
});
