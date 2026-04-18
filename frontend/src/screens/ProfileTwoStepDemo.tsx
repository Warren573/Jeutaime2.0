import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "../avatar/png/Avatar";
import { DEFAULT_AVATAR } from "../avatar/png/defaults";

type ProfileData = {
  firstName: string;
  age: number;
  city: string;
  vibe: string;
  blabla: string;
  quote: string;
  interestedIn: string;
  lookingFor: string;
  identityTags: string[];
  interests: string[];
  skills: Array<{ label: string; detail: string; score: number; emoji: string }>;
  qualities: string[];
  defaults: string[];
  idealDay: string[];
};

const MOCK_PROFILE: ProfileData = {
  firstName: "Sophie",
  age: 28,
  city: "Paris",
  vibe: "Romantique curieuse",
  blabla:
    "Je crois qu'on se comprend mieux autour d'un plat qu'on a cuisiné ensemble. J'aime les gens qui savent écrire une vraie phrase, rire un peu d'eux-mêmes, et rester quand la conversation devient intéressante.",
  quote: "Un mélange de sérieux et d'autodérision.",
  interestedIn: "Hommes",
  lookingFor:
    "Quelqu'un avec qui écrire plus de 10 lettres sans disparaître. Une vraie histoire, pas juste un passage rapide.",
  identityTags: ["Curieuse", "Ambitieuse", "Un peu bordélique", "Grande romantique"],
  interests: ["Cinéma", "Café", "Écriture", "Jeux", "Voyages"],
  skills: [
    {
      emoji: "💬",
      label: "Communication",
      detail: "répond vraiment (incroyable)",
      score: 80,
    },
    {
      emoji: "🍝",
      label: "Cuisine",
      detail: "maîtrise les pâtes (et Uber Eats)",
      score: 72,
    },
    {
      emoji: "🎯",
      label: "Organisation",
      detail: "pro dans la procrastination",
      score: 58,
    },
    {
      emoji: "🌿",
      label: "Relationnel",
      detail: "peut s'attacher trop vite",
      score: 88,
    },
  ],
  qualities: ["Drôle", "Attentionnée", "Loyale"],
  defaults: ["Têtue", "Oublie de répondre", "Achète trop de trucs"],
  idealDay: [
    "07:00   café + guerre contre mon lit",
    "19:00   sortir ou Netflix (selon motivation)",
    "00:00   pensées existentielles et lettres",
  ],
};

function IdentityChip({ label }: { label: string }) {
  return (
    <View style={styles.identityChip}>
      <Text style={styles.identityChipText}>{label}</Text>
    </View>
  );
}

function InterestChip({ label }: { label: string }) {
  return (
    <View style={styles.interestChip}>
      <Text style={styles.interestChipText}>{label}</Text>
    </View>
  );
}

function SkillRow({
  emoji,
  label,
  detail,
  score,
}: {
  emoji: string;
  label: string;
  detail: string;
  score: number;
}) {
  const filled = Math.round(score / 20);
  return (
    <View style={styles.skillRow}>
      <View style={styles.skillLeft}>
        <Text style={styles.skillEmoji}>{emoji}</Text>
        <View style={styles.skillTextWrap}>
          <Text style={styles.skillLabel}>{label}</Text>
          <Text style={styles.skillDetail}>{detail}</Text>
        </View>
      </View>

      <View style={styles.skillRight}>
        <View style={styles.skillDots}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[
                styles.skillDot,
                i < filled ? styles.skillDotFilled : styles.skillDotEmpty,
              ]}
            />
          ))}
        </View>
        <Text style={styles.skillScore}>{score}%</Text>
      </View>
    </View>
  );
}

