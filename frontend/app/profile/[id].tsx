import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import ProfileDetailScreen from '../../src/screens/ProfileDetailScreen';
import { sendReaction } from '../../src/api/reactions';
import { listMatches, type MatchDTO } from '../../src/api/matches';
import { useStore } from '../../src/store/useStore';

export default function ProfileRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const currentUser = useStore((state) => state.currentUser);
  const profileId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [matches, setMatches] = useState<MatchDTO[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [isSmiling, setIsSmiling] = useState(false);
  const [smileSent, setSmileSent] = useState(false);

  const isOwnProfile = !!profileId && currentUser?.id === profileId;

  useEffect(() => {
    let active = true;
    if (!profileId || isOwnProfile) return;

    setIsLoadingMatches(true);
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

    return () => {
      active = false;
    };
  }, [profileId, isOwnProfile]);

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
    if (!profileId || isOwnProfile || isSmiling) return;

    setIsSmiling(true);
    try {
      const result = await sendReaction(profileId, 'SMILE');
      setSmileSent(true);

      if (result.matchCreated) {
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

  return (
    <View style={styles.container}>
      <ProfileDetailScreen />

      {!isOwnProfile && profileId && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.smileButton, (isSmiling || smileSent) && styles.disabledButton]}
            onPress={() => void handleSmile()}
            disabled={isSmiling || smileSent}
            activeOpacity={0.8}
          >
            {isSmiling ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.smileText}>{smileSent ? '😊 Sourire envoyé' : '😊 Envoyer un sourire'}</Text>
            )}
          </TouchableOpacity>

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
