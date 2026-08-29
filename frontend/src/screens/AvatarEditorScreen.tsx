import React, { useCallback, useState } from 'react';
import { Button, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../store/useStore';
import { saveAvatarConfig } from '../api/profiles';
import type { AvatarConfig } from '../avatar/png/defaults';
import type { AvatarLayerKey } from '../avatar/png/editor/AvatarOptionItem';

type Option = { id: string | null; label: string };
type Category = { key: AvatarLayerKey; title: string; options: Option[] };

const CATEGORIES: Category[] = [
  { key: 'hair', title: 'Cheveux', options: [{ id: null, label: 'Aucun' }, ...Array.from({ length: 14 }, (_, i) => ({ id: `hair_${String(i + 1).padStart(2, '0')}`, label: `Style ${i + 1}` }))] },
  { key: 'nose', title: 'Nez', options: Array.from({ length: 6 }, (_, i) => ({ id: `nose_${String(i + 1).padStart(2, '0')}`, label: `Style ${i + 1}` })) },
  { key: 'mouth', title: 'Bouche', options: Array.from({ length: 7 }, (_, i) => ({ id: `mouth_${String(i + 1).padStart(2, '0')}`, label: `Style ${i + 1}` })) },
  { key: 'pilosite', title: 'Pilosité', options: [{ id: null, label: 'Aucune' }, { id: 'beard_01', label: 'Barbe 1' }, { id: 'beard_02', label: 'Barbe 2' }, { id: 'beard_03', label: 'Barbe 3' }, { id: 'beard_04', label: 'Barbe 4' }, { id: 'mustache_01', label: 'Moustache' }] },
  { key: 'clothes', title: 'Vêtements', options: [{ id: null, label: 'Basique' }, ...Array.from({ length: 20 }, (_, i) => ({ id: `clothes_${String(i + 1).padStart(2, '0')}`, label: `Tenue ${i + 1}` }))] },
  { key: 'earrings', title: "Boucles d'oreilles", options: [{ id: null, label: 'Aucunes' }, { id: 'earrings_01', label: 'Dorées' }, { id: 'earrings_02', label: 'Argentées' }, { id: 'earrings_03', label: 'Perles' }] },
  { key: 'accessory', title: 'Accessoires', options: [{ id: null, label: 'Aucun' }, { id: 'glasses_01', label: 'Lunettes' }, { id: 'glasses_02', label: 'Soleil' }, { id: 'hat_01', label: 'Chapeau' }, { id: 'crown_01', label: 'Couronne' }] },
];

export function AvatarEditorScreen() {
  const { avatarPngConfig, updateAvatarPngConfig, hydrateFromApi } = useStore();
  const [config, setConfig] = useState<AvatarConfig>(() => avatarPngConfig);
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const select = useCallback((layer: AvatarLayerKey, id: string | null) => {
    setConfig(prev => ({ ...prev, [layer]: id }));
    setMessage(null);
  }, []);

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setMessage(null);
    try {
      updateAvatarPngConfig(config);
      await saveAvatarConfig(config);
      await hydrateFromApi();
      setMessage('Configuration enregistrée.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d'enregistrer la configuration");
    } finally {
      setSaving(false);
    }
  }, [config, saving, updateAvatarPngConfig, hydrateFromApi]);

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <Text>Personnalisation de l’avatar</Text>
      <Text>Version de test sans aperçu graphique. Les choix ci-dessous enregistrent la même configuration d’avatar.</Text>
      {CATEGORIES.map(category => (
        <View key={category.key}>
          <Text>{category.title}</Text>
          <Text>Choix actuel : {String(config[category.key] ?? 'Aucun')}</Text>
          {category.options.map(option => (
            <Button
              key={`${category.key}-${option.id ?? 'none'}`}
              title={`${config[category.key] === option.id ? 'Sélectionné : ' : ''}${option.label}`}
              onPress={() => select(category.key, option.id)}
            />
          ))}
        </View>
      ))}

      <Text>Journal intime</Text>
      <TextInput
        value={bio}
        onChangeText={setBio}
        placeholder="Écris quelque chose sur toi…"
        multiline
        maxLength={300}
      />
      <Text>{bio.length} / 300</Text>
      <Text>Ce champ n’était pas relié à la sauvegarde de l’avatar dans l’écran existant.</Text>

      {message ? <Text>{message}</Text> : null}
      <Button title={saving ? 'Enregistrement...' : 'Sauvegarder'} onPress={save} disabled={saving} />
      <Button title="Retour" onPress={() => router.back()} />
    </ScrollView>
  );
}
