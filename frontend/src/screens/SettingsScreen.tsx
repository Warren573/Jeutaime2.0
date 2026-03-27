import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { titles, badges } from '../data/gameData';
import { AvatarRenderer } from '../avatar/components/AvatarRenderer';
import { MOCK_AVATAR_DEFAULT } from '../avatar/data/mockAvatars';
import { Avatar } from '../avatar/png/Avatar';
import { DEFAULT_AVATAR } from '../avatar/png/defaults';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser, setCurrentUser, coins, points, getCurrentTitle, pet } = useStore();
  const screenBg = useStore(s => s.screenBackgrounds?.['settings'] ?? '#FFF8E7');
  const title = getCurrentTitle();

  // Avatar — utilise avatarDef du store si disponible, sinon défaut
  const avatarDef = (currentUser as any)?.avatarDef ?? MOCK_AVATAR_DEFAULT;

  // États pour l'édition de profil
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName]   = useState(currentUser?.name || 'Joueur');
  const [editBio, setEditBio]     = useState('');
  const [editCity, setEditCity]   = useState('Paris');

  // Calcul progression vers prochain titre
  const currentTitleData = titles.find(t => t.level === title.level);
  const nextTitle = titles.find(t => t.level === title.level + 1);
  const progress = nextTitle
    ? Math.min(100, ((points - (currentTitleData?.minPoints || 0)) / ((nextTitle.minPoints - (currentTitleData?.minPoints || 0)) || 1)) * 100)
    : 100;

  const handleSaveProfile = () => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, name: editName });
    }
    setShowEditProfile(false);
  };

  const menuItems = [
    { icon: '✏️', label: 'Modifier mon profil',        action: () => setShowEditProfile(true)  },
    { icon: '🎨', label: 'Personnaliser mon avatar',   action: () => { console.log('CLICK AVATAR'); router.push({ pathname: '/avatar-builder' }); } },
    { icon: '🖼️', label: 'Arrière-plans des écrans',   route:  '/background-picker'            },
    { icon: '🎯', label: 'Activités',                  route:  '/games'                        },
    { icon: '🐾', label: 'Mon Animal',                 route:  '/pet',  badge: pet ? pet.petEmoji : null },
    { icon: '🌟', label: 'Badges',                     route:  '/badges'                       },
    { icon: '🍾', label: 'Bouteille à la mer',         route:  '/bottle'                       },
    { icon: '🏆', label: 'Profil de la semaine',       route:  '/weekly-profile'               },
    { icon: '🛒', label: 'Boutique',                   route:  null                            },
    { icon: '👑', label: 'Premium',                    route:  null                            },
    { icon: '🔔', label: 'Notifications',              route:  null                            },
    { icon: '❓', label: 'Aide',                       route:  null                            },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: screenBg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── Profil card ────────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.profileCard} onPress={() => setShowEditProfile(true)}>
          <Avatar size={92} {...DEFAULT_AVATAR} />

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{currentUser?.name || 'Joueur'}</Text>
            <Text style={styles.profileCity}>📍 {editCity}</Text>

            <View style={styles.titleBadge}>
              <Text style={styles.titleEmoji}>{title.emoji}</Text>
              <Text style={styles.titleName}>{title.title}</Text>
              <Text style={styles.titleLevel}>Niv. {title.level}</Text>
            </View>
          </View>

          <Text style={styles.editIcon}>✏️</Text>
        </TouchableOpacity>

        {/* ── Stats rapides ──────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statEmoji}>💰</Text>
            <Text style={styles.statValue}>{coins}</Text>
            <Text style={styles.statLabel}>Pièces</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={styles.statValue}>{points}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statEmoji}>💕</Text>
            <Text style={styles.statValue}>{currentUser?.stats?.matchesCount || 0}</Text>
            <Text style={styles.statLabel}>Matchs</Text>
          </View>
        </View>

        {/* ── Progression vers prochain titre ───────────────────────────────── */}
        {nextTitle && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Prochain titre</Text>
              <Text style={styles.progressNext}>{nextTitle.emoji} {nextTitle.name}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{points} / {nextTitle.minPoints} points</Text>
          </View>
        )}

        {/* ── Badges débloqués ──────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.badgesPreview} onPress={() => router.push('/badges')}>
          <View style={styles.badgesHeader}>
            <Text style={styles.sectionTitle}>🌟 Mes Badges</Text>
            <Text style={styles.badgeCount}>{currentUser?.unlockedBadges?.length || 0}/{badges.length}</Text>
          </View>
          <View style={styles.badgesRow}>
            {badges.slice(0, 6).map(badge => {
              const unlocked = currentUser?.unlockedBadges?.includes(badge.id);
              return (
                <View key={badge.id} style={[styles.badgeItem, !unlocked && styles.badgeLocked]}>
                  <Text style={styles.badgeEmoji}>{unlocked ? badge.emoji : '🔒'}</Text>
                </View>
              );
            })}
          </View>
        </TouchableOpacity>

        {/* ── Menu ──────────────────────────────────────────────────────────── */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => (item as any).action ? (item as any).action() : (item.route && router.push(item.route as any))}
              disabled={!item.route && !(item as any).action}
            >
              <View style={styles.menuIconBox}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              {(item as any).badge && <Text style={styles.menuBadge}>{(item as any).badge}</Text>}
              <Text style={styles.menuArrow}>{(item.route || (item as any).action) ? '›' : ''}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.version}>JeuTaime v2.0.0 - Expo Edition</Text>
      </ScrollView>

      {/* ── Modal Édition de Profil ────────────────────────────────────────── */}
      <Modal visible={showEditProfile} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Modifier mon profil</Text>
              <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Avatar — tap → éditeur complet */}
              <TouchableOpacity
                style={styles.avatarEditSection}
                onPress={() => {
                  setShowEditProfile(false);
                  console.log('CLICK AVATAR (modal)');
                  router.push({ pathname: '/avatar-builder' });
                }}
              >
                <Avatar size={110} {...DEFAULT_AVATAR} />
                <Text style={styles.changeAvatarText}>🎨 Modifier mon avatar</Text>
              </TouchableOpacity>

              {/* Pseudo */}
              <Text style={styles.inputLabel}>Pseudo</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Votre pseudo"
                placeholderTextColor="#8B6F47"
              />

              {/* Ville */}
              <Text style={styles.inputLabel}>Ville</Text>
              <TextInput
                style={styles.input}
                value={editCity}
                onChangeText={setEditCity}
                placeholder="Votre ville"
                placeholderTextColor="#8B6F47"
              />

              {/* Bio */}
              <Text style={styles.inputLabel}>Bio (min 50 caractères)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Parlez de vous..."
                placeholderTextColor="#8B6F47"
                multiline
                numberOfLines={4}
              />
              <Text style={styles.charCount}>{editBio.length}/50 min</Text>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
                <Text style={styles.saveBtnText}>💾 Sauvegarder</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#FFF8E7' },
  scrollContent:  { padding: 16, paddingBottom: 100 },

  profileCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 5 },
  profileInfo:    { flex: 1, marginLeft: 16 },
  profileName:    { fontSize: 24, fontWeight: '800', color: '#3A2818' },
  profileCity:    { fontSize: 14, color: '#8B6F47', marginTop: 4 },
  titleBadge:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFE082', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginTop: 10, alignSelf: 'flex-start' },
  titleEmoji:     { fontSize: 18, marginRight: 6 },
  titleName:      { fontSize: 15, fontWeight: '700', color: '#5D4037' },
  titleLevel:     { fontSize: 13, color: '#8B6F47', marginLeft: 8 },
  editIcon:       { fontSize: 20, color: '#8B6F47' },

  statsRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statBox:        { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginHorizontal: 4, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  statEmoji:      { fontSize: 24, marginBottom: 4 },
  statValue:      { fontSize: 22, fontWeight: '800', color: '#3A2818' },
  statLabel:      { fontSize: 12, color: '#8B6F47', marginTop: 4 },

  progressSection:  { backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 16 },
  progressHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressLabel:    { fontSize: 14, color: '#8B6F47' },
  progressNext:     { fontSize: 16, fontWeight: '700', color: '#DAA520' },
  progressBarBg:    { height: 14, backgroundColor: '#E8D5B7', borderRadius: 7, overflow: 'hidden' },
  progressBarFill:  { height: '100%', backgroundColor: '#FFD700', borderRadius: 7 },
  progressText:     { fontSize: 13, color: '#8B6F47', marginTop: 8, textAlign: 'right' },

  badgesPreview:  { backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 16 },
  badgesHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:   { fontSize: 17, fontWeight: '700', color: '#3A2818' },
  badgeCount:     { fontSize: 14, color: '#8B6F47', fontWeight: '600' },
  badgesRow:      { flexDirection: 'row', justifyContent: 'space-around' },
  badgeItem:      { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFE082', alignItems: 'center', justifyContent: 'center' },
  badgeLocked:    { backgroundColor: '#E8D5B7' },
  badgeEmoji:     { fontSize: 22 },

  menuSection:    { backgroundColor: '#FFF', borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
  menuItem:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F5EFE6' },
  menuIconBox:    { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF8E7', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuIcon:       { fontSize: 22 },
  menuLabel:      { flex: 1, fontSize: 16, fontWeight: '500', color: '#3A2818' },
  menuBadge:      { fontSize: 20, marginRight: 8 },
  menuArrow:      { fontSize: 24, color: '#C4A77D', fontWeight: '300' },
  version:        { textAlign: 'center', fontSize: 13, color: '#B8A082', marginTop: 12 },

  modalBg:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:       { backgroundColor: '#FFF8E7', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%' },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E8D5B7' },
  modalTitle:     { fontSize: 20, fontWeight: '700', color: '#3A2818' },
  closeX:         { fontSize: 26, color: '#8B6F47' },
  modalScroll:    { padding: 20 },

  avatarEditSection:  { alignItems: 'center', marginBottom: 24 },
  changeAvatarText:   { fontSize: 14, color: '#DAA520', fontWeight: '600', marginTop: 10 },
  inputLabel:         { fontSize: 14, fontWeight: '600', color: '#5D4037', marginBottom: 8, marginTop: 12 },
  input:              { backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1, borderColor: '#E8D5B7' },
  textArea:           { height: 100, textAlignVertical: 'top' },
  charCount:          { fontSize: 12, color: '#8B6F47', textAlign: 'right', marginTop: 4 },
  saveBtn:            { backgroundColor: '#4CAF50', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 24, marginBottom: 30 },
  saveBtnText:        { color: '#FFF', fontWeight: '700', fontSize: 17 },
});
