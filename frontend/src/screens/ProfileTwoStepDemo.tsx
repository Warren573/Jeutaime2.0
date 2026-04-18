import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { Avatar } from "../avatar/png/Avatar";
import { DEFAULT_AVATAR } from "../avatar/png/defaults";

type ProfileData = {
  firstName: string;
  age: number;
  city: string;
  vibe: string;
  blabla: string;
  whatIWant: string;
  interestedIn: string;
  interests: string[];
  universe: string[];
  skills: string[];
  plusMinus: string[];
  trueSelf: string[];
  idealDay: string[];
};

const MOCK_PROFILE: ProfileData = {
  firstName: "Sophie",
  age: 28,
  city: "Paris",
  vibe: "Romantique curieuse",
  blabla:
    "Je crois qu'on se comprend mieux autour d'un plat qu'on a cuisiné ensemble. J'aime les gens qui savent écrire une vraie phrase, rire un peu d'eux-mêmes, et rester quand la conversation devient intéressante.",
  whatIWant:
    "Quelqu’un avec qui écrire plus de 10 lettres sans disparaître. Une vraie histoire, pas juste un passage rapide.",
  interestedIn: "Hommes",
  interests: ["Voyages", "Cinéma", "Cuisine", "Écriture", "Lectrice"],
  universe: [
    "Voyages lointains",
    "Cinéma d'auteur",
    "Cuisine du monde",
  ],
  skills: [
    "Romantique : niveau dangereux",
    "Curieuse : je pose trop de questions",
    "Animal totem : 🐰 Lapin",
  ],
  plusMinus: [
    "Douce",
    "Rêveuse",
    "Têtue quand j’y crois vraiment",
  ],
  trueSelf: [
    "Je ris facilement",
    "J’écoute vraiment",
    "Je me souviens des détails",
  ],
  idealDay: [
    "08:00 → café tranquille + émerger doucement",
    "19:00 → rire avec quelqu’un (ou Netflix, soyons honnêtes)",
    "23:00 → discuter jusqu’à oublier l’heure",
  ],
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function FreeSection({
  title,
  items,
  hideDivider = false,
}: {
  title: string;
  items: string[];
  hideDivider?: boolean;
}) {
  return (
    <View style={[styles.freeSection, hideDivider && styles.freeSectionNoBorder]}>
      <SectionTitle>{title}</SectionTitle>
      {items.map((item) => (
        <Text key={item} style={styles.freeLine}>
          — {item}
        </Text>
      ))}
    </View>
  );
}

function SoftCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.softCard}>
      <Text style={styles.softCardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InterestPill({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

export default function ProfileTwoStepDemo() {
  const [showDetails, setShowDetails] = useState(false);

  const profile = useMemo(() => MOCK_PROFILE, []);

  const handleGrimace = () => {
    console.log("grimace");
  };

  const handleReport = () => {
    console.log("report");
  };

  const handleSmile = () => {
    console.log("smile");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {!showDetails ? (
        <View style={styles.stageOneScreen}>
          <ScrollView contentContainerStyle={styles.stageOneContent}>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.heroAvatarWrap}>
                  <Avatar size={62} {...DEFAULT_AVATAR} />
                </View>

                <View style={styles.heroMeta}>
                  <Text style={styles.heroName}>
                    {profile.firstName}, {profile.age}
                  </Text>
                  <Text style={styles.heroSub}>
                    {profile.city} · {profile.vibe}
                  </Text>
                </View>
              </View>

              <Text style={styles.heroBlabla}>{profile.blabla}</Text>

              <Pressable
                style={styles.discoverLinkWrap}
                onPress={() => setShowDetails(true)}
              >
                <Text style={styles.discoverLink}>Découvrir le profil →</Text>
              </Pressable>

              <View style={styles.actionsRow}>
                <Pressable style={styles.actionGhost} onPress={handleGrimace}>
                  <Text style={styles.actionGhostText}>😬 Grimace</Text>
                </Pressable>

                <Pressable style={styles.actionNeutral} onPress={handleReport}>
                  <Text style={styles.actionNeutralText}>🚩 Signaler</Text>
                </Pressable>

                <Pressable style={styles.actionPrimary} onPress={handleSmile}>
                  <Text style={styles.actionPrimaryText}>😊 Sourire</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      ) : (
        <View style={styles.stageTwoScreen}>
          <ScrollView contentContainerStyle={styles.stageTwoContent}>
            <Pressable onPress={() => setShowDetails(false)}>
              <Text style={styles.backLink}>← Seconde chance</Text>
            </Pressable>

            <View style={styles.detailHeader}>
              <View style={styles.detailAvatarWrap}>
                <Avatar size={50} {...DEFAULT_AVATAR} />
              </View>
              <View style={styles.detailHeaderText}>
                <Text style={styles.detailName}>
                  {profile.firstName}, {profile.age}
                </Text>
                <Text style={styles.detailVibe}>{profile.vibe}</Text>
              </View>
            </View>

            <FreeSection title="Mon univers" items={profile.universe} />

            <FreeSection
              title="Ce que je gère (plus ou moins bien)"
              items={profile.skills}
            />

            <FreeSection
              title="Mes petits + et mes petits −"
              items={profile.plusMinus}
              hideDivider
            />

            <View style={styles.interestsSection}>
              <Text style={styles.interestsTitle}>Ce que j’aime</Text>
              <View style={styles.pillsRow}>
                {profile.interests.map((item) => (
                  <InterestPill key={item} label={item} />
                ))}
              </View>
            </View>

            <SoftCard title="Ce que je cherche ici">
              <Text style={styles.softCardText}>{profile.whatIWant}</Text>
              <View style={styles.metaLine}>
                <Text style={styles.metaLabel}>Intéressé par :</Text>
                <Text style={styles.metaValue}>{profile.interestedIn}</Text>
              </View>
            </SoftCard>

            <FreeSection
              title="Comment je suis vraiment"
              items={profile.trueSelf}
            />

            <View style={styles.journalCard}>
              <Text style={styles.journalTitle}>Journée idéale</Text>
              {profile.idealDay.map((line) => (
                <Text key={line} style={styles.journalLine}>
                  {line}
                </Text>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const BG = "#E9DFC5";
const PAPER = "#F7F0DD";
const PAPER_SOFT = "#F3EAD4";
const INK = "#2C1A0E";
const INK_SOFT = "#7D5A36";
const LINE = "#D6C7A5";
const GOLD = "#D9B56D";
const RED = "#B4574E";
const GREEN = "#5F8B68";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },

  stageOneScreen: {
    flex: 1,
    backgroundColor: BG,
  },

  stageOneContent: {
    padding: 16,
    paddingBottom: 28,
    justifyContent: "center",
    flexGrow: 1,
  },

  heroCard: {
    backgroundColor: PAPER,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: LINE,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  heroAvatarWrap: {
    width: 74,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  heroMeta: {
    flex: 1,
    paddingLeft: 8,
  },

  heroName: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    color: INK,
    marginBottom: 6,
  },

  heroSub: {
    fontSize: 15,
    color: INK_SOFT,
    fontStyle: "italic",
  },

  heroBlabla: {
    fontSize: 26,
    lineHeight: 40,
    color: INK,
    marginBottom: 20,
    letterSpacing: -0.2,
  },

  discoverLinkWrap: {
    alignSelf: "flex-start",
    marginBottom: 22,
  },

  discoverLink: {
    fontSize: 16,
    color: INK_SOFT,
    fontWeight: "600",
  },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  actionGhost: {
    flex: 1,
    backgroundColor: "#F7E9E7",
    borderWidth: 1,
    borderColor: "#E4C0BC",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },

  actionGhostText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#8E4C45",
  },

  actionNeutral: {
    flex: 1,
    backgroundColor: "#F5F1E8",
    borderWidth: 1,
    borderColor: "#DED2BE",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },

  actionNeutralText: {
    fontSize: 15,
    fontWeight: "700",
    color: INK_SOFT,
  },

  actionPrimary: {
    flex: 1,
    backgroundColor: "#EAF5EA",
    borderWidth: 1,
    borderColor: "#C7DECA",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },

  actionPrimaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: GREEN,
  },

  stageTwoScreen: {
    flex: 1,
    backgroundColor: BG,
  },

  stageTwoContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 30,
  },

  backLink: {
    fontSize: 14,
    color: INK_SOFT,
    fontStyle: "italic",
    marginBottom: 14,
  },

  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  detailAvatarWrap: {
    width: 64,
    alignItems: "flex-start",
  },

  detailHeaderText: {
    flex: 1,
    paddingLeft: 8,
  },

  detailName: {
    fontSize: 22,
    fontWeight: "800",
    color: INK,
    marginBottom: 5,
  },

  detailVibe: {
    fontSize: 16,
    color: INK_SOFT,
    fontStyle: "italic",
  },

  freeSection: {
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },

  freeSectionNoBorder: {
    borderBottomWidth: 0,
    paddingBottom: 0,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 16,
    color: INK_SOFT,
    fontStyle: "italic",
    fontWeight: "700",
    marginBottom: 12,
  },

  freeLine: {
    fontSize: 17,
    lineHeight: 30,
    color: INK,
    marginBottom: 2,
  },

  interestsSection: {
    marginBottom: 28,
    alignItems: "center",
  },

  interestsTitle: {
    fontSize: 15,
    color: INK_SOFT,
    fontStyle: "italic",
    fontWeight: "700",
    marginBottom: 12,
  },

  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },

  pill: {
    backgroundColor: PAPER,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  pillText: {
    fontSize: 14,
    color: "#4E3726",
    fontWeight: "600",
  },

  softCard: {
    backgroundColor: PAPER,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: LINE,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  softCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#5A3823",
    marginBottom: 10,
  },

  softCardText: {
    fontSize: 17,
    lineHeight: 29,
    color: INK,
    marginBottom: 14,
  },

  metaLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },

  metaLabel: {
    fontSize: 14,
    color: INK_SOFT,
  },

  metaValue: {
    fontSize: 14,
    color: INK,
    fontWeight: "700",
  },

  journalCard: {
    backgroundColor: PAPER_SOFT,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
    marginTop: 6,
  },

  journalTitle: {
    fontSize: 18,
    color: "#8B6033",
    fontStyle: "italic",
    fontWeight: "700",
    marginBottom: 14,
  },

  journalLine: {
    fontSize: 17,
    lineHeight: 31,
    color: INK,
    fontStyle: "italic",
    marginBottom: 6,
  },
});e
