import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import ProfileDetailScreen from '../../src/screens/ProfileDetailScreen';
import { getReactionStatus, sendReaction, type ReactionStatusDTO } from '../../src/api/reactions';
import { listMatches, type MatchDTO } from '../../src/api/matches';
import { useStore } from '../../src/store/useStore';

export default function ProfileRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; source?: string; bottleId?: string }>();
  const currentUser = useStore((state) => state.currentUser);
  const profileId = Array.isArray(params.id) ? params.id[0] : params.id;
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  const isBottleContext = source === 'bottle';

  const [matches, setMatches] = useState<MatchDTO[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [isSmiling, setIsSmiling] = useState(false);
  const [isLoadingReaction, setIsLoadingReaction] = useState(false);
  const [reactionStatus, setReactionStatus] = useState<ReactionStatusDTO | null>(null);

  const isOwnProfile = !!profileId && currentUser?.id === profileId;

  useEffect(() => {
    let active = true;
    if (!isBottleContext || !profileId || isOwnProfile) return;

    setIsLoadingMatches(true);
    setIsLoadingReaction(true);

    listMatches()
      .then((items) => {
        if (active) setMatches(items);
      })
      .catch(() => {
        if (active) setMatches([]);
      })
      .finally(() => {
        if (active) setIsLoadingMatches(false);
      });

    getReactionStatus(profileId)
      .then((status) => {
        if (active) setReactionStatus(status);
      })
      .catch(() => {
        if (active) setReactionStatus(null);
      })
      .finally(() => {
        if (active) setIsLoadingReaction(false);
      });

    return () => {
      active = false;
    };
  }, [profileId, isOwnProfile, isBottleContext]);

  const relationMatch = useMemo(
    () => matches.find((match) => match.otherUserId === profileId && (match.status === 'ACTIVE' || match.status === 'PENDING')),
    [matches, profileId],
  );

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === 'web' && typeof globalThis.alert === 'function') {
      globalThis.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const handleSmile = async () => {
    if (!profileId || isOwnProfile || isSmiling || reactionStatus?.outgoingType === 'SMILE') return;

    setIsSmiling(true);
    try {
      const result = await sendReaction(profileId, 'SMILE');
      const refreshedStatus = await getReactionStatus(profileId).catch(() => ({
        outgoingType: 'SMILE' as const,
        incomingType: null,
        mutualSmile: result.matchCreated,
      }));
      setReactionStatus(refreshedStatus);

      if (refreshedStatus.mutualSmile) {
        showMessage('Sourire mutuel', 'Le sourire est partagé. Vous pouvez continuer depuis vos Lettres.');
        const refreshed = await listMatches().catch(() => []);
        setMatches(refreshed);
      } else {
        showMessage('Sourire envoyé', 'Votre sourire a bien été envoyé.');
      }
    } catch (error: any) {
      showMessage('Erreur', error?.message || "Impossible d'envoyer le sourire");
    } finally {
      setIsSmiling(false);
    }
  };

  const handleContinue = () => {
    router.push('/(tabs)/letters' as never);
  };

  const smileAlreadySent = reactionStatus?.outgoingType === 'SMILE';
  const mutualSmile = reactionStatus?.mutualSmile === true;

  return (
    <View style={styles.container}>
      <ProfileDetailScreen />

      {isBottleContext && !isOwnProfile && profileId && (
        <View style={styles.actions}>
          {!mutualSmile && (
            <TouchableOpacity
              style={[styles.smileButton, (isSmiling || isLoadingReaction || smileAlreadySent) && styles.disabledButton]}
              onPress={() => void handleSmile()}
              disabled={isSmiling || isLoadingReaction || smileAlreadySent}
              activeOpacity={0.8}
            >
              {isSmiling || isLoadingReaction ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.smileText}>{smileAlreadySent ? '😊 Sourire envoyé' : '😊 Envoyer un sourire'}</Text>
              )}
            </TouchableOpacity>
          )}

          {(relationMatch || isLoadingMatches) && (
            <TouchableOpacity
              style={[styles.continueButton, isLoadingMatches && styles.disabledButton]}
              onPress={handleContinue}
              disabled={isLoadingMatches}
              activeOpacity={0.8}
            >
              {isLoadingMatches ? (
                <ActivityIndicator size="small" color="#8B2E3C" />
              ) : (
                <Text style={styles.continueText}>✉️ Continuer la discussion</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actions: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    gap: 10,
  },
  smileButton: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: '#8B2E3C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  smileText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  continueButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#8B2E3C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  continueText: {
    color: '#8B2E3C',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.65,
  },
});