/**
 * HomeScreen — La Une
 * Style : Journal Moderne Romantique
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';

const J = {
  bgMain:          '#F5F1E8',
  bgCard:          '#FFFFFF',
  bgSoft:          '#EAE4D8',
  textMain:        '#2B2B2B',
  textSecondary:   '#6B6B6B',
  accentPrimary:   '#8B2E3C',
  accentSecondary: '#C9A96E',
  accentLight:     '#E8CFCF',
  borderSoft:      '#D8D2C4',
};

// Petit avatar initiales, coins arrondis (style journal)
const Avatar = ({ name, size = 42 }: { name: string; size?: number }) => {
  const palette = ['#C9A96E', '#8B2E3C', '#6B8B5E', '#4A6B8B', '#8B6B4A'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const bg       = palette[Math.abs(hash) % palette.length];
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <View style={{ width: size, height: size, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
};

export default function HomeScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const {
    currentUser,
    coins,
    points,
    matches,
    letters,
    getCurrentTitle,
    pet,
  } = useStore();
  const screenBg = useStore(s => s.screenBackgrounds?.['home'] ?? J.bgMain);
  const title    = getCurrentTitle();

  // Dernière lettre reçue
  const lastReceived = [...letters]
    .sort((a, b) => b.createdAt - a.createdAt)
    .find(l => l.toUserId === (currentUser?.id || 'me'));

  // Lettres non lues
  const unreadCount = letters.filter(
    l => l.toUserId === (currentUser?.id || 'me') && !l.readAt,
  ).length;

  // Fil d'activité
  const activityFeed = [
    pet
      ? `${pet.petName} attend que tu t'en occupes. 🍖 ${Math.round(pet.stats.hunger)}% · 😄 ${Math.round(pet.stats.happiness)}%`
      : 'Le Café de Paris vous attend — nouveau salon ouvert.',
    matches.length > 0
      ? `${matches.length} correspondance${matches.length > 1 ? 's' : ''} active${matches.length > 1 ? 's' : ''} dans ta boîte.`
      : 'Aucune correspondance pour l\'instant — explorez les profils.',
    'Activités disponibles : Jeu de Cartes, Histoire, Bouteille à la Mer.',
  ];

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Manchette ─────────────────────────────────────────── */}
        <View style={styles.masthead}>
          <Text style={styles.kicker}>JEUTAIME</Text>
          <Text style={styles.heroTitle}>La Une</Text>
          <Text style={styles.heroSub}>Journal moderne romantique</Text>
          <View style={styles.mastheadRule} />
          <View style={styles.mastheadFooter}>
            <Text style={styles.mastheadMeta}>
              {currentUser?.name || 'Joueur'} · {title.emoji} {title.title}
            </Text>
            <Text style={styles.mastheadMeta}>💰 {coins}</Text>
          </View>
        </View>

        {/* ── Nouvelle lettre ───────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>NOUVELLE LETTRE</Text>
          <View style={styles.featureRow}>
            <View style={styles.iconBox}>
              <Text style={styles.iconEmoji}>✉️</Text>
            </View>
            <View style={{ flex: 1 }}>
              {lastReceived ? (
                <>
                  <Text style={styles.featureTitle}>{lastReceived.fromUserId} t'a écrit</Text>
                  <Text style={styles.featureText} numberOfLines={2}>
                    {lastReceived.content}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.featureTitle}>Aucune lettre reçue</Text>
                  <Text style={styles.featureText}>
                    Réussissez des matchs pour recevoir vos premières enveloppes.
                  </Text>
                </>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(tabs)/letters' as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {lastReceived ? 'Ouvrir la boîte aux lettres' : 'Découvrir des profils'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats ─────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{points}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{matches.length}</Text>
            <Text style={styles.statLabel}>Matchs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{currentUser?.stats?.lettersSent || 0}</Text>
            <Text style={styles.statLabel}>Lettres</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, unreadCount > 0 && { color: J.accentPrimary }]}>
              {unreadCount}
            </Text>
            <Text style={styles.statLabel}>Non lues</Text>
          </View>
        </View>

        {/* ── Actions rapides ───────────────────────────────────── */}
        <View style={styles.quickRow}>
          {[
            { emoji: '🎯', label: 'Activités', route: '/games'   },
            { emoji: '🐾', label: 'Animal', route: '/pet'     },
            { emoji: '🌟', label: 'Badges', route: '/badges'  },
          ].map(a => (
            <TouchableOpacity
              key={a.label}
              style={styles.quickBtn}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.quickEmoji}>{a.emoji}</Text>
              <Text style={styles.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Journal des salons ────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>JOURNAL DES SALONS</Text>
          <Text style={styles.cardTitle}>Activité récente</Text>
          {activityFeed.map((item, i) => (
            <View key={i} style={styles.feedItem}>
              <Text style={styles.feedText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* ── Boîte aux lettres preview ─────────────────────────── */}
        {matches.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>BOÎTE AUX LETTRES</Text>
            <Text style={styles.cardTitle}>Correspondances</Text>
            {matches.slice(0, 3).map(match => {
              const otherId = match.userAId === (currentUser?.id || 'me')
                ? match.userBId
                : match.userAId;
              const conv   = letters.filter(
                l => l.fromUserId === otherId || l.toUserId === otherId,
              );
              const unread = conv.filter(
                l => l.toUserId === (currentUser?.id || 'me') && !l.readAt,
              ).length;
              return (
                <TouchableOpacity
                  key={match.id}
                  style={styles.mailItem}
                  onPress={() => router.push('/(tabs)/letters' as any)}
                  activeOpacity={0.8}
                >
                  <Avatar name={otherId} size={40} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.mailName}>{otherId}</Text>
                    <Text style={styles.mailSub}>Correspondance privée</Text>
                  </View>
                  {unread > 0 ? (
                    <View style={styles.badgePrimary}>
                      <Text style={styles.badgePrimaryTxt}>Nouvelle lettre</Text>
                    </View>
                  ) : conv.length > 0 ? (
                    <View style={styles.badgeSoft}>
                      <Text style={styles.badgeSoftTxt}>À répondre</Text>
                    </View>
                  ) : (
                    <View style={styles.badgeNeutral}>
                      <Text style={styles.badgeNeutralTxt}>En attente</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: J.bgMain },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },

  // ── Manchette
  masthead: { marginBottom: 18, paddingBottom: 4 },
  kicker:   { fontSize: 11, letterSpacing: 3, color: J.accentPrimary, fontWeight: '700', marginBottom: 6 },
  heroTitle:{ fontSize: 36, fontWeight: '800', color: J.textMain, lineHeight: 40 },
  heroSub:  { fontSize: 14, color: J.textSecondary, marginTop: 4, fontStyle: 'italic' },
  mastheadRule:   { height: 1, backgroundColor: J.borderSoft, marginTop: 12, marginBottom: 8 },
  mastheadFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  mastheadMeta:   { fontSize: 11, color: J.textSecondary },

  // ── Carte
  card: {
    backgroundColor: J.bgCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: J.borderSoft,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardLabel: { fontSize: 11, letterSpacing: 2, color: J.accentPrimary, fontWeight: '700', marginBottom: 8 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: J.textMain, marginBottom: 12 },

  // ── Feature row
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  iconBox:    { width: 52, height: 52, borderRadius: 14, backgroundColor: J.accentLight, alignItems: 'center', justifyContent: 'center' },
  iconEmoji:  { fontSize: 22 },
  featureTitle: { fontSize: 20, fontWeight: '700', color: J.textMain, lineHeight: 24 },
  featureText:  { marginTop: 4, fontSize: 13, color: J.textSecondary, lineHeight: 19 },

  // ── Bouton primaire
  primaryBtn:     { backgroundColor: J.accentPrimary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // ── Stats
  statsRow: {
    backgroundColor: J.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: J.borderSoft,
    flexDirection: 'row',
    paddingVertical: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statItem:    { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: J.borderSoft, marginVertical: 4 },
  statValue:   { fontSize: 22, fontWeight: '800', color: J.textMain },
  statLabel:   { fontSize: 10, color: J.textSecondary, marginTop: 2, letterSpacing: 0.5, textTransform: 'uppercase' },

  // ── Quick actions
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  quickBtn: {
    flex: 1,
    backgroundColor: J.bgCard,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: J.borderSoft,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  quickEmoji: { fontSize: 26 },
  quickLabel: { fontSize: 12, fontWeight: '600', color: J.textMain, marginTop: 5 },

  // ── Fil activité
  feedItem: { backgroundColor: J.bgSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  feedText:  { fontSize: 14, color: J.textMain, lineHeight: 20 },

  // ── Boîte aux lettres
  mailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: J.borderSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  mailName: { fontSize: 15, fontWeight: '700', color: J.textMain },
  mailSub:  { fontSize: 12, color: J.textSecondary, marginTop: 2 },

  badgePrimary:    { backgroundColor: J.accentPrimary, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  badgePrimaryTxt: { fontSize: 11, color: '#fff', fontWeight: '700' },
  badgeSoft:       { backgroundColor: J.bgSoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  badgeSoftTxt:    { fontSize: 11, color: J.textMain, fontWeight: '600' },
  badgeNeutral:    { backgroundColor: J.bgMain, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: J.borderSoft },
  badgeNeutralTxt: { fontSize: 11, color: J.textSecondary, fontWeight: '600' },
});
