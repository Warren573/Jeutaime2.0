import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../src/store/useStore';
import { Avatar } from '../src/avatar/png/Avatar';
import { RELATION_THRESHOLDS } from '../src/engine/RelationEngine';

// ── Sélecteur de fichier (web uniquement) ────────────────────
function pickImageWeb(): Promise<string | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) { resolve(null); return; }
      resolve(URL.createObjectURL(file));
    };
    input.click();
  });
}

export default function MyPhotosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser, setCurrentUser, avatarPngConfig } = useStore();

  const photos: string[]             = currentUser?.photos           ?? [];
  const mainPhotoUri: string | undefined = currentUser?.mainPhotoUri;
  const showPhotoByDefault           = currentUser?.showPhotoByDefault ?? false;
  const isPremium                    = currentUser?.isPremium ?? false;

  const [loading, setLoading] = useState(false);

  const patchUser = (patch: object) => {
    if (!currentUser) return;
    setCurrentUser({ ...currentUser, ...patch });
  };

  const handleAddPhoto = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Bientôt disponible', "L'ajout de photos depuis l'app mobile arrive prochainement.");
      return;
    }
    setLoading(true);
    try {
      const uri = await pickImageWeb();
      if (!uri) return;
      const newPhotos = [...photos, uri];
      patchUser({
        photos: newPhotos,
        mainPhotoUri: mainPhotoUri ?? uri,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetMain = (uri: string) => patchUser({ mainPhotoUri: uri });

  const handleDelete = (uri: string) => {
    const newPhotos = photos.filter(p => p !== uri);
    const newMain   = mainPhotoUri === uri ? (newPhotos[0] ?? undefined) : mainPhotoUri;
    patchUser({
      photos: newPhotos,
      mainPhotoUri: newMain,
      showPhotoByDefault: newMain ? showPhotoByDefault : false,
    });
  };

  const t = isPremium ? RELATION_THRESHOLDS.premium : RELATION_THRESHOLDS.normal;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MES PHOTOS</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Comment ça marche ── */}
        <View style={styles.revealNote}>
          <Text style={styles.revealNoteTitle}>📖 Comment ça marche</Text>
          <Text style={styles.revealNoteText}>
            Ta photo se révèle progressivement selon le niveau de la relation — jamais d'emblée.
          </Text>
          <View style={styles.levelsRow}>
            {[
              { stars: '⭐',     label: 'Découverte\nAvatar'       },
              { stars: '⭐⭐',   label: 'Connexion\nPhoto floue'   },
              { stars: '⭐⭐⭐', label: 'Révélation\nPhoto nette'  },
            ].map((item, i, arr) => (
              <React.Fragment key={i}>
                <View style={styles.levelPill}>
                  <Text style={styles.levelPillStars}>{item.stars}</Text>
                  <Text style={styles.levelPillLabel}>{item.label}</Text>
                </View>
                {i < arr.length - 1 && <Text style={styles.levelArrow}>→</Text>}
              </React.Fragment>
            ))}
          </View>
          <Text style={styles.revealThreshold}>
            {isPremium
              ? `✨ Premium : révélation dès ${t.level3} lettres`
              : `Révélation complète après ${t.level3} lettres échangées`}
          </Text>
        </View>

        {/* ── Aperçu ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Aperçu actuel</Text>
          <View style={styles.previewRow}>
            <View style={styles.previewBlock}>
              <Text style={styles.previewLabel}>🎭 Avatar</Text>
              <View style={styles.previewFrame}>
                <Avatar size={72} {...avatarPngConfig} />
              </View>
            </View>

            {mainPhotoUri ? (
              <View style={styles.previewBlock}>
                <Text style={styles.previewLabel}>🪞 Ma photo</Text>
                <View style={styles.previewFrame}>
                  <Image source={{ uri: mainPhotoUri }} style={styles.previewPhoto} contentFit="cover" />
                </View>
              </View>
            ) : (
              <View style={[styles.previewBlock, styles.previewEmpty]}>
                <Text style={styles.previewEmptyIcon}>📷</Text>
                <Text style={styles.previewEmptyText}>Pas encore de photo</Text>
              </View>
            )}
          </View>

          {mainPhotoUri && (
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                {showPhotoByDefault
                  ? '🪞 Photo affichée par défaut dans ton profil'
                  : '🎭 Avatar affiché par défaut dans ton profil'}
              </Text>
              <Switch
                value={showPhotoByDefault}
                onValueChange={val => patchUser({ showPhotoByDefault: val })}
                trackColor={{ false: '#E8D5B7', true: '#E91E8C' }}
                thumbColor="#FFF"
              />
            </View>
          )}
        </View>

        {/* ── Photo existante ── */}
        {photos.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Ma photo</Text>
            <Text style={styles.sectionSub}>Une seule photo forte — c'est tout ce qu'il faut.</Text>

            {photos.map((uri, i) => (
              <View key={i} style={styles.photoRow}>
                <Image source={{ uri }} style={styles.photoThumb} contentFit="cover" />
                <View style={styles.photoMeta}>
                  {uri === mainPhotoUri ? (
                    <View style={styles.mainBadge}>
                      <Text style={styles.mainBadgeText}>✓ Photo principale</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.setMainBtn} onPress={() => handleSetMain(uri)}>
                      <Text style={styles.setMainText}>Choisir comme principale</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(uri)}>
                    <Text style={styles.deleteText}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Ajouter / Remplacer ── */}
        <TouchableOpacity
          style={[photos.length > 0 ? styles.replaceBtn : styles.addBtn, loading && { opacity: 0.6 }]}
          onPress={handleAddPhoto}
          disabled={loading}
        >
          {photos.length === 0 ? (
            <>
              <Text style={styles.addBtnIcon}>📷</Text>
              <Text style={styles.addBtnText}>{loading ? 'Chargement…' : 'Ajouter ma photo'}</Text>
            </>
          ) : (
            <Text style={styles.replaceBtnText}>{loading ? 'Chargement…' : '🔄 Remplacer la photo'}</Text>
          )}
        </TouchableOpacity>

        {/* ── Note confidentialité ── */}
        <View style={styles.privacyNote}>
          <Text style={styles.privacyIcon}>🔒</Text>
          <Text style={styles.privacyText}>
            Cette section est privée.{'\n'}
            Ta photo ne sera jamais visible dès le premier regard — la relation évolue d'abord.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const PINK  = '#E91E8C';
const BEIGE = '#FFF8E7';
const BROWN = '#3A2818';
const SAND  = '#E8D5B7';
const MOCHA = '#8B6F47';

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: BEIGE },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: SAND, backgroundColor: BEIGE,
  },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: SAND },
  backIcon:    { fontSize: 20, color: BROWN, fontWeight: '700' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '900', color: BROWN, letterSpacing: 2 },

  scroll: { padding: 16, paddingBottom: 60 },

  revealNote: {
    backgroundColor: '#FFF0F7', borderRadius: 20, padding: 18,
    marginBottom: 16, borderWidth: 1.5, borderColor: '#F9C1DA',
  },
  revealNoteTitle: { fontSize: 15, fontWeight: '800', color: BROWN, marginBottom: 8 },
  revealNoteText:  { fontSize: 13, color: MOCHA, lineHeight: 20, marginBottom: 14 },
  levelsRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  levelPill:       { flex: 1, alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: SAND },
  levelPillStars:  { fontSize: 13, marginBottom: 4 },
  levelPillLabel:  { fontSize: 10, color: MOCHA, textAlign: 'center', lineHeight: 13 },
  levelArrow:      { fontSize: 14, color: MOCHA, paddingHorizontal: 2 },
  revealThreshold: { fontSize: 12, color: PINK, fontWeight: '700', textAlign: 'center' },

  sectionCard:  { backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: SAND },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: PINK, marginBottom: 4 },
  sectionSub:   { fontSize: 12, color: MOCHA, marginBottom: 14 },

  previewRow:       { flexDirection: 'row', gap: 16, marginBottom: 16 },
  previewBlock:     { flex: 1, alignItems: 'center' },
  previewLabel:     { fontSize: 13, fontWeight: '700', color: BROWN, marginBottom: 8 },
  previewFrame:     { width: 90, height: 90, borderRadius: 14, borderWidth: 2, borderColor: SAND, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9F3E8' },
  previewPhoto:     { width: '100%', height: '100%' },
  previewEmpty:     { justifyContent: 'center', borderStyle: 'dashed', borderColor: '#C8B8A0' },
  previewEmptyIcon: { fontSize: 28, marginBottom: 4 },
  previewEmptyText: { fontSize: 11, color: MOCHA, textAlign: 'center' },

  toggleRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F5EDE0' },
  toggleLabel: { flex: 1, fontSize: 13, color: BROWN, fontWeight: '600', paddingRight: 12, lineHeight: 18 },

  photoRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  photoThumb:  { width: 80, height: 80, borderRadius: 12, marginRight: 14 },
  photoMeta:   { flex: 1, gap: 8 },
  mainBadge:   { backgroundColor: '#E8F8ED', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  mainBadgeText: { fontSize: 12, color: '#2E7D32', fontWeight: '700' },
  setMainBtn:  { backgroundColor: BEIGE, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: SAND },
  setMainText: { fontSize: 12, color: BROWN, fontWeight: '600' },
  deleteBtn:   { backgroundColor: '#FFF0F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  deleteText:  { fontSize: 12, color: '#C62828', fontWeight: '600' },

  addBtn: {
    backgroundColor: PINK, borderRadius: 20, padding: 20,
    alignItems: 'center', marginBottom: 16,
    flexDirection: 'row', justifyContent: 'center', gap: 10,
  },
  addBtnIcon: { fontSize: 22 },
  addBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },

  replaceBtn:     { borderWidth: 1.5, borderColor: PINK, borderRadius: 16, padding: 14, alignItems: 'center', marginBottom: 16 },
  replaceBtnText: { color: PINK, fontWeight: '700', fontSize: 14 },

  privacyNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#F5F0E8', borderRadius: 14, padding: 14, marginBottom: 8,
  },
  privacyIcon: { fontSize: 18 },
  privacyText: { flex: 1, fontSize: 12, color: MOCHA, lineHeight: 18 },
});
