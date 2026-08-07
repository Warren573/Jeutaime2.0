import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppBackButton } from '../components/AppBackButton';
import { Avatar } from '../avatar/png/Avatar';
import { resolveAvatarConfig } from '../avatar/resolveAvatarConfig';
import {
  getBlockedUsers,
  unblockUser,
  type BlockedUserDTO,
} from '../api/blockedUsers';
import {
  APP_COLORS,
  APP_RADIUS,
  APP_SHADOWS,
  APP_SPACING,
} from '../theme/appTheme';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<BlockedUserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setUsers(await getBlockedUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les blocages.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmUnblock = (user: BlockedUserDTO) => {
    Alert.alert(
      'Débloquer cette personne ?',
      `${user.pseudo} pourra de nouveau apparaître dans les espaces où vos profils peuvent se croiser.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Débloquer',
          onPress: async () => {
            try {
              setActioningId(user.userId);
              await unblockUser(user.userId);
              setUsers((prev) => prev.filter((item) => item.userId !== user.userId));
            } catch (err) {
              Alert.alert('Erreur', err instanceof Error ? err.message : 'Déblocage impossible.');
            } finally {
              setActioningId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>SÉCURITÉ</Text>
          <Text style={styles.title}>Blocages</Text>
          <Text style={styles.subtitle}>Gère les personnes que tu as bloquées.</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={APP_COLORS.burgundy} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>🛡️</Text>
            <Text style={styles.infoText}>
              Une personne bloquée ne peut plus accéder à ton profil ni interagir avec toi tant que le blocage reste actif.
            </Text>
          </View>

          {users.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🚫</Text>
              <Text style={styles.emptyTitle}>Aucun blocage</Text>
              <Text style={styles.emptyText}>Les personnes que tu bloques apparaîtront ici.</Text>
            </View>
          ) : (
            users.map((user) => {
              const avatar = resolveAvatarConfig(
                user.userId,
                user.avatarConfig ?? undefined,
                user.gender ?? undefined,
                'BlockedUsersScreen',
              );
              const busy = actioningId === user.userId;

              return (
                <View key={user.userId} style={styles.userCard}>
                  <Avatar size={54} {...avatar.config} />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.pseudo}</Text>
                    {user.city ? <Text style={styles.userMeta}>📍 {user.city}</Text> : null}
                    <Text style={styles.userDate}>
                      Bloqué le {new Date(user.blockedAt).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.unblockBtn, busy && styles.unblockBtnDisabled]}
                    onPress={() => confirmUnblock(user)}
                    disabled={busy}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color={APP_COLORS.burgundy} />
                    ) : (
                      <Text style={styles.unblockText}>Débloquer</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: APP_COLORS.background },
  header: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: APP_SPACING.md,
    paddingVertical: APP_SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.paper,
  },
  headerText: { flex: 1, alignItems: 'center', paddingHorizontal: APP_SPACING.sm },
  headerSpacer: { width: 52 },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 2.1, color: APP_COLORS.muted },
  title: { fontSize: 24, fontWeight: '900', color: APP_COLORS.ink, marginTop: 2 },
  subtitle: { fontSize: 12, color: APP_COLORS.muted, marginTop: 2, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  content: { padding: APP_SPACING.md },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: APP_COLORS.paperSoft,
    borderRadius: APP_RADIUS.md,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    marginBottom: APP_SPACING.md,
  },
  infoIcon: { fontSize: 22, marginRight: 10 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18, color: APP_COLORS.muted },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: 32,
    ...(APP_SHADOWS.card ?? {}),
  },
  emptyIcon: { fontSize: 42, marginBottom: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: APP_COLORS.ink },
  emptyText: { fontSize: 13, color: APP_COLORS.muted, marginTop: 5, textAlign: 'center' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    marginBottom: APP_SPACING.sm,
    ...(APP_SHADOWS.card ?? {}),
  },
  userInfo: { flex: 1, marginLeft: 12, minWidth: 0 },
  userName: { fontSize: 16, fontWeight: '800', color: APP_COLORS.ink },
  userMeta: { fontSize: 11, color: APP_COLORS.muted, marginTop: 3 },
  userDate: { fontSize: 10, color: APP_COLORS.muted, marginTop: 4 },
  unblockBtn: {
    minHeight: 38,
    justifyContent: 'center',
    borderRadius: APP_RADIUS.md,
    borderWidth: 1,
    borderColor: APP_COLORS.burgundy,
    paddingHorizontal: 12,
    marginLeft: 10,
  },
  unblockBtnDisabled: { opacity: 0.5 },
  unblockText: { fontSize: 12, fontWeight: '800', color: APP_COLORS.burgundy },
  errorText: { fontSize: 14, color: APP_COLORS.danger, textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    backgroundColor: APP_COLORS.burgundy,
    borderRadius: APP_RADIUS.md,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  retryText: { color: APP_COLORS.white, fontWeight: '800' },
});
