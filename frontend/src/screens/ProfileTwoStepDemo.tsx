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

function JournalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Line({ text }: { text: string }) {
  return <Text style={s.freeLine}>{text}</Text>;
}

export default function ProfileTwoStepDemo() {
  const [step, setStep] = useState<1 | 2>(1);

  if (step === 1) {
    return (
      <View style={s.screen}>
        <View style={s.stage1}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.avatarFrame}>
                <Avatar {...DEFAULT_AVATAR} size={58} />
              </View>
              <View style={s.cardHeaderText}>
                <Text style={s.name}>Sophie, 28</Text>
                <Text style={s.vibe}>Romantique curieuse</Text>
                <Text style={s.city}>Paris</Text>
              </View>
            </View>

            <Text style={s.bio}>
              Je crois qu'on se comprend mieux autour d'un plat qu'on a cuisiné
              ensemble. J'aime les gens qui savent écrire une vraie phrase, rire
              un peu d'eux-mêmes, et rester quand la conversation devient
              intéressante.
            </Text>

            <Pressable onPress={() => setStep(2)} style={s.linkWrap}>
              <Text style={s.link}>Découvrir le profil →</Text>
            </Pressable>

            <View style={s.actions}>
              <Pressable style={s.btnBad}>
                <Text style={s.btnEmoji}>😬</Text>
                <Text style={s.btnText}>Grimace</Text>
              </Pressable>
              <Pressable style={s.btnNeutral}>
                <Text style={s.btnEmoji}>🚩</Text>
                <Text style={s.btnText}>Signaler</Text>
              </Pressable>
              <Pressable style={s.btnGood}>
                <Text style={s.btnEmoji}>😊</Text>
                <Text style={s.btnText}>Sourire</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.stage2}>
      <Pressable onPress={() => setStep(1)}>
        <Text style={s.back}>← Seconde chance</Text>
      </Pressable>

      <View style={s.detailHeader}>
        <View style={s.avatarFrameSmall}>
          <Avatar {...DEFAULT_AVATAR} size={44} />
        </View>
        <View>
          <Text style={s.detailName}>Sophie, 28</Text>
          <Text style={s.vibe}>Romantique curieuse</Text>
        </View>
      </View>

      <Text style={s.quote}>"Un mélange de sérieux et d'autodérision."</Text>

      <View style={s.highlight}>
        <Text style={s.highlightTitle}>Ce que je cherche ici</Text>
        <Text style={s.highlightText}>
          Quelqu'un avec qui écrire plus de 10 lettres sans disparaître.
          Une vraie histoire, pas juste un passage rapide.
        </Text>
      </View>

      <JournalSection title="Mon univers">
        <Line text="— Voyages lointains" />
        <Line text="— Cinéma d'auteur" />
        <Line text="— Cuisine du monde" />
      </JournalSection>

      <JournalSection title="Compétences (version fun)">
        <Line text="Communication — répond vraiment" />
        <Line text="Cuisine — maîtrise les pâtes" />
        <Line text="Organisation — procrastination pro" />
      </JournalSection>

      <JournalSection title="Mes petits + et −">
        <Line text="+ Douce" />
        <Line text="+ Attentionnée" />
        <Line text="− Têtue parfois" />
      </JournalSection>

      <JournalSection title="Comment je suis vraiment">
        <Line text="— Je ris facilement" />
        <Line text="— J'écoute vraiment" />
        <Line text="— Je me souviens des détails" />
      </JournalSection>

      <View style={s.journalCard}>
        <Text style={s.journalTitle}>Journée idéale</Text>
        <Text style={s.journalLine}>08:00 → café tranquille + émerger doucement</Text>
        <Text style={s.journalLine}>19:00 → rire avec quelqu'un (ou Netflix, soyons honnêtes)</Text>
        <Text style={s.journalLine}>23:00 → discuter jusqu'à oublier l'heure</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EFE3D3",
  },

  // ── PARTIE 1 ──────────────────────────────────────────────

  stage1: {
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },

  card: {
    backgroundColor: "#F6EBDD",
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 22,
    shadowColor: "#4A2C00",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },

  cardHeaderText: {
    flex: 1,
  },

  avatarFrame: {
    backgroundColor: "#FFF",
    padding: 6,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },

  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2B1E14",
    lineHeight: 26,
  },

  vibe: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#8A7763",
    marginTop: 3,
  },

  city: {
    fontSize: 13,
    color: "#A8917A",
    marginTop: 2,
  },

  bio: {
    fontSize: 20,
    lineHeight: 32,
    color: "#2B1E14",
    marginBottom: 20,
    letterSpacing: -0.2,
  },

  linkWrap: {
    marginBottom: 22,
  },

  link: {
    color: "#9C7A4D",
    fontSize: 15,
    fontWeight: "500",
  },

  actions: {
    flexDirection: "row",
    gap: 8,
  },

  btnBad: {
    flex: 1,
    backgroundColor: "#F1D9D9",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
  },

  btnNeutral: {
    flex: 1,
    backgroundColor: "#E9DFD2",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
  },

  btnGood: {
    flex: 1,
    backgroundColor: "#DDEADF",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
  },

  btnEmoji: {
    fontSize: 20,
    marginBottom: 3,
  },

  btnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2B1E14",
  },

  // ── PARTIE 2 ──────────────────────────────────────────────

  stage2: {
    padding: 18,
    paddingBottom: 48,
  },

  back: {
    color: "#8A7763",
    fontStyle: "italic",
    fontSize: 14,
    marginBottom: 22,
  },

  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
  },

  avatarFrameSmall: {
    backgroundColor: "#FFF",
    padding: 5,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  detailName: {
    fontSize: 19,
    fontWeight: "700",
    color: "#2B1E14",
  },

  quote: {
    fontSize: 18,
    fontStyle: "italic",
    color: "#5C4530",
    lineHeight: 29,
    marginBottom: 28,
    paddingLeft: 2,
  },

  highlight: {
    backgroundColor: "#E7D6C1",
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 18,
    marginBottom: 30,
  },

  highlightTitle: {
    fontSize: 16,
    fontStyle: "italic",
    fontWeight: "700",
    color: "#7A5C3E",
    marginBottom: 10,
  },

  highlightText: {
    fontSize: 16,
    lineHeight: 26,
    color: "#2B1E14",
  },

  section: {
    marginBottom: 26,
  },

  sectionTitle: {
    fontSize: 15,
    fontStyle: "italic",
    fontWeight: "600",
    color: "#7A5C3E",
    marginBottom: 10,
  },

  freeLine: {
    fontSize: 16,
    lineHeight: 27,
    color: "#2B1E14",
    marginBottom: 3,
  },

  journalCard: {
    backgroundColor: "#EAD7C2",
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderRadius: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#C89B5B",
    marginTop: 6,
  },

  journalTitle: {
    fontSize: 16,
    fontStyle: "italic",
    fontWeight: "700",
    color: "#7A5C3E",
    marginBottom: 14,
  },

  journalLine: {
    fontSize: 16,
    lineHeight: 28,
    color: "#2B1E14",
    fontStyle: "italic",
    marginBottom: 6,
  },
});
