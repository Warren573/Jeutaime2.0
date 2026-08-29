import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, ScrollView, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getUserSettings, updateUserSettings, type UserSettingsDTO } from '../api/userSettings';

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettingsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof UserSettingsDTO | null>(null);
  const load = useCallback(async () => {
    try { setLoading(true); setSettings(await getUserSettings()); }
    catch (error) { Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de charger les réglages.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const toggle = async (key: 'showInDiscovery' | 'locationShared', value: boolean) => {
    if (!settings || savingKey) return;
    const previous = settings;
    setSettings({ ...settings, [key]: value }); setSavingKey(key);
    try { setSettings(await updateUserSettings({ [key]: value })); }
    catch (error) { setSettings(previous); Alert.alert('Erreur', error instanceof Error ? error.message : 'Modification impossible.'); }
    finally { setSavingKey(null); }
  };
  if (loading || !settings) return <Text>Chargement...</Text>;
  return <ScrollView>
    <Text>Confidentialité du profil</Text>
    <View><Text>Apparaître dans la découverte</Text><Text>Désactive ce réglage pour ne plus être proposé aux autres profils.</Text><Switch value={settings.showInDiscovery} onValueChange={(v) => void toggle('showInDiscovery', v)} disabled={savingKey !== null} /></View>
    <View><Text>Partager ma localisation</Text><Text>Autorise l'utilisation de ta ville comme information de proximité. Aucune position GPS précise n'est stockée ici.</Text><Switch value={settings.locationShared} onValueChange={(v) => void toggle('locationShared', v)} disabled={savingKey !== null} /></View>
    <Text>Ces réglages sont enregistrés sur ton compte.</Text>
    <Button title="Actualiser" onPress={() => void load()} /><Button title="Retour" onPress={() => router.back()} />
  </ScrollView>;
}
