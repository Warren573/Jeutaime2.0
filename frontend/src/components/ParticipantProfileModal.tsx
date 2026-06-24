import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SalonParticipant } from '../data/salonsData';
import { getPublicProfile, type PublicProfileResponse } from '../api/profiles';
import { Avatar } from '../avatar/png/Avatar';
import { DEFAULT_AVATAR, DEFAULT_AVATAR_MALE, DEFAULT_AVATAR_FEMALE } from '../avatar/png/defaults';
import { resolveAvatarConfig } from '../avatar/resolveAvatarConfig';

interface ParticipantProfileModalProps {
  visible: boolean;
  participant: SalonParticipant | null;
  onClose: () => void;
  onSendSmile: (toUserId: string) => Promise<void>;
  onOpenReport: (participant: SalonParticipant) => void;
}

export const ParticipantProfileModal: React.FC<ParticipantProfileModalProps> = ({
  visible,
  participant,
  onClose,
  onSendSmile,
  onOpenReport,
}) => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<PublicProfileResponse | null>(null);
  const [smileLoading, setSmileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !participant) {
      setProfile(null);
      setError(null);
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPublicProfile(participant.id);
        setProfile(data);
      } catch (e) {
        setError('Profil non disponible');
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [visible, participant]);

  const handleSmile = async () => {
    if (!participant) return;
    setSmileLoading(true);
    try {
      await onSendSmile(participant.id);
      // Auto-close after smile sent (better UX)
      onClose();
    } finally {
      setSmileLoading(false);
    }
  };

  if (!participant) return null;

  const avatarResolution = resolveAvatarConfig(
    participant.id,
    (participant as any).avatarConfig,
    participant.gender,
    'ParticipantProfileModal'
  );
  const avatarConfig = avatarResolution.config;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header with visual dismiss indicator */}
          <View style={styles.dismissIndicator} />
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕ Fermer</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profil</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#667eea" />
              <Text style={styles.loadingText}>Chargement du profil...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={onClose} style={styles.retryButton}>
                <Text style={styles.retryText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          ) : profile ? (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Avatar */}
              <View style={styles.avatarSection}>
                <Avatar size={100} {...(avatarConfig as any)} />
              </View>

              {/* Basic Info */}
              <View style={styles.infoSection}>
                <Text style={styles.pseudo}>{profile.profile.pseudo || 'Sans nom'}</Text>
                <Text style={styles.details}>
                  {profile.profile.birthDate ? new Date(profile.profile.birthDate).getFullYear() > 0 ? new Date().getFullYear() - new Date(profile.profile.birthDate).getFullYear() : '?' : '?'} ans • {profile.profile.gender === 'F' ? 'Femme' : 'Homme'} {profile.profile.gender === 'F' ? '♀️' : '♂️'}
                </Text>
                {profile.profile.city && (
                  <Text style={styles.details}>📍 {profile.profile.city}</Text>
                )}
              </View>

              {/* Bio */}
              {profile.profile.bio ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>À propos</Text>
                  <Text style={styles.bioText}>{profile.profile.bio}</Text>
                </View>
              ) : null}

              {/* Interests */}
              {profile.profile.interests && profile.profile.interests.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Intérêts</Text>
                  <View style={styles.interestsContainer}>
                    {profile.profile.interests.map((interest, idx) => (
                      <View key={idx} style={styles.chip}>
                        <Text style={styles.chipText}>{interest}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Looking For */}
              {profile.profile.lookingFor && profile.profile.lookingFor.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Cherche</Text>
                  <View style={styles.interestsContainer}>
                    {profile.profile.lookingFor.map((item, idx) => (
                      <View key={idx} style={[styles.chip, styles.chipSecondary]}>
                        <Text style={styles.chipText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Badges & Points */}
              <View style={styles.section}>
                <View style={styles.pointsRow}>
                  <Text style={styles.points}>⭐ {profile.profile.points} points</Text>
                  {profile.profile.vibe && (
                    <Text style={styles.vibe}>Vibe: {profile.profile.vibe}</Text>
                  )}
                </View>
              </View>

              {/* Quotes */}
              {profile.profile.quote ? (
                <View style={styles.section}>
                  <Text style={styles.quoteText}>"{profile.profile.quote}"</Text>
                </View>
              ) : null}
            </ScrollView>
          ) : null}

          {/* Footer Buttons */}
          {!loading && !error && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.smileButton]}
                onPress={handleSmile}
                disabled={smileLoading}
              >
                {smileLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>❤️ Envoyer un sourire</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.reportButtonDisabled]}
                disabled
              >
                <Text style={styles.reportButtonDisabledText}>🚩 Signaler (Phase 2)</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '75%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  dismissIndicator: {
    height: 4,
    width: 40,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    color: '#666',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pseudo: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  details: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  section: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#e8eef7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#c5d3f0',
  },
  chipSecondary: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ddd',
  },
  chipText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  points: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  vibe: {
    fontSize: 12,
    color: '#999',
  },
  quoteText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 18,
    paddingHorizontal: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#667eea',
  },
  footer: {
    flexDirection: 'column',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smileButton: {
    backgroundColor: '#667eea',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  reportButtonDisabled: {
    backgroundColor: '#f5f5f5',
  },
  reportButtonDisabledText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ccc',
  },
});