export default function ProfilesScreen() {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);

  const profile = useMemo(() => MOCK_PROFILE, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {!isOpen ? (
        <ScrollView contentContainerStyle={styles.stageOneContent}>
          <View style={styles.stageOneCard}>
            <View style={styles.topBar}>
              <Text style={styles.topBarTitle}>Mon profil</Text>
              <View style={styles.settingsBadge}>
                <Text style={styles.settingsBadgeText}>⚙</Text>
              </View>
            </View>

            <View style={styles.stageOneHeader}>
              <View style={styles.photoCard}>
                <View style={styles.photoTape} />
                <Avatar size={96} {...DEFAULT_AVATAR} />
              </View>

              <View style={styles.stageOneHeaderText}>
                <Text style={styles.stageOneName}>
                  {profile.firstName}, {profile.age}
                </Text>

                <Text style={styles.stageOneVibe}>{profile.vibe}</Text>

                <View style={styles.arrowLineWrap}>
                  <Text style={styles.arrowLine}>⟵ 〜〜〜〜〜〜〜〜〜</Text>
                </View>
              </View>
            </View>

            <Text style={styles.stageOneBlabla}>{profile.blabla}</Text>

            <Pressable onPress={() => setIsOpen(true)} style={styles.discoverWrap}>
              <Text style={styles.discoverLink}>Découvrir le profil →</Text>
            </Pressable>

            <View style={styles.stageOneActions}>
              <Pressable style={[styles.actionButton, styles.actionBad]}>
                <Text style={styles.actionText}>😬 Grimace</Text>
              </Pressable>

              <Pressable style={[styles.actionButton, styles.actionNeutral]}>
                <Text style={styles.actionText}>🚩 Signaler</Text>
              </Pressable>

              <Pressable style={[styles.actionButton, styles.actionGood]}>
                <Text style={styles.actionText}>😊 Sourire</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.stageTwoContent}>
          <Pressable onPress={() => setIsOpen(false)}>
            <Text style={styles.backLink}>← Seconde chance</Text>
          </Pressable>

          <View style={styles.journalShell}>
            <View style={styles.journalPage}>
              <View style={styles.journalHero}>
                <View style={styles.journalTitleWrap}>
                  <Text style={styles.journalMainTitle}>Mon journal</Text>
                  <Text style={styles.journalMainTitle}>de bord</Text>
                  <Text style={styles.journalUnderline}>________________</Text>
                  <Text style={styles.journalQuote}>{profile.quote}</Text>
                </View>

                <View style={styles.polaWrap}>
                  <View style={styles.polaTape} />
                  <View style={styles.polaFrame}>
                    <Avatar size={86} {...DEFAULT_AVATAR} />
                  </View>
                  <Text style={styles.polaCaption}>
                    {profile.firstName}, {profile.age}
                  </Text>
                </View>
              </View>

              <View style={styles.identitySection}>
                <Text style={styles.kicker}>FICHE D'IDENTITÉ</Text>
                <View style={styles.identityTagsWrap}>
                  {profile.identityTags.map((tag) => (
                    <IdentityChip key={tag} label={tag} />
                  ))}
                </View>
              </View>

              <View style={styles.paperSection}>
                <Text style={styles.kicker}>INTENTION</Text>
                <View style={styles.intentNote}>
                  <Text style={styles.intentText}>{profile.lookingFor}</Text>
                  <View style={styles.heartFloat}>
                    <Text style={styles.heartFloatText}>♡</Text>
                  </View>
                </View>
              </View>

              <View style={styles.paperSection}>
                <Text style={styles.kicker}>JE CHERCHE</Text>
                <View style={styles.identityMetaLine}>
                  <Text style={styles.identityMetaLabel}>Intéressé par :</Text>
                  <Text style={styles.identityMetaValue}>{profile.interestedIn}</Text>
                </View>

                <View style={styles.interestsWrap}>
                  {profile.interests.map((interest) => (
                    <InterestChip key={interest} label={interest} />
                  ))}
                </View>
              </View>

              <View style={styles.paperSection}>
                <Text style={styles.kicker}>COMPÉTENCES (CV version fun)</Text>

                <View style={styles.skillsCard}>
                  {profile.skills.map((skill) => (
                    <SkillRow
                      key={skill.label}
                      emoji={skill.emoji}
                      label={skill.label}
                      detail={skill.detail}
                      score={skill.score}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.paperSection}>
                <Text style={styles.kicker}>QUALITÉS & DÉFAUTS</Text>

                <View style={styles.qualitiesRow}>
                  <View style={styles.miniCard}>
                    {profile.qualities.map((item) => (
                      <View key={item} style={styles.bulletRow}>
                        <Text style={styles.goodBullet}>✓</Text>
                        <Text style={styles.bulletText}>{item}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.miniCard}>
                    {profile.defaults.map((item) => (
                      <View key={item} style={styles.bulletRow}>
                        <Text style={styles.badBullet}>✕</Text>
                        <Text style={styles.bulletText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.paperSection}>
                <Text style={styles.kicker}>JOURNÉE IDÉALE</Text>

                <View style={styles.idealDayCard}>
                  <View style={styles.tapeTape} />
                  {profile.idealDay.map((line) => (
                    <Text key={line} style={styles.idealDayLine}>
                      {line}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const BG = "#ECE3D4";
const PAPER = "#F6EEDF";
const PAPER_3 = "#F7EFE2";
const INK = "#2B1B12";
const INK_SOFT = "#7C5A43";
const LINE = "#D9C7AA";
const GOLD = "#D7B26A";
const GREEN = "#6F9B74";
const RED = "#BE6B63";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },

  stageOneContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    paddingTop: 10,
  },

  stageOneCard: {
    backgroundColor: PAPER,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: LINE,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  topBarTitle: {
    fontSize: 17,
    color: INK,
    fontWeight: "700",
  },

  settingsBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E8DDCE",
    alignItems: "center",
    justifyContent: "center",
  },

  settingsBadgeText: {
    fontSize: 16,
    color: INK_SOFT,
  },

  stageOneHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },

  photoCard: {
    width: 112,
    height: 138,
    borderRadius: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E6D8C2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },

  photoTape: {
    position: "absolute",
    top: -8,
    left: 30,
    width: 52,
    height: 16,
    backgroundColor: "#E8D8BE",
    borderRadius: 3,
    opacity: 0.88,
    transform: [{ rotate: "-4deg" }],
    zIndex: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },

  stageOneHeaderText: {
    flex: 1,
    paddingTop: 4,
  },

  stageOneName: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "800",
    color: INK,
    marginBottom: 5,
  },

  stageOneVibe: {
    fontSize: 14,
    color: INK_SOFT,
    fontStyle: "italic",
    marginBottom: 6,
  },

  arrowLineWrap: {
    marginTop: 4,
  },

  arrowLine: {
    fontSize: 14,
    color: "#B29077",
    letterSpacing: 1,
  },

  stageOneBlabla: {
    fontSize: 16,
    lineHeight: 26,
    color: INK,
    marginBottom: 14,
    letterSpacing: -0.1,
  },

  discoverWrap: {
    alignSelf: "flex-start",
    marginBottom: 12,
  },

  discoverLink: {
    fontSize: 15,
    color: "#9C7A4D",
    fontWeight: "600",
  },

  stageOneActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  actionButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },

  actionBad: {
    backgroundColor: "#F3DEDF",
    borderColor: "#E3C2C5",
  },

  actionNeutral: {
    backgroundColor: "#EEE5D8",
    borderColor: "#DDD1BF",
  },

  actionGood: {
    backgroundColor: "#DFEEE1",
    borderColor: "#C7DDCB",
  },

  actionText: {
    fontSize: 15,
    color: INK,
    fontWeight: "700",
  },

  stageTwoContent: {
    paddingHorizontal: 16,
    paddingBottom: 34,
    paddingTop: 8,
  },

  backLink: {
    fontSize: 16,
    color: INK_SOFT,
    fontStyle: "italic",
    marginBottom: 10,
  },

  journalShell: {
    flex: 1,
  },

  journalPage: {
    flex: 1,
    backgroundColor: PAPER,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E3D3BC",
    paddingHorizontal: 18,
    paddingVertical: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },

  journalHero: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 26,
  },

  journalTitleWrap: {
    flex: 1,
    paddingRight: 14,
  },

  journalMainTitle: {
    fontSize: 30,
    lineHeight: 38,
    color: INK,
    fontWeight: "700",
  },

  journalUnderline: {
    fontSize: 16,
    color: "#A98668",
    marginTop: -4,
    marginBottom: 14,
  },

  journalQuote: {
    fontSize: 16,
    lineHeight: 26,
    color: INK_SOFT,
    fontStyle: "italic",
  },

  polaWrap: {
    width: 112,
    alignItems: "center",
    marginTop: 6,
  },

  polaTape: {
    position: "absolute",
    top: -6,
    width: 38,
    height: 14,
    backgroundColor: "#E7D5BF",
    borderRadius: 2,
    transform: [{ rotate: "-8deg" }],
    zIndex: 3,
  },

  polaFrame: {
    width: 106,
    height: 126,
    backgroundColor: "#FFF",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E7DAC8",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },

  polaCaption: {
    marginTop: 6,
    fontSize: 14,
    color: INK_SOFT,
    fontStyle: "italic",
  },

  paperSection: {
    marginBottom: 22,
  },

  kicker: {
    fontSize: 15,
    color: INK,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 12,
  },

  identitySection: {
    marginBottom: 18,
  },

  identityTagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  identityChip: {
    backgroundColor: PAPER_3,
    borderWidth: 1,
    borderColor: "#DECDB5",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },

  identityChipText: {
    fontSize: 13,
    color: INK_SOFT,
    fontWeight: "600",
  },

  intentNote: {
    backgroundColor: "#F3E2C7",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#E1CBA8",
    borderLeftWidth: 4,
    borderLeftColor: "#C4906A",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  intentText: {
    fontSize: 18,
    lineHeight: 32,
    color: INK,
    maxWidth: "88%",
  },

  heartFloat: {
    position: "absolute",
    right: 14,
    bottom: 10,
  },

  heartFloatText: {
    fontSize: 28,
    color: "#A97169",
  },

  identityMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 14,
  },

  identityMetaLabel: {
    fontSize: 17,
    color: INK_SOFT,
    marginRight: 8,
  },

  identityMetaValue: {
    fontSize: 18,
    color: INK,
    fontWeight: "800",
  },

  interestsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  interestChip: {
    backgroundColor: "#F4EBDD",
    borderWidth: 1,
    borderColor: "#DCCBB0",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  interestChipText: {
    fontSize: 15,
    color: INK,
    fontWeight: "600",
  },

  skillsCard: {
    backgroundColor: PAPER_3,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2D3BE",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },

  skillRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E8D9C6",
  },

  skillLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },

  skillEmoji: {
    fontSize: 22,
    marginRight: 10,
  },

  skillTextWrap: {
    flex: 1,
  },

  skillLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: INK,
    marginBottom: 2,
  },

  skillDetail: {
    fontSize: 14,
    color: INK_SOFT,
  },

  skillRight: {
    alignItems: "flex-end",
  },

  skillDots: {
    flexDirection: "row",
    marginBottom: 4,
  },

  skillDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 4,
  },

  skillDotFilled: {
    backgroundColor: GOLD,
  },

  skillDotEmpty: {
    backgroundColor: "#E8DACA",
  },

  skillScore: {
    fontSize: 14,
    fontWeight: "700",
    color: INK_SOFT,
  },

  qualitiesRow: {
    flexDirection: "row",
    gap: 12,
  },

  miniCard: {
    flex: 1,
    backgroundColor: PAPER_3,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E0D1BC",
    padding: 14,
  },

  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  goodBullet: {
    fontSize: 17,
    color: GREEN,
    marginRight: 8,
    fontWeight: "800",
  },

  badBullet: {
    fontSize: 17,
    color: RED,
    marginRight: 8,
    fontWeight: "800",
  },

  bulletText: {
    fontSize: 16,
    color: INK,
  },

  idealDayCard: {
    backgroundColor: "#F0DBD9",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2C9C5",
    paddingHorizontal: 18,
    paddingVertical: 20,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  tapeTape: {
    position: "absolute",
    right: 20,
    top: -8,
    width: 42,
    height: 16,
    backgroundColor: "#E8D8C2",
    borderRadius: 2,
    transform: [{ rotate: "8deg" }],
  },

  idealDayLine: {
    fontSize: 16,
    lineHeight: 36,
    color: "#3A2410",
    fontStyle: "italic",
    marginBottom: 2,
  },
});
