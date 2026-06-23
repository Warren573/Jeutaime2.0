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

// Featured offerings for quick access
const FEATURED_OFFERINGS = ['rose', 'chocolat', 'champagne', 'diamant', 'bouquet'];

// Featured magies for quick access (transformations + select cancellers)
const FEATURED_MAGIES = ['grenouille', 'ane', 'fantome', 'pirate', 'rockstar', 'break_kiss'];

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
            <Avatar size={70} {...(avatarConfig as any)} />
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
                {featuredOfferings.length > 0 ? (
                  <View style={styles.grid}>
                    {featuredOfferings.map(offering => (
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
                {featuredMagies.length > 0 ? (
                  <View style={styles.grid}>
                    {featuredMagies.map(magie => (
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
    paddingHorizontal: 12,
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
    borderRadius: 24,
    width: '100%',
    maxHeight: '85%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: 'linear-gradient(135deg, #FFF8E7 0%, #FFF 100%)',
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6D2',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3A2818',
    marginTop: 12,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5B7',
    backgroundColor: '#FAFAF8',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },
  tabActive: {
    borderBottomColor: '#667eea',
    backgroundColor: '#FFF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#667eea',
  },
  content: {
    minHeight: 200,
    maxHeight: 350,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  profileContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#667eea',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  gridContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  gridItem: {
    width: '31%',
    backgroundColor: '#F5F0E6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8D5B7',
  },
  itemEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  itemName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3A2818',
    textAlign: 'center',
    marginBottom: 4,
  },
  itemCost: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DAA520',
    marginBottom: 8,
  },
  sendButton: {
    backgroundColor: '#667eea',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#999',
    marginVertical: 20,
  },
  coinsDisplay: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  closeButton: {
    backgroundColor: '#F5F0E6',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8D5B7',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
});
