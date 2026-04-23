import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useStore } from "../store/useStore";
import { Avatar } from "../avatar/png/Avatar";
import { DEFAULT_AVATAR } from "../avatar/png/defaults";

type Skill = {
  label: string;
  detail: string;
  score: number;
  emoji: string;
};

const PHYSIQUE_LABEL: Record<string, { emoji: string; label: string }> = {
  filiforme: { emoji: "🍝", label: "Filiforme" },
  ras_motte: { emoji: "🌱", label: "Ras motte" },
  grande_gigue: { emoji: "🦒", label: "Grande gigue" },
  costaud: { emoji: "🌳", label: "Costaud·e" },
  mignon: { emoji: "🍪", label: "Mignon·ne" },
  mysterieux: { emoji: "🕶️", label: "Mystérieux·se" },
  athletique: { emoji: "💪", label: "Athlétique" },
  doux: { emoji: "🧸", label: "Doux·ce" },
};

const LOOKING_FOR_LABEL: Record<string, string> = {
  relation: "Une vraie histoire",
  flirt: "Un peu de légèreté",
  amitie: "Des affinités d’abord",
  discussion: "Discuter pour voir",
  serieux: "Quelque chose de sérieux",
  RELATION: "Une vraie histoire",
  FLIRT: "Un peu de légèreté",
  AMITIE: "Des affinités d’abord",
  DISCUSSION: "Discuter pour voir",
  SERIEUX: "Quelque chose de sérieux",
};

const GENDER_DISPLAY: Record<string, string> = {
  F: "Femmes",
  M: "Hommes",
  NB: "Personnes non-binaires",
  FEMME: "Femmes",
  HOMME: "Hommes",
  AUTRE: "Autres",
};

function computeAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();

  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--;
  }

  return age >= 0 ? age : null;
}

function childrenLabel(
  hasChildren?: boolean | null,
  wantsChildren?: boolean | null
) {
  if (hasChildren === true && wantsChildren === true) {
    return "A des enfants · ouverte à en avoir d’autres";
  }
  if (hasChildren === true && wantsChildren === false) {
    return "A des enfants · n’en veut pas d’autres";
  }
  if (hasChildren === true && wantsChildren == null) {
    return "A des enfants";
  }
  if (hasChildren === false && wantsChildren === true) {
    return "Pas d’enfants · en veut un jour";
  }
  if (hasChildren === false && wantsChildren === false) {
    return "Pas d’enfants · n’en veut pas";
  }
  if (hasChildren === false && wantsChildren == null) {
    return "Pas d’enfants";
  }
  if (hasChildren == null && wantsChildren === true) {
    return "En veut un jour";
  }
  if (hasChildren == null && wantsChildren === false) {
    return "N’en veut pas";
  }
  return null;
}

function SkillRow({ skill }: { skill: Skill }) {
  const filled = Math.max(0, Math.min(5, Math.round((skill.score || 0) / 20)));

  return (
    <View style={styles.skillRow}>
      <View style={styles.skillLeft}>
        <Text style={styles.skillEmoji}>{skill.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.skillLabel}>{skill.label}</Text>
          <Text style={styles.skillDetail}>{skill.detail}</Text>
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
        <Text style={styles.skillScore}>{skill.score}%</Text>
      </View>
    </View>
  );
}

