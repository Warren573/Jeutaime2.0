import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Avatar } from '../avatar/png/Avatar';
import { DEFAULT_AVATAR } from '../avatar/png/defaults';

export default function DuelCreateScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { matches, currentUser } = useStore();

  // Construire la liste des contacts à partir des matchs réels
  const contacts = matches.map((m) => {
    const name = m.userAId === 'me' ? m.userBId : m.userAId;
    return { id: m.id, name };
  });

  const handleSelect = (contact: { id: string; name: string }) => {
    router.push({
      pathname: '/duel/play',
      params: { opponentId: contact.id, opponentName: contact.name },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← Retour</Text>
        </Pressable>
        <Text style={styles.title}>🎮 Lancer un duel</Text>
        <Text style={styles.subtitle}>Choisis un contact à défier</Text>
      </View>

      {contacts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💌</Text>
          <Text style={styles.emptyText}>Aucun contact disponible</Text>
          <Text style={styles.emptySubtext}>Fais des matchs d'abord pour pouvoir défier quelqu'un</Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => handleSelect(item)}>
              <Avatar size={50} {...DEFAULT_AVATAR} />
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.challengeBtn}>
                <Text style={styles.challengeText}>Défier</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141625',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  back: {
    color: '#B47CFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 14,
  },
  title: {
    color: '#F8F6FF',
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 14,
    marginTop: 6,
  },

  list: {
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2032',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  name: {
    flex: 1,
    color: '#F8F6FF',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 14,
  },
  challengeBtn: {
    backgroundColor: '#B47CFF',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  challengeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyText: {
    color: '#F8F6FF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
