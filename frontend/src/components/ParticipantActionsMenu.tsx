import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SalonParticipant } from '../data/salonsData';
import { Avatar } from '../avatar/png/Avatar';
import { DEFAULT_AVATAR, DEFAULT_AVATAR_MALE, DEFAULT_AVATAR_FEMALE } from '../avatar/png/defaults';

interface ParticipantActionsMenuProps {
  visible: boolean;
  participant: SalonParticipant | null;
  onClose: () => void;
  onViewProfile: () => void;
  onOffrir: () => void;
  onMagie: () => void;
}

export const ParticipantActionsMenu: React.FC<ParticipantActionsMenuProps> = ({
  visible,
  participant,
  onClose,
  onViewProfile,
  onOffrir,
  onMagie,
}) => {
  if (!participant) return null;

  const avatarConfig = participant && (participant as any).avatarConfig
    ? (participant as any).avatarConfig
    : (participant.gender === 'F' ? DEFAULT_AVATAR_FEMALE
      : participant.gender === 'M' ? DEFAULT_AVATAR_MALE
      : DEFAULT_AVATAR);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close on outside tap */}
          <TouchableOpacity
            style={styles.closeArea}
            onPress={onClose}
          />

          <View style={styles.menu}>
            {/* Avatar et nom */}
            <View style={styles.header}>
              <Avatar size={60} {...(avatarConfig as any)} />
              <Text style={styles.name}>{participant.name}</Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={() => {
                  onViewProfile();
                  onClose();
                }}
              >
                <Text style={styles.primaryButtonText}>Voir le profil</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.actionButton]}
                onPress={() => {
                  onOffrir();
                  onClose();
                }}
              >
                <Text style={styles.actionButtonText}>Offrir</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.actionButton]}
                onPress={() => {
                  onMagie();
                  onClose();
                }}
              >
                <Text style={styles.actionButtonText}>Magie</Text>
              </TouchableOpacity>
            </View>

            {/* Close button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  menu: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A2818',
    marginTop: 10,
  },
  actions: {
    width: '100%',
    gap: 10,
    marginBottom: 12,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#667eea',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  actionButton: {
    backgroundColor: '#F5F0E6',
    borderWidth: 1,
    borderColor: '#E8D5B7',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3A2818',
  },
  cancelButton: {
    paddingVertical: 10,
  },
  cancelButtonText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
});
