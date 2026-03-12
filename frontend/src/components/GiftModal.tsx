import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { gifts, magicPowers } from '../data/appData';
import { useStore } from '../store/useStore';

const { width } = Dimensions.get('window');

interface GiftModalProps {
  visible: boolean;
  onClose: () => void;
  recipientName?: string;
  onSendGift: (gift: any) => void;
}

export default function GiftModal({ visible, onClose, recipientName, onSendGift }: GiftModalProps) {
  const { coins, removeCoins } = useStore();

  const handleSendGift = (gift: any) => {
    if (removeCoins(gift.cost)) {
      onSendGift(gift);
      onClose();
    } else {
      // Pas assez de pièces
      alert('Pas assez de pièces!');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>✨ Offrandes</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {recipientName && (
            <Text style={styles.recipient}>Pour {recipientName}</Text>
          )}

          {/* Solde */}
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceText}>💰 {coins} pièces</Text>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Cadeaux */}
            <Text style={styles.sectionTitle}>🎁 Cadeaux</Text>
            <View style={styles.grid}>
              {gifts.map((gift) => (
                <TouchableOpacity
                  key={gift.id}
                  style={[
                    styles.giftItem,
                    coins < gift.cost && styles.giftItemDisabled,
                  ]}
                  onPress={() => handleSendGift(gift)}
                  disabled={coins < gift.cost}
                >
                  <Text style={styles.giftEmoji}>{gift.emoji}</Text>
                  <Text style={styles.giftName}>{gift.name}</Text>
                  <Text style={styles.giftCost}>{gift.cost} 💰</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Pouvoirs magiques */}
            <Text style={styles.sectionTitle}>🔮 Pouvoirs</Text>
            <View style={styles.grid}>
              {magicPowers.map((power) => (
                <TouchableOpacity
                  key={power.id}
                  style={[
                    styles.giftItem,
                    styles.powerItem,
                    coins < power.cost && styles.giftItemDisabled,
                  ]}
                  onPress={() => handleSendGift(power)}
                  disabled={coins < power.cost}
                >
                  <Text style={styles.giftEmoji}>{power.emoji}</Text>
                  <Text style={styles.giftName}>{power.name}</Text>
                  <Text style={styles.giftCost}>{power.cost} 💰</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFF8E7',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5B7',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3A2818',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8D5B7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 18,
    color: '#654321',
    fontWeight: '600',
  },
  recipient: {
    textAlign: 'center',
    fontSize: 14,
    color: '#8B6F47',
    marginTop: 8,
  },
  balanceContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  balanceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DAA520',
  },
  scrollView: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#654321',
    marginTop: 16,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  giftItem: {
    width: (width - 62) / 3,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  giftItemDisabled: {
    opacity: 0.5,
  },
  powerItem: {
    backgroundColor: '#F3E5F5',
  },
  giftEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  giftName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3A2818',
    textAlign: 'center',
  },
  giftCost: {
    fontSize: 11,
    color: '#DAA520',
    fontWeight: '700',
    marginTop: 4,
  },
});
