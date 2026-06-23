import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SalonParticipant } from '../data/salonsData';
import { Avatar } from '../avatar/png/Avatar';
import { DEFAULT_AVATAR, DEFAULT_AVATAR_MALE, DEFAULT_AVATAR_FEMALE } from '../avatar/png/defaults';
import { symbolique, transformations, cancellers } from '../data/offerings';

type TabType = 'profile' | 'offrir' | 'magie';

interface ParticipantActionsMenuProps {
  visible: boolean;
  participant: SalonParticipant | null;
  coins: number;
  onClose: () => void;
  onViewProfile: () => void;
  onSendOffering: (offeringId: string) => void;
  onSendMagie: (magieId: string) => void;
}

// Compact offerings selection - max 6 items
const FEATURED_OFFERINGS = ['rose', 'chocolat', 'champagne', 'bouquet', 'diamant', 'fleur'].slice(0, 6);

// Compact magies selection - max 6 items
const FEATURED_MAGIES = ['grenouille', 'ane', 'fantome', 'pirate', 'rockstar', 'break_kiss'].slice(0, 6);

export const ParticipantActionsMenu: React.FC<ParticipantActionsMenuProps> = ({
  visible,
  participant,
  coins,
  onClose,
  onViewProfile,
  onSendOffering,
  onSendMagie,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  if (!participant) return null;

  const avatarConfig = participant && (participant as any).avatarConfig
    ? (participant as any).avatarConfig
    : (participant.gender === 'F' ? DEFAULT_AVATAR_FEMALE
      : participant.gender === 'M' ? DEFAULT_AVATAR_MALE
      : DEFAULT_AVATAR);

  const featuredOfferings = symbolique.filter(o => FEATURED_OFFERINGS.includes(o.id));
  const featuredMagies = [...transformations, ...cancellers].filter(m => FEATURED_MAGIES.includes(m.id));

  const canAfford = (cost: number) => coins >= cost;
  const displayOfferings = featuredOfferings.slice(0, 6);
  const displayMagies = featuredMagies.slice(0, 6);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.closeArea}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Avatar size={50} {...(avatarConfig as any)} />
            <Text style={styles.name}>{participant.name}</Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
              onPress={() => setActiveTab('profile')}
            >
              <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
                Profil
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'offrir' && styles.tabActive]}
              onPress={() => setActiveTab('offrir')}
            >
              <Text style={[styles.tabText, activeTab === 'offrir' && styles.tabTextActive]}>
                Offrir
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'magie' && styles.tabActive]}
              onPress={() => setActiveTab('magie')}
            >
              <Text style={[styles.tabText, activeTab === 'magie' && styles.tabTextActive]}>
                Magie
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {activeTab === 'profile' && (
              <View style={styles.profileContent}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => {
                    onViewProfile();
                    onClose();
                  }}
                >
                  <Text style={styles.primaryButtonText}>Voir le profil complet</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === 'offrir' && (
              <View style={styles.gridContent}>
                {displayOfferings.length > 0 ? (
                  <View style={styles.grid}>
                    {displayOfferings.map(offering => (
                      <View key={offering.id} style={styles.gridItem}>
                        <Text style={styles.itemEmoji}>{offering.emoji}</Text>
                        <Text style={styles.itemName}>{offering.name}</Text>
                        <Text style={styles.itemCost}>{offering.cost} 💰</Text>
                        <TouchableOpacity
                          style={[
                            styles.sendButton,
                            !canAfford(offering.cost) && styles.sendButtonDisabled
                          ]}
                          onPress={() => {
                            onSendOffering(offering.id);
                            onClose();
                          }}
                          disabled={!canAfford(offering.cost)}
                        >
                          <Text style={styles.sendButtonText}>
                            {canAfford(offering.cost) ? 'Envoyer' : 'Trop cher'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>Aucune offrande disponible</Text>
                )}
                <Text style={styles.coinsDisplay}>💰 Vous avez {coins} pièces</Text>
              </View>
            )}

            {activeTab === 'magie' && (
              <View style={styles.gridContent}>
                {displayMagies.length > 0 ? (
                  <View style={styles.grid}>
                    {displayMagies.map(magie => (
                      <View key={magie.id} style={styles.gridItem}>
                        <Text style={styles.itemEmoji}>{magie.emoji}</Text>
                        <Text style={styles.itemName}>{magie.name}</Text>
                        <Text style={styles.itemCost}>{magie.cost} 💰</Text>
                        <TouchableOpacity
                          style={[
                            styles.sendButton,
                            !canAfford(magie.cost) && styles.sendButtonDisabled
                          ]}
                          onPress={() => {
                            onSendMagie(magie.id);
                            onClose();
                          }}
                          disabled={!canAfford(magie.cost)}
                        >
                          <Text style={styles.sendButtonText}>
                            {canAfford(magie.cost) ? 'Lancer' : 'Trop cher'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>Aucune magie disponible</Text>
                )}
                <Text style={styles.coinsDisplay}>💰 Vous avez {coins} pièces</Text>
              </View>
            )}
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Fermer</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 16,
  },
  closeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '100%',
    maxHeight: '55%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFF8E7',
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6D2',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3A2818',
    marginTop: 8,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5B7',
    backgroundColor: '#FAFAF8',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },
  tabActive: {
    borderBottomColor: '#667eea',
    backgroundColor: '#FFF',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#667eea',
  },
  content: {
    maxHeight: 200,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  profileContent: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#667eea',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  gridContent: {
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#F5F0E6',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8D5B7',
  },
  itemEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  itemName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3A2818',
    textAlign: 'center',
    marginBottom: 2,
    lineHeight: 12,
  },
  itemCost: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DAA520',
    marginBottom: 6,
  },
  sendButton: {
    backgroundColor: '#667eea',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
    width: '100%',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginVertical: 12,
  },
  coinsDisplay: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingVertical: 6,
  },
  closeButton: {
    backgroundColor: '#F5F0E6',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8D5B7',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
});
