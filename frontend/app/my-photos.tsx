import React, { useEffect, useState } from 'react';
import { Alert, Button, Platform, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../src/store/useStore';
import { RELATION_THRESHOLDS } from '../src/engine/RelationEngine';
import {
  getMyPhotos,
  uploadPhoto,
  deleteMyPhoto,
  patchMyPhoto,
  type MyPhotoDto,
} from '../src/api/profiles';

function pickImageWeb(): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = e => resolve((e.target as HTMLInputElement).files?.[0] ?? null);
    input.click();
  });
}

export default function MyPhotosScreen() {
  const router = useRouter();
  const currentUser = useStore(s => s.currentUser);
  const isPremium = currentUser?.isPremium ?? false;
  const [photos, setPhotos] = useState<MyPhotoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const reload = async () => {
    try { setPhotos(await getMyPhotos()); }
    catch (e: any) { Alert.alert('Erreur', e?.message || 'Impossible de charger les photos'); }
  };

  useEffect(() => { setLoading(true); reload().finally(() => setLoading(false)); }, []);

  const addPhoto = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Bientôt disponible', "L'ajout de photos depuis l'app mobile arrive prochainement.");
      return;
    }
    const file = await pickImageWeb().catch(() => null);
    if (!file) return;
    try { setUploading(true); await uploadPhoto(file); await reload(); }
    catch (e: any) { Alert.alert('Erreur upload', e?.message || "Impossible d'envoyer la photo"); }
    finally { setUploading(false); }
  };

  const setMain = async (id: string) => {
    try { await patchMyPhoto(id, { isPrimary: true }); await reload(); }
    catch (e: any) { Alert.alert('Erreur', e?.message || 'Impossible de changer la photo principale'); }
  };

  const remove = async (id: string) => {
    try { await deleteMyPhoto(id); await reload(); }
    catch (e: any) { Alert.alert('Erreur', e?.message || 'Impossible de supprimer la photo'); }
  };

  const t = isPremium ? RELATION_THRESHOLDS.premium : RELATION_THRESHOLDS.normal;

  return (
    <ScrollView>
      <Text>Mes photos</Text>
      <Text>La photo reste cachée jusqu'au déblocage lié aux lettres.</Text>
      <Text>Seuil actuel : {t.level3} lettres par côté.</Text>
      {loading && <Text>Chargement...</Text>}
      {!loading && photos.length === 0 && <Text>Aucune photo enregistrée.</Text>}
      {photos.map((photo, index) => (
        <View key={photo.id}>
          <Text>Photo {index + 1}</Text>
          <Text>Principale : {photo.isPrimary ? 'oui' : 'non'}</Text>
          {!photo.isPrimary && <Button title="Choisir comme principale" onPress={() => setMain(photo.id)} />}
          <Button title="Supprimer" onPress={() => remove(photo.id)} />
        </View>
      ))}
      <Button title={uploading ? 'Envoi en cours...' : photos.length ? 'Remplacer / ajouter une photo' : 'Ajouter une photo'} onPress={addPhoto} disabled={uploading} />
      <Button title="Actualiser" onPress={reload} />
      <Button title="Retour" onPress={() => router.back()} />
    </ScrollView>
  );
}
