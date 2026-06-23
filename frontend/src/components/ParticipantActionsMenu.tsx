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
import { symbolique, transformations, cancellers } from '../data/offerings';

type ViewType = 'menu' | 'offrandes' | 'magies';

interface ParticipantActionsMenuProps {
  visible: boolean;
  participant: SalonParticipant | null;
  coins: number;
  onClose: () => void;
  onNavigateToProfile: () => void;
  onSendOffering: (offeringId: string) => void;
  onSendMagie: (magieId: string) => void;
}

// Compact selections
const FEATURED_OFFERINGS = ['rose', 'chocolat', 'bouquet', 'champagne', 'diamant'];
const FEATURED_MAGIES = ['grenouille', 'ane', 'fantome', 'rockstar', 'break_kiss'];

export const ParticipantActionsMenu: React.FC<ParticipantActionsMenuProps> = ({
  visible,
  participant,
  coins,
  onClose,
  onNavigateToProfile,
  onSendOffering,
  onSendMagie,
}) => {
  const [currentView, setCurrentView] = useState<ViewType>('menu');

  if (!participant) return null;

  const featuredOfferings = symbolique.filter(o => FEATURED_OFFERINGS.includes(o.id));
  const featuredMagies = [...transformations, ...cancellers].filter(m => FEATURED_MAGIES.includes(m.id));
  const canAfford = (cost: number) => coins >= cost;

  const handleOfferingClick = (offeringId: string) => {
    onSendOffering(offeringId);
    onClose();
  };

  const handleMagieClick = (magieId: string) => {
    onSendMagie(magieId);
    onClose();
  };

  const handleViewProfile = () => {
    onNavigateToProfile();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.closeArea}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={styles.menu}>
          {currentView === 'menu' && (
            <>
              {/* Header with close button */}
              <View style={styles.header}>
                <Text style={styles.title}>{participant.name}</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Main menu actions */}
              <TouchableOpacity
                style={styles.action}
                onPress={handleViewProfile}
              >
                <Text style={styles.actionIcon}>👤</Text>
                <Text style={styles.actionText}>Voir le profil</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.action}
                onPress={() => setCurrentView('offrandes')}
              >
                <Text style={styles.actionIcon}>🎁</Text>
                <Text style={styles.actionText}>Offrandes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.action}
                onPress={() => setCurrentView('magies')}
              >
                <Text style={styles.actionIcon}>✨</Text>
                <Text style={styles.actionText}>Magies</Text>
              </TouchableOpacity>
            </>
          )}

          {currentView === 'offrandes' && (
            <>
              {/* Back button + title */}
              <View style={styles.subheader}>
                <TouchableOpacity
                  onPress={() => setCurrentView('menu')}
                  style={styles.backBtn}
                >
                  <Text style={styles.backBtnText}>← Offrandes</Text>
                </TouchableOpacity>
              </View>

              {/* Offerings list */}
              <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
                {featuredOfferings.map(offering => (
                  <TouchableOpacity
                    key={offering.id}
                    style={[
                      styles.listItem,
                      !canAfford(offering.cost) && styles.listItemDisabled
                    ]}
                    onPress={() => canAfford(offering.cost) && handleOfferingClick(offering.id)}
                    disabled={!canAfford(offering.cost)}
                  >
                    <Text style={styles.listItemEmoji}>{offering.emoji}</Text>
                    <Text style={styles.listItemName}>{offering.name}</Text>
                    <Text style={styles.listItemPrice}>{offering.cost} 💰</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {currentView === 'magies' && (
            <>
              {/* Back button + title */}
              <View style={styles.subheader}>
                <TouchableOpacity
                  onPress={() => setCurrentView('menu')}
                  style={styles.backBtn}
                >
                  <Text style={styles.backBtnText}>← Magies</Text>
                </TouchableOpacity>
              </View>

              {/* Magies list */}
              <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
                {featuredMagies.map(magie => (
                  <TouchableOpacity
                    key={magie.id}
                    style={[
                      styles.listItem,
                      !canAfford(magie.cost) && styles.listItemDisabled
                    ]}
                    onPress={() => canAfford(magie.cost) && handleMagieClick(magie.id)}
                    disabled={!canAfford(magie.cost)}
                  >
                    <Text style={styles.listItemEmoji}>{magie.emoji}</Text>
                    <Text style={styles.listItemName}>{magie.name}</Text>
                    <Text style={styles.listItemPrice}>{magie.cost} 💰</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  closeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  menu: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 380,
    maxHeight: '40%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  // Main menu
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5B7',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A2818',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 18,
    color: '#999',
    fontWeight: '600',
  },

  action: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E6',
  },
  actionIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3A2818',
  },

  // Offrandes / Magies views
  subheader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5B7',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },

  listContainer: {
    maxHeight: 300,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E6',
  },
  listItemDisabled: {
    opacity: 0.5,
  },
  listItemEmoji: {
    fontSize: 18,
    marginRight: 10,
    width: 24,
  },
  listItemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#3A2818',
  },
  listItemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DAA520',
  },
});
