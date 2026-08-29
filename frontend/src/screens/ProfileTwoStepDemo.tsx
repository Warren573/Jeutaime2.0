import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import {
  blockProfile,
  discoverProfiles,
  reportUser,
  type DiscoveryProfileDto,
  type ReportReason,
} from '../api/profiles';
import { sendReaction } from '../api/reactions';

const PHYSIQUE_LABEL: Record<string, string> = {
  filiforme: 'Filiforme',
  ras_motte: 'Ras motte',
  grande_gigue: 'Grande gigue',
  doux: 'Grande beauté intérieure',
  athletique: 'Athlétique',
  costaud: 'En formes généreuses',
  mignon: 'Moyenne',
  mysterieux: 'Musclé·e',
};

const LOOKING_FOR_LABEL: Record<string, string> = {
  relation: "J'ai vu de la lumière, je suis entré·e",
  flirt: 'Rien de trop sérieux',
  amitie: "Des affinités, d'abord",
  discussion: 'Je cherche à discuter',
  serieux: "Je cherche l'âme sœur",
  RELATION: "J'ai vu de la lumière, je suis entré·e",
  FLIRT: 'Rien de trop sérieux',
  AMITIE: "Des affinités, d'abord",
  DISCUSSION: 'Je cherche à discuter',
  SERIEUX: "Je cherche l'âme sœur",
};

const REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'HARASSMENT', label: 'Harcèlement' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'FAKE', label: 'Faux profil' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Contenu inapproprié' },
  { value: 'MINOR', label: 'Mineur' },
  { value: 'OTHER', label: 'Autre' },
];

function computeAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const month = now.getMonth() - dob.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < dob.getDate())) age--;
  return age >= 0 ? age : null;
}