export default function ProfileTwoStepDemo() {
  const [isOpen, setIsOpen] = useState(false);

  const user = useStore((s) => s.currentUser);
  console.log("PROFILE_RENDER_USER", user);
  const avatarConfig = useMemo(
    () => user?.avatarConfig ?? DEFAULT_AVATAR,
    [user?.avatarConfig]
  );

  const age = user?.age ?? computeAge(user?.birthDate);
  const physique = user?.physicalDesc
    ? PHYSIQUE_LABEL[user.physicalDesc] ?? {
        emoji: "✨",
        label: user.physicalDesc,
      }
    : null;

  const interestedInLabel = (user?.interestedIn ?? [])
    .map((g) => GENDER_DISPLAY[g] ?? g)
    .join(" · ");

  const intentionSentence = (user?.lookingFor ?? [])
    .map((id) => LOOKING_FOR_LABEL[id] ?? id)
    .join(" · ");

  const childrenText = childrenLabel(user?.hasChildren, user?.wantsChildren);

  const identityTags = user?.identityTags ?? [];
  const interests = user?.interests ?? [];
  const qualities = user?.qualities ?? [];
  const defaults = user?.defaults ?? [];
  const idealDay = user?.idealDay ?? [];
  const skills = (user?.skills ?? []) as Skill[];

  const displayName = (user?.name ?? user?.pseudo ?? "").trim();
  const displayBio = (user?.bio ?? "").trim();
  const displayVibe = user?.vibe ?? "";
  const displayQuote = user?.quote ?? "";
  const displayCity = (user?.city ?? "").trim();
  const displayHeight = user?.height ? `${user.height} cm` : null;
  const headerLine = [displayName, age !== null ? String(age) : ""]
    .filter(Boolean)
    .join(", ");

  return (
    <View style={styles.screen}>
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
                <View style={styles.photoPin} />
                <Avatar size={96} {...avatarConfig} />
              </View>

              <View style={styles.stageOneHeaderText}>
                {!!headerLine && (
                  <Text style={styles.stageOneName}>{headerLine}</Text>
                )}

                {!!displayVibe && (
                  <Text style={styles.stageOneVibe}>{displayVibe}</Text>
                )}

                <View style={styles.arrowLineWrap}>
                  <Text style={styles.arrowLine}>⟵ 〜〜〜〜〜〜〜〜〜</Text>
                </View>

                {(displayCity || displayHeight || physique) ? (
                  <View style={styles.metaLine}>
                    {!!displayCity && (
                      <Text style={styles.metaInline}>{displayCity}</Text>
                    )}
                    {displayHeight ? (
                      <Text style={styles.metaInline}>
                        {displayCity ? " · " : ""}{displayHeight}
                      </Text>
                    ) : null}
                    {physique ? (
                      <Text style={styles.metaInline}>
                        {(displayCity || displayHeight) ? " · " : ""}{physique.emoji} {physique.label}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>

            {!!displayBio && (
              <Text style={styles.stageOneBlabla}>{displayBio}</Text>
            )}

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
            <View style={styles.spiralColumn}>
              {Array.from({ length: 14 }).map((_, i) => (
                <View key={i} style={styles.spiralRing} />
              ))}
            </View>

            <View style={styles.journalPage}>
              <View style={styles.journalHero}>
                <View style={styles.journalTitleWrap}>
                  <Text style={styles.journalMainTitle}>Mon journal</Text>
                  <Text style={styles.journalMainTitle}>de bord</Text>
                  <Text style={styles.journalUnderline}>________________</Text>
                  {!!displayQuote && (
                    <Text style={styles.journalQuote}>{displayQuote}</Text>
                  )}
                </View>

                <View style={styles.polaWrap}>
                  <View style={styles.polaTape} />
                  <View style={styles.polaFrame}>
                    <Avatar size={86} {...avatarConfig} />
                  </View>
                  {!!headerLine && (
                    <Text style={styles.polaCaption}>
                      {headerLine}
                    </Text>
                  )}
                </View>
              </View>

              {!!identityTags.length && (
                <View style={styles.identitySection}>
                  <Text style={styles.kicker}>FICHE D'IDENTITÉ</Text>
                  <View style={styles.identityTagsWrap}>
                    {identityTags.map((tag) => (
                      <View key={tag} style={styles.identityChip}>
                        <Text style={styles.identityChipText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {!!intentionSentence && (
                <View style={styles.paperSection}>
                  <Text style={styles.kicker}>INTENTION</Text>
                  <View style={styles.intentNote}>
                    <Text style={styles.intentText}>{intentionSentence}</Text>
                    <View style={styles.heartFloat}>
                      <Text style={styles.heartFloatText}>♡</Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.paperSection}>
                <Text style={styles.kicker}>JE CHERCHE</Text>

                {!!interestedInLabel && (
                  <View style={styles.identityMetaLine}>
                    <Text style={styles.identityMetaLabel}>Intéressé par :</Text>
                    <Text style={styles.identityMetaValue}>{interestedInLabel}</Text>
                  </View>
                )}

                {!!interests.length && (
                  <View style={styles.interestsWrap}>
                    {interests.map((interest) => (
                      <View key={interest} style={styles.interestChip}>
                        <Text style={styles.interestChipText}>{interest}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {(displayCity || displayHeight || physique || childrenText) && (
                <View style={styles.paperSection}>
                  <Text style={styles.kicker}>EN PRATIQUE</Text>

                  <View style={styles.practicalCard}>
                    {!!displayCity && (
                      <Text style={styles.practicalLine}>📍 {displayCity}</Text>
                    )}
                    {displayHeight ? (
                      <Text style={styles.practicalLine}>📏 {displayHeight}</Text>
                    ) : null}
                    {physique ? (
                      <Text style={styles.practicalLine}>
                        {physique.emoji} {physique.label}
                      </Text>
                    ) : null}
                    {childrenText ? (
                      <Text style={styles.practicalLine}>👶 {childrenText}</Text>
                    ) : null}
                  </View>
                </View>
              )}

              {!!skills.length && (
                <View style={styles.paperSection}>
                  <Text style={styles.kicker}>COMPÉTENCES (CV version fun)</Text>
                  <View style={styles.skillsCard}>
                    {skills.map((skill, index) => (
                      <View key={`${skill.label}-${index}`}>
                        <SkillRow skill={skill} />
                        {index < skills.length - 1 ? (
                          <View style={styles.skillDivider} />
                        ) : null}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {(qualities.length > 0 || defaults.length > 0) && (
                <View style={styles.paperSection}>
                  <Text style={styles.kicker}>QUALITÉS & DÉFAUTS</Text>

                  <View style={styles.qualitiesRow}>
                    {!!qualities.length && (
                      <View style={styles.miniCard}>
                        {qualities.map((item) => (
                          <View key={item} style={styles.bulletRow}>
                            <Text style={styles.goodBullet}>✓</Text>
                            <Text style={styles.bulletText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {!!defaults.length && (
                      <View style={styles.miniCard}>
                        {defaults.map((item) => (
                          <View key={item} style={styles.bulletRow}>
                            <Text style={styles.badBullet}>✕</Text>
                            <Text style={styles.bulletText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}

              {!!idealDay.length && (
                <View style={styles.paperSection}>
                  <Text style={styles.kicker}>JOURNÉE IDÉALE</Text>

                  <View style={styles.idealDayCard}>
                    <View style={styles.tapeTape} />
                    {idealDay.map((line) => (
                      <Text key={line} style={styles.idealDayLine}>
                        {line}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const BG = "#ECE3D4";
const PAPER = "#F6EEDF";
const PAPER_2 = "#F3E7D7";
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
    paddingVertical: 18,
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
    marginBottom: 14,
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
    marginBottom: 18,
  },

  photoCard: {
    width: 126,
    height: 156,
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

  photoPin: {
    position: "absolute",
    top: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#9D695D",
  },

  stageOneHeaderText: {
    flex: 1,
    paddingTop: 4,
  },

  stageOneName: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "800",
    color: INK,
    marginBottom: 8,
  },

  stageOneVibe: {
    fontSize: 18,
    color: INK_SOFT,
    fontStyle: "italic",
    marginBottom: 10,
  },

  arrowLineWrap: {
    marginTop: 4,
    marginBottom: 8,
  },

  arrowLine: {
    fontSize: 14,
    color: "#B29077",
    letterSpacing: 1,
  },

  metaLine: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  metaInline: {
    fontSize: 15,
    color: INK_SOFT,
  },

  stageOneBlabla: {
    fontSize: 26,
    lineHeight: 43,
    color: INK,
    marginBottom: 18,
    letterSpacing: -0.2,
  },

  discoverWrap: {
    alignSelf: "flex-start",
    marginBottom: 18,
  },

  discoverLink: {
    fontSize: 18,
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
    paddingVertical: 16,
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
    fontSize: 17,
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
    flexDirection: "row",
    alignItems: "stretch",
  },

  spiralColumn: {
    width: 18,
    alignItems: "center",
    paddingTop: 16,
    marginRight: 6,
  },

  spiralRing: {
    width: 10,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#3C2A20",
    marginBottom: 10,
  },

  journalPage: {
    flex: 1,
    backgroundColor: PAPER,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E3D3BC",
    paddingHorizontal: 18,
    paddingVertical: 18,
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
    marginBottom: 20,
  },

  journalTitleWrap: {
    flex: 1,
    paddingRight: 12,
  },

  journalMainTitle: {
    fontSize: 32,
    lineHeight: 36,
    color: INK,
    fontWeight: "700",
  },

  journalUnderline: {
    fontSize: 16,
    color: "#A98668",
    marginTop: -6,
    marginBottom: 10,
  },

  journalQuote: {
    fontSize: 18,
    lineHeight: 30,
    color: INK_SOFT,
    fontStyle: "italic",
    maxWidth: 210,
  },

  polaWrap: {
    width: 118,
    alignItems: "center",
    marginTop: 4,
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
    fontSize: 18,
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
    gap: 10,
  },

  identityChip: {
    backgroundColor: PAPER_3,
    borderWidth: 1,
    borderColor: "#DECDB5",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  identityChipText: {
    fontSize: 15,
    color: INK_SOFT,
    fontWeight: "600",
  },

  intentNote: {
    backgroundColor: "#F3E2C7",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "#E1CBA8",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
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

  practicalCard: {
    backgroundColor: PAPER_2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2D1BA",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  practicalLine: {
    fontSize: 16,
    color: INK,
    marginBottom: 8,
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

  skillDivider: {
    height: 1,
    backgroundColor: "#E8D9C6",
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
    flex: 1,
  },

  idealDayCard: {
    backgroundColor: "#F0DBD9",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2C9C5",
    paddingHorizontal: 18,
    paddingVertical: 18,
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
    fontSize: 17,
    lineHeight: 30,
    color: INK,
    marginBottom: 6,
  },

});
