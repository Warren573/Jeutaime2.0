import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../../src/components/Avatar';

const conversations = [
  { id: 1, name: 'Sophie', lastMsg: 'C\'est super nos échanges!', time: '2h', unread: true },
  { id: 2, name: 'Emma', lastMsg: 'Tu as vu mon dernier message?', time: '1j', unread: false },
  { id: 3, name: 'Chloé', lastMsg: '🌹 Merci pour la rose!', time: '2j', unread: false },
  { id: 4, name: 'Léa', lastMsg: 'On se retrouve au Café?', time: '3j', unread: true },
];

export default function LettersScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💌 Lettres</Text>
        <Text style={styles.headerSubtitle}>Vos conversations</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {conversations.map((conv) => (
          <TouchableOpacity key={conv.id} style={styles.convCard}>
            <View style={styles.avatarContainer}>
              <Avatar name={conv.name} size={55} online={conv.unread} />
              {conv.unread && <View style={styles.unreadBadge} />}
            </View>
            <View style={styles.convInfo}>
              <Text style={styles.convName}>{conv.name}</Text>
              <Text style={styles.convMsg} numberOfLines={1}>{conv.lastMsg}</Text>
            </View>
            <Text style={styles.convTime}>{conv.time}</Text>
          </TouchableOpacity>
        ))}

        {/* Empty state */}
        {conversations.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💌</Text>
            <Text style={styles.emptyText}>Pas encore de lettres</Text>
            <Text style={styles.emptySubtext}>Découvrez des profils et envoyez votre première lettre!</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5B7',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3A2818',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8B6F47',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E91E63',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  convInfo: {
    flex: 1,
    marginLeft: 14,
  },
  convName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#3A2818',
  },
  convMsg: {
    fontSize: 14,
    color: '#8B6F47',
    marginTop: 4,
  },
  convTime: {
    fontSize: 12,
    color: '#B8860B',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3A2818',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8B6F47',
    marginTop: 8,
    textAlign: 'center',
  },
});
