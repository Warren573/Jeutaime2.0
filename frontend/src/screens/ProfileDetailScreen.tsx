import React, { useEffect, useMemo, useState } from 'react';
import { Button, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getPublicProfile, reportUser, type PublicProfileResponse } from '../api/profiles';
import { useStore } from '../store/useStore';

const LOOKING_FOR_LABEL: Record<string, string> = {
  relation: "L'âme sœur", RELATION: "L'âme sœur", serieux: "L'âme sœur", SERIEUX: "L'âme sœur",
  flirt: 'Rien de trop sérieux', FLIRT: 'Rien de trop sérieux',
  amitie: "Des affinités d'abord", AMITIE: "Des affinités d'abord",
  discussion: 'Discuter', DISCUSSION: 'Discuter',
};
const INTERESTED_IN_LABEL: Record<string, string> = { F:'Femmes', FEMME:'Femmes', women:'Femmes', WOMEN:'Femmes', M:'Hommes', HOMME:'Hommes', men:'Hommes', MEN:'Hommes', NB:'Non-binaires', AUTRE:'Non-binaires', other:'Non-binaires', OTHER:'Non-binaires' };
const PHYSICAL_DESC_LABEL: Record<string, string> = { filiforme:'Filiforme', ras_motte:'Ras des mottes', grande_gigue:'Grande gigue', doux:'Grande beauté intérieure', beaute_int:'Grande beauté intérieure', athletique:'Athlétique', costaud:'En formes généreuses', genereuse:'En formes généreuses', mignon:'Dans la moyenne', moyenne:'Dans la moyenne', mysterieux:'Musclé·e', muscle:'Musclé·e' };

function calcAge(birthDate?: string | null) {
  if (!birthDate) return null;
  const birth = new Date(birthDate); if (Number.isNaN(birth.getTime())) return null;
  const now = new Date(); let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return age;
}
function arr(v: unknown): string[] { return Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean) : []; }

export default function ProfileDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const profileId = Array.isArray(params.id) ? params.id[0] : params.id;
  const currentUser = useStore(s => s.currentUser);
  const [data, setData] = useState<PublicProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const isOwnProfile = !!profileId && currentUser?.id === profileId;

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!profileId) { setError('Profil introuvable'); setLoading(false); return; }
      try { setLoading(true); const result = await getPublicProfile(profileId); if (mounted) setData(result); }
      catch (e: any) { if (mounted) setError(e?.message || 'Impossible de charger le profil'); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [profileId]);

  const profile = data?.profile;
  const age = useMemo(() => calcAge(profile?.birthDate), [profile?.birthDate]);
  const report = async () => {
    if (!profileId || isOwnProfile || reporting) return;
    try { setReporting(true); await reportUser(profileId, 'OTHER'); }
    catch (e: any) { setError(e?.message || 'Impossible de signaler ce profil'); }
    finally { setReporting(false); }
  };

  if (loading) return <View><Text>Chargement...</Text></View>;
  if (error || !profile) return <View><Text>{error || 'Profil introuvable'}</Text><Button title="Retour" onPress={() => router.back()} /></View>;

  const lookingFor = arr(profile.lookingFor).map(v => LOOKING_FOR_LABEL[v] || v);
  const interestedIn = arr(profile.interestedIn).map(v => INTERESTED_IN_LABEL[v] || v);
  const identityTags = arr(profile.identityTags);
  const skills = Array.isArray(profile.skills) ? profile.skills.filter(s => s?.label || s?.detail).slice(0, 3) : [];

  return (
    <ScrollView>
      <Text>Profil</Text>
      <Text>Pseudo : {profile.pseudo || '-'}</Text>
      <Text>Âge : {age ?? '-'}</Text>
      <Text>Ville : {profile.city || '-'}</Text>
      <Text>Bio : {profile.bio?.trim() || '-'}</Text>
      <Text>Taille : {profile.height ? `${profile.height} cm` : '-'}</Text>
      <Text>Description physique : {PHYSICAL_DESC_LABEL[String(profile.physicalDesc || '')] || profile.physicalDesc || '-'}</Text>
      <Text>Recherche : {lookingFor.join(', ') || '-'}</Text>
      <Text>Souhaite rencontrer : {interestedIn.join(', ') || '-'}</Text>
      <Text>Traits d'identité : {identityTags.join(', ') || '-'}</Text>
      <Text>Enfants : {profile.hasChildren === true ? 'Oui' : profile.hasChildren === false ? 'Non' : 'Non précisé'}</Text>
      <Text>Souhaite des enfants : {profile.wantsChildren === true ? 'Oui' : profile.wantsChildren === false ? 'Non' : 'Non précisé'}</Text>
      <Text>Compétences / talents</Text>
      {skills.length === 0 && <Text>Aucune compétence renseignée.</Text>}
      {skills.map((s, i) => <View key={i}>{s.label ? <Text>{s.label}</Text> : null}{s.detail ? <Text>{s.detail}</Text> : null}</View>)}
      {isOwnProfile ? <Button title="Modifier mon profil" onPress={() => router.push('/edit-profile' as never)} /> : <Button title={reporting ? 'Signalement...' : 'Signaler ce profil'} onPress={report} disabled={reporting} />}
      <Button title="Retour" onPress={() => router.back()} />
    </ScrollView>
  );
}