export default function ProfileTwoStepDemo() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ filter?: string }>();
  const currentUser = useStore(s => s.currentUser);
  const allMatches = useStore(s => s.matches);
  const matchPartners = useStore(s => s.matchPartners);
  const loadMatches = useStore(s => s.loadMatches);
  const receivedOnly = searchParams.filter === 'received-smiles';

  const [currentProfile, setCurrentProfile] = useState<DiscoveryProfileDto | null>(null);
  const [remainingProfiles, setRemainingProfiles] = useState<DiscoveryProfileDto[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reacting, setReacting] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [showReasons, setShowReasons] = useState(false);
  const [safetyActioning, setSafetyActioning] = useState(false);

  useEffect(() => {
    setCurrentProfile(null);
    setRemainingProfiles([]);
    setRemovedIds(new Set());
    setError(null);
    setShowSafety(false);
    setShowReasons(false);
  }, [currentUser?.id]);

  const load = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    setError(null);
    try {
      if (receivedOnly && allMatches.length > 0) {
        const profiles = allMatches
          .filter(m => m.initiatorId !== currentUser.id)
          .map(m => ({ match: m, otherUserId: m.userAId === currentUser.id ? m.userBId : m.userAId }))
          .filter(({ otherUserId }) => !removedIds.has(otherUserId))
          .map(({ otherUserId }) => {
            const partner = matchPartners[otherUserId];
            return {
              userId: otherUserId,
              pseudo: partner?.pseudo ?? 'Anonyme',
              birthDate: partner?.birthDate ? String(partner.birthDate) : undefined,
              gender: 'AUTRE' as const,
              city: partner?.city ?? '',
              bio: partner?.bio ?? '',
              physicalDesc: partner?.physicalDesc,
              avatarConfig: partner?.avatarConfig,
              verified: false,
              photoUri: undefined,
              visibility: 'avatar' as const,
              lookingFor: [],
              points: 0,
              badges: [],
            };
          })
          .filter((p, index, array) => array.findIndex(item => item.userId === p.userId) === index);
        setCurrentProfile(profiles[0] ?? null);
        setRemainingProfiles(profiles.slice(1));
      } else {
        const result = await discoverProfiles({ pageSize: 50 });
        const profiles = result.data.filter(p => p.userId !== currentUser.id && !removedIds.has(p.userId));
        setCurrentProfile(profiles[0] ?? null);
        setRemainingProfiles(profiles.slice(1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, removedIds, receivedOnly, allMatches, matchPartners]);

  useEffect(() => { if (currentUser?.id) void load(); }, [currentUser?.id]);

  const advance = () => {
    if (!currentProfile) return;
    const nextRemoved = new Set(removedIds);
    nextRemoved.add(currentProfile.userId);
    setCurrentProfile(remainingProfiles[0] ?? null);
    setRemainingProfiles(remainingProfiles.slice(1));
    setRemovedIds(nextRemoved);
    setShowSafety(false);
    setShowReasons(false);
  };

  const handleBlock = async () => {
    if (!currentProfile || safetyActioning) return;
    const confirmed = typeof globalThis.confirm === 'function'
      ? globalThis.confirm('Bloquer cette personne ?')
      : true;
    if (!confirmed) return;
    setSafetyActioning(true);
    try {
      await blockProfile(currentProfile.userId);
      advance();
      Alert.alert('Personne bloquée');
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible de bloquer ce profil');
    } finally {
      setSafetyActioning(false);
    }
  };

  const handleReport = async (reason: ReportReason) => {
    if (!currentProfile || safetyActioning) return;
    setSafetyActioning(true);
    try {
      await reportUser(currentProfile.userId, reason);
      advance();
      Alert.alert('Signalement envoyé');
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : "Impossible d'envoyer le signalement");
    } finally {
      setSafetyActioning(false);
    }
  };

  const handleReact = async (type: 'SMILE' | 'GRIMACE') => {
    if (!currentProfile || reacting || !currentUser?.id) return;
    if (currentProfile.userId === currentUser.id) return;

    const previousCurrent = currentProfile;
    const previousRemaining = remainingProfiles;
    const previousRemoved = removedIds;
    const nextRemoved = new Set(removedIds);
    nextRemoved.add(currentProfile.userId);

    setReacting(true);
    setShowSafety(false);
    setShowReasons(false);
    setCurrentProfile(remainingProfiles[0] ?? null);
    setRemainingProfiles(remainingProfiles.slice(1));
    setRemovedIds(nextRemoved);

    try {
      const result = await sendReaction(previousCurrent.userId, type);
      if (type === 'SMILE' && result.debugBranch === 'NEW-MATCH') {
        await loadMatches();
        router.push('/(tabs)/letters');
      }
    } catch (err) {
      setCurrentProfile(previousCurrent);
      setRemainingProfiles(previousRemaining);
      setRemovedIds(previousRemoved);
      Alert.alert('Erreur', err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setReacting(false);
    }
  };

  if (loading) return <View><Text>Chargement...</Text></View>;
  if (error) return <View><Text>Erreur : {error}</Text><Button title="Réessayer" onPress={load} /></View>;
  if (!currentProfile) return <View><Text>Aucun profil à découvrir.</Text><Button title="Actualiser" onPress={load} /></View>;

  const profile = currentProfile;
  const age = computeAge(profile.birthDate ?? undefined);
  const lookingFor = (profile.lookingFor ?? []).map(id => LOOKING_FOR_LABEL[id] ?? id).join(', ');
  const physique = profile.physicalDesc ? PHYSIQUE_LABEL[profile.physicalDesc] ?? profile.physicalDesc : '';

  return (
    <ScrollView>
      <Text>{receivedOnly ? 'Sourires reçus' : 'Découvrir'}</Text>
      <Text>Profils restants : {remainingProfiles.length + 1}</Text>
      <Text>Pseudo : {profile.pseudo || 'Anonyme'}</Text>
      {age !== null && <Text>Âge : {age}</Text>}
      {profile.city ? <Text>Ville : {profile.city}</Text> : null}
      {profile.bio ? <Text>Bio : {profile.bio}</Text> : null}
      {lookingFor ? <Text>Recherche : {lookingFor}</Text> : null}
      {physique ? <Text>Physique : {physique}</Text> : null}
      <Text>Photo / avatar : masqué dans cette version de test</Text>

      <Button title="Découvrir le profil" onPress={() => router.push({ pathname: '/profile/[id]', params: { id: profile.userId } })} />
      <Button title="Grimace" disabled={reacting} onPress={() => void handleReact('GRIMACE')} />
      <Button title="Sourire" disabled={reacting} onPress={() => void handleReact('SMILE')} />
      <Button title="Sécurité" onPress={() => { setShowReasons(false); setShowSafety(value => !value); }} />

      {showSafety && !showReasons && (
        <View>
          <Button title="Signaler" onPress={() => setShowReasons(true)} />
          <Button title="Bloquer" disabled={safetyActioning} onPress={() => void handleBlock()} />
        </View>
      )}
      {showSafety && showReasons && (
        <View>
          <Text>Motif du signalement</Text>
          {REPORT_REASONS.map(reason => (
            <Button key={reason.value} title={reason.label} disabled={safetyActioning} onPress={() => void handleReport(reason.value)} />
          ))}
          <Button title="Retour" onPress={() => setShowReasons(false)} />
        </View>
      )}
    </ScrollView>
  );
}
