import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getBlockedUsers, unblockUser, type BlockedUserDTO } from '../api/blockedUsers';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<BlockedUserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setLoading(true); setError(null); setUsers(await getBlockedUsers()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Impossible de charger les blocages.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const confirmUnblock = (user: BlockedUserDTO) => Alert.alert('Débloquer cette personne ?', `${user.pseudo} pourra de nouveau interagir avec toi.`, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Débloquer', onPress: async () => {
      try { setActioningId(user.userId); await unblockUser(user.userId); setUsers((prev) => prev.filter((item) => item.userId !== user.userId)); }
      catch (err) { Alert.alert('Erreur', err instanceof Error ? err.message : 'Déblocage impossible.'); }
      finally { setActioningId(null); }
    } },
  ]);
  if (loading) return <Text>Chargement...</Text>;
  return <ScrollView>
    <Text>Blocages</Text>
    <Text>Une personne bloquée ne peut plus accéder à ton profil ni interagir avec toi tant que le blocage reste actif.</Text>
    {error ? <><Text>{error}</Text><Button title="Réessayer" onPress={() => void load()} /></> : null}
    {!error && users.length === 0 ? <Text>Aucun blocage.</Text> : null}
    {users.map((user) => <View key={user.userId}>
      <Text>{user.pseudo}</Text>{user.city ? <Text>Ville : {user.city}</Text> : null}
      <Text>Bloqué le {new Date(user.blockedAt).toLocaleDateString('fr-FR')}</Text>
      <Button title={actioningId === user.userId ? 'Déblocage...' : 'Débloquer'} onPress={() => confirmUnblock(user)} disabled={actioningId !== null} />
    </View>)}
    <Button title="Actualiser" onPress={() => void load()} /><Button title="Retour" onPress={() => router.back()} />
  </ScrollView>;
}
