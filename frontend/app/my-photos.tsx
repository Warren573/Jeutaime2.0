import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../src/store/useStore';
import { Avatar } from '../src/avatar/png/Avatar';
import { RELATION_THRESHOLDS } from '../src/engine/RelationEngine';
import { API_URL } from '../src/api/client';
import {
  getMyPhotos,
  uploadPhoto,
  deleteMyPhoto,
  patchMyPhoto,
  type MyPhotoDto,
} from '../src/api/profiles';

// Même logique que ProfileDetailScreen : bande "/api" puis préfixe API_URL
function makePhotoUrl(relativeUrl: string): string {
  return API_URL + relativeUrl.replace(/^\/api/, '');
}

// ── Sélecteur de fichier (web uniquement) ────────────────────
function pickImageWeb(): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      resolve((e.target as HTMLInputElement).files?.[0] ?? null);
    };
    input.click();
  });
}

export default function MyPhotosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser, avatarPngConfig } = useStore();

  const isPremium = currentUser?.isPremium ?? false;

  const [apiPhotos, setApiPhotos]         = useState<MyPhotoDto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [uploading, setUploading]         = useState(false);
  const [authToken, setAuthToken]         = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('auth_token').then(setAuthToken);
  }, []);

  const reloadPhotos = async () => {
    try {
      const photos = await getMyPhotos();
      setApiPhotos(photos);
    } catch (err) {
      console.warn('[my-photos] reloadPhotos error:', err);
    }
  };

  useEffect(() => {
    setLoadingPhotos(true);
    reloadPhotos().finally(() => setLoadingPhotos(false));
  }, []);

  const photoHeaders: Record<string, string> = authToken
    ? { Authorization: `Bearer ${authToken}` }
    : {};

  const primaryPhoto    = apiPhotos.find(p => p.isPrimary) ?? apiPhotos[0];
  const primaryPhotoUrl = primaryPhoto ? makePhotoUrl(primaryPhoto.url) : undefined;


  const handleAddPhoto = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Bientôt disponible', "L'ajout de photos depuis l'app mobile arrive prochainement.");
      return;
    }
    // Ouvrir le sélecteur SANS toucher à l'état uploading
    // (le bouton ne doit pas se bloquer si l'utilisateur annule)
    let file: File | null = null;
    try {
      file = await pickImageWeb();
    } catch {
      return;
    }
    if (!file) return;

    // Fichier confirmé → démarrer l'upload
    console.log('[my-photos] fichier sélectionné:', file.name, Math.round(file.size / 1024), 'KB', file.type);
    setUploading(true);
    try {
      await uploadPhoto(file);
      await reloadPhotos();
    } catch (err: any) {
      console.error('[my-photos] handleAddPhoto error:', err?.message);
      Alert.alert('Erreur upload', err?.message ?? "Impossible d'envoyer la photo");
    } finally {
      setUploading(false);
    }
  };

  const handleSetMain = async (photoId: string) => {
    try {
      await patchMyPhoto(photoId, { isPrimary: true });
      await reloadPhotos();
    } catch (err: any) {
      Alert.alert('Erreur', err?.message ?? 'Impossible de changer la photo principale');
    }
  };

  const handleDelete = async (photoId: string) => {
    try {
      await deleteMyPhoto(photoId);
      await reloadPhotos();
    } catch (err: any) {
      Alert.alert('Erreur', err?.message ?? 'Impossible de supprimer la photo');
    }
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
            Ta photo reste cachée jusqu'à ce que vous ayez échangé suffisamment de lettres — puis elle se révèle entièrement.
          </Text>
          <View style={styles.levelsRow}>
            {[
              { stars: '🔒', label: 'Avant déblocage\nAvatar uniquement' },
              { stars: '🔓', label: 'Après déblocage\nPhoto visible'     },
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
              ? `✨ Premium : déblocage dès ${t.level3} lettres par côté`
              : `Déblocage après ${t.level3} lettres échangées par chacun`}
          </Text>
        </View>

        {/* ── Aperçu ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Aperçu actuel</Text>

          {loadingPhotos ? (
            <ActivityIndicator color={PINK} style={{ marginVertical: 24 }} />
          ) : (
            <View style={styles.previewRow}>
              <View style={styles.previewBlock}>
                <Text style={styles.previewLabel}>🎭 Avatar</Text>
                <View style={styles.previewFrame}>
                  <Avatar size={72} {...avatarPngConfig} />
                </View>
              </View>

              {primaryPhotoUrl && authToken ? (
                <View style={styles.previewBlock}>
                  <Text style={styles.previewLabel}>🪞 Ma photo</Text>
                  <View style={styles.previewFrame}>
                    <Image
                      key={authToken}
                      source={{ uri: primaryPhotoUrl, headers: photoHeaders }}
                      style={styles.previewPhoto}
                      contentFit="cover"
                      cachePolicy="none"
                    />
                  </View>
                </View>
              ) : (
                <View style={[styles.previewBlock, styles.previewEmpty]}>
                  <Text style={styles.previewEmptyIcon}>📷</Text>
                  <Text style={styles.previewEmptyText}>Pas encore de photo</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Photos existantes ── */}
        {apiPhotos.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Ma photo</Text>
            <Text style={styles.sectionSub}>Une seule photo forte — c'est tout ce qu'il faut.</Text>

            {authToken && apiPhotos.map((photo) => (
              <View key={photo.id} style={styles.photoRow}>
                <Image
                  key={authToken}
                  source={{ uri: makePhotoUrl(photo.url), headers: photoHeaders }}
                  style={styles.photoThumb}
                  contentFit="cover"
                  cachePolicy="none"
                />
                <View style={styles.photoMeta}>
                  {photo.isPrimary ? (
                    <View style={styles.mainBadge}>
                      <Text style={styles.mainBadgeText}>✓ Photo principale</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.setMainBtn} onPress={() => handleSetMain(photo.id)}>
                      <Text style={styles.setMainText}>Choisir comme principale</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(photo.id)}>
                    <Text style={styles.deleteText}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Ajouter / Remplacer ── */}
        <TouchableOpacity
          style={[apiPhotos.length > 0 ? styles.replaceBtn : styles.addBtn, uploading && { opacity: 0.6 }]}
          onPress={handleAddPhoto}
          disabled={uploading}
        >
          {apiPhotos.length === 0 ? (
            <>
              <Text style={styles.addBtnIcon}>📷</Text>
              <Text style={styles.addBtnText}>{uploading ? 'Envoi…' : 'Ajouter ma photo'}</Text>
            </>
          ) : (
            <Text style={styles.replaceBtnText}>{uploading ? 'Envoi…' : '🔄 Remplacer la photo'}</Text>
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
