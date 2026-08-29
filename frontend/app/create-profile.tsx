import { useState } from 'react';
import { Alert, Button, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { apiFetch } from '../src/api/client';
import { useStore } from '../src/store/useStore';

const INTERESTED_IN_OPTIONS = [
  { label: 'Femmes', value: 'FEMME' },
  { label: 'Hommes', value: 'HOMME' },
];
const LOOKING_FOR_OPTIONS = [
  { label: 'Relation sérieuse', value: 'SERIEUX' },
  { label: 'Du Fun', value: 'FLIRT' },
  { label: 'Amitiés', value: 'AMITIE' },
  { label: 'Advienne que pourra', value: 'DISCUSSION' },
];
const PHYSICAL_DESC_OPTIONS = [
  { label: 'Filiforme', value: 'filiforme' },
  { label: 'Ras des mottes', value: 'ras_motte' },
  { label: 'Grande gigue', value: 'grande_gigue' },
  { label: 'Costaud(e)', value: 'costaud' },
  { label: 'Mignon(ne)', value: 'mignon' },
  { label: 'Mystérieux(se)', value: 'mysterieux' },
  { label: 'Athlétique', value: 'athletique' },
  { label: 'Doux(ce)', value: 'doux' },
];
const GI_REV: Record<string, string> = { F: 'FEMME', M: 'HOMME', NB: 'AUTRE' };
const LF_REV: Record<string, string> = { amitie: 'AMITIE', relation: 'RELATION', flirt: 'FLIRT', discussion: 'DISCUSSION', serieux: 'SERIEUX' };
function countWords(text: string) { return text.trim().split(/\s+/).filter(Boolean).length; }

export default function CreateProfileScreen() {
  const router = useRouter();
  const { hydrateFromApi, currentUser } = useStore();
  const canDiscover = currentUser?.canDiscover;
  const [bio, setBio] = useState(currentUser?.bio ?? '');
  const [interestedIn, setInterestedIn] = useState<string[]>(Array.isArray(currentUser?.interestedIn) ? currentUser.interestedIn.map(v => GI_REV[v] ?? v) : []);
  const [lookingFor, setLookingFor] = useState<string[]>(Array.isArray(currentUser?.lookingFor) ? currentUser.lookingFor.map(v => LF_REV[v] ?? v.toUpperCase()) : []);
  const [physicalDesc, setPhysicalDesc] = useState<string | null>(currentUser?.physicalDesc ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const bioWords = countWords(bio);
  const isValid = bio.trim().length > 0 && interestedIn.length > 0 && lookingFor.length > 0 && physicalDesc !== null;

  const toggle = (value: string, values: string[], setValues: (v: string[]) => void) => setValues(values.includes(value) ? values.filter(v => v !== value) : [...values, value]);

  const handleSave = async () => {
    if (!isValid || isLoading) return;
    try {
      setIsLoading(true);
      await apiFetch('/profiles/me', { method: 'PATCH', body: JSON.stringify({ bio: bio.trim(), interestedIn, lookingFor, physicalDesc }) });
      await hydrateFromApi();
      const hasQuestions = (currentUser?.apiQuestions?.length ?? 0) > 0;
      router.replace(hasQuestions ? '/(tabs)' : '/setup-questions');
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de sauvegarder le profil');
    } finally { setIsLoading(false); }
  };

  return <ScrollView keyboardShouldPersistTaps="handled">
    <Text>Ton profil</Text>
    <Text>Quelques infos pour bien démarrer</Text>
    <Text>Bio</Text>
    <TextInput value={bio} onChangeText={setBio} placeholder="Dis-nous qui tu es, ce que tu aimes, ce qui te fait lever le matin…" multiline />
    <Text>{bioWords} mot{bioWords !== 1 ? 's' : ''}{bioWords < 50 ? ` — encore ${50 - bioWords} pour un profil complet` : ' — profil complet'}</Text>
    <Text>Je suis intéressé(e) par</Text>
    {INTERESTED_IN_OPTIONS.map(opt => <View key={opt.value}><Button title={`${interestedIn.includes(opt.value) ? '[X] ' : '[ ] '}${opt.label}`} onPress={() => toggle(opt.value, interestedIn, setInterestedIn)} /></View>)}
    <Text>Je cherche</Text>
    {LOOKING_FOR_OPTIONS.map(opt => <View key={opt.value}><Button title={`${lookingFor.includes(opt.value) ? '[X] ' : '[ ] '}${opt.label}`} onPress={() => toggle(opt.value, lookingFor, setLookingFor)} /></View>)}
    <Text>Je me décris physiquement comme</Text>
    {PHYSICAL_DESC_OPTIONS.map(opt => <View key={opt.value}><Button title={`${physicalDesc === opt.value ? '[X] ' : '[ ] '}${opt.label}`} onPress={() => setPhysicalDesc(opt.value)} /></View>)}
    <Button title={isLoading ? 'Enregistrement...' : "Entrer dans l'univers"} onPress={() => void handleSave()} disabled={!isValid || isLoading} />
    {canDiscover !== false ? <Button title="Passer pour l'instant" onPress={() => router.replace('/(tabs)')} /> : null}
  </ScrollView>;
}
