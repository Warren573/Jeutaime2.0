import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { AppBackButton } from '../components/AppBackButton';
import {
  getWallet,
  listTransactions,
  claimDailyBonus,
  type WalletDTO,
  type CoinTxnDTO,
  type PaginationMeta,
} from '../api/wallet';
import {
  APP_COLORS,
  APP_RADIUS,
  APP_SHADOWS,
  APP_SPACING,
} from '../theme/appTheme';

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  DAILY_BONUS: '📅 Bonus quotidien',
  GAME_ENTRY: '🎴 Entrée jeu des cartes',
  GAME_WIN: '🎉 Gain jeu des cartes',
  MATCH_CREATION: '❤️ Création match',
  LETTER_SEND: '📬 Lettre envoyée',
  OTHER: '❓ Autre',
};

const TRANSACTION_TYPE_COLORS: Record<string, { bg: string; icon: string }> = {
  DAILY_BONUS: { bg: '#FFF3CD', icon: '📅' },
  GAME_ENTRY: { bg: '#E7F3FF', icon: '🎴' },
  GAME_WIN: { bg: '#D4EDDA', icon: '🎉' },
  MATCH_CREATION: { bg: '#F8D7DA', icon: '❤️' },
  LETTER_SEND: { bg: '#D1ECF1', icon: '📬' },
  OTHER: { bg: '#E2E3E5', icon: '❓' },
};

export default function WalletScreen() {
  const router = useRouter();
  const loadWallet = useStore((s) => s.loadWallet);
  const insets = useSafeAreaInsets();

  const [wallet, setWallet] = useState<WalletDTO | null>(null);
  const [transactions, setTransactions] = useState<CoinTxnDTO[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [walletData, { data: txnsData, meta }] = await Promise.all([
        getWallet(),
        listTransactions(1, 20),
      ]);
      setWallet(walletData);
      setTransactions(txnsData);
      setPagination(meta);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement solde');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleClaimBonus = async () => {
    if (claimingBonus) return;
    try {
      setClaimingBonus(true);
      const result = await claimDailyBonus();
      setWallet(result.wallet);
      setTransactions((prev) => [result.transaction, ...prev]);
      await loadWallet();
      Alert.alert('Succès', `Bonus quotidien reçu : +${result.amount} 🪙`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Impossible de réclamer le bonus';
      Alert.alert('Erreur', msg);
    } finally {
      setClaimingBonus(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={APP_COLORS.burgundy} />
      </View>
    );
  }

  if (error || !wallet) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{error || 'Impossible de charger le solde'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canClaimBonus = wallet.lastDailyBonus
    ? new Date(wallet.lastDailyBonus).toDateString() !== new Date().toDateString()
    : true;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerKicker}>JEUTAIME</Text>
          <Text style={styles.headerTitle}>Portefeuille</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Solde actuel</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceEmoji}>🪙</Text>
            <Text style={styles.balanceValue}>{wallet.coins}</Text>
          </View>
          <Text style={styles.balanceDate}>
            Mis à jour : {new Date(wallet.updatedAt).toLocaleString('fr-FR')}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.shopBtn}
          onPress={() => router.push('/shop')}
          activeOpacity={0.8}
        >
          <View style={styles.shopBtnIconWrap}>
            <Text style={styles.shopBtnIcon}>🛍️</Text>
          </View>
          <View style={styles.shopBtnContent}>
            <Text style={styles.shopBtnTitle}>Boutique</Text>
            <Text style={styles.shopBtnSub}>Premium, pièces et offrandes</Text>
          </View>
          <Text style={styles.shopBtnArrow}>›</Text>
        </TouchableOpacity>

        {canClaimBonus ? (
          <TouchableOpacity
            style={[styles.bonusBtn, claimingBonus && styles.bonusBtnDisabled]}
            onPress={handleClaimBonus}
            disabled={claimingBonus}
          >
            {claimingBonus ? (
              <ActivityIndicator color={APP_COLORS.white} />
            ) : (
              <>
                <Text style={styles.bonusEmoji}>📅</Text>
                <View style={styles.bonusContent}>
                  <Text style={styles.bonusTitle}>Bonus quotidien disponible</Text>
                  <Text style={styles.bonusSub}>Touchez pour recevoir votre bonus</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.bonusClaimed}>
            <Text style={styles.bonusClaimedText}>✅ Bonus quotidien déjà reçu aujourd'hui</Text>
          </View>
        )}

        <Text style={styles.historyTitle}>Historique</Text>
        {transactions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Aucune transaction</Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {transactions.map((txn) => (
              <TransactionRow key={txn.id} transaction={txn} />
            ))}
          </View>
        )}

        {pagination && pagination.pages > 1 && (
          <Text style={styles.paginationText}>
            Page 1 sur {pagination.pages} ({pagination.total} total)
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function TransactionRow({ transaction }: { transaction: CoinTxnDTO }) {
  const label = TRANSACTION_TYPE_LABELS[transaction.type] || TRANSACTION_TYPE_LABELS.OTHER;
  const colors = TRANSACTION_TYPE_COLORS[transaction.type] || TRANSACTION_TYPE_COLORS.OTHER;
  const isPositive = transaction.amount > 0;

  return (
    <View style={styles.transactionRow}>
      <View style={[styles.txnIcon, { backgroundColor: colors.bg }]}>
        <Text style={styles.txnIconEmoji}>{colors.icon}</Text>
      </View>
      <View style={styles.txnInfo}>
        <Text style={styles.txnLabel}>{label}</Text>
        <Text style={styles.txnDate}>{new Date(transaction.createdAt).toLocaleString('fr-FR')}</Text>
      </View>
      <View style={styles.txnAmount}>
        <Text style={[styles.txnAmountText, isPositive ? styles.txnPositive : styles.txnNegative]}>
          {isPositive ? '+' : ''}{transaction.amount} 🪙
        </Text>
        <Text style={styles.txnBalance}>Solde: {transaction.balance} 🪙</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: APP_COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  header: {
    minHeight: 76,
    paddingHorizontal: APP_SPACING.md,
    paddingVertical: APP_SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.paper,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextWrap: { flex: 1, alignItems: 'center' },
  headerKicker: {
    fontSize: 9,
    letterSpacing: 2.2,
    fontWeight: '800',
    color: APP_COLORS.muted,
    marginBottom: 2,
  },
  headerTitle: { fontSize: 23, fontWeight: '900', color: APP_COLORS.ink },
  headerSpacer: { width: 52 },
  scrollContent: {
    paddingHorizontal: APP_SPACING.md,
    paddingVertical: APP_SPACING.md,
    paddingBottom: 40,
  },
  balanceCard: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    padding: APP_SPACING.lg,
    marginBottom: APP_SPACING.sm,
    borderWidth: 1,
    borderColor: APP_COLORS.borderStrong,
    ...(APP_SHADOWS.card ?? {}),
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: APP_COLORS.muted,
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  balanceEmoji: { fontSize: 31 },
  balanceValue: { fontSize: 36, fontWeight: '900', color: APP_COLORS.ink },
  balanceDate: { fontSize: 10, color: APP_COLORS.muted, fontStyle: 'italic' },
  shopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    padding: 14,
    marginBottom: APP_SPACING.md,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    ...(APP_SHADOWS.card ?? {}),
  },
  shopBtnIconWrap: {
    width: 44,
    height: 44,
    borderRadius: APP_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.paperSoft,
    marginRight: 12,
  },
  shopBtnIcon: { fontSize: 22 },
  shopBtnContent: { flex: 1 },
  shopBtnTitle: { fontSize: 15, fontWeight: '800', color: APP_COLORS.ink },
  shopBtnSub: { fontSize: 11, color: APP_COLORS.muted, marginTop: 2 },
  shopBtnArrow: { fontSize: 28, color: APP_COLORS.burgundy, marginLeft: 8 },
  bonusBtn: {
    backgroundColor: APP_COLORS.burgundy,
    borderRadius: APP_RADIUS.lg,
    padding: APP_SPACING.md,
    marginBottom: APP_SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...(APP_SHADOWS.card ?? {}),
  },
  bonusBtnDisabled: { opacity: 0.6 },
  bonusEmoji: { fontSize: 27 },
  bonusContent: { flex: 1 },
  bonusTitle: { fontSize: 15, fontWeight: '800', color: APP_COLORS.white, marginBottom: 2 },
  bonusSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  bonusClaimed: {
    backgroundColor: '#EDF5E9',
    borderRadius: APP_RADIUS.md,
    padding: 12,
    marginBottom: APP_SPACING.lg,
    borderWidth: 1,
    borderColor: '#C9DEC1',
  },
  bonusClaimedText: { fontSize: 13, color: '#487342', fontWeight: '700' },
  historyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: APP_COLORS.muted,
    marginBottom: APP_SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  transactionsList: { gap: 10, marginBottom: APP_SPACING.lg },
  transactionRow: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  txnIcon: { width: 46, height: 46, borderRadius: APP_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  txnIconEmoji: { fontSize: 23 },
  txnInfo: { flex: 1 },
  txnLabel: { fontSize: 13, fontWeight: '700', color: APP_COLORS.ink, marginBottom: 2 },
  txnDate: { fontSize: 10, color: APP_COLORS.muted },
  txnAmount: { alignItems: 'flex-end' },
  txnAmountText: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  txnPositive: { color: APP_COLORS.success },
  txnNegative: { color: APP_COLORS.danger },
  txnBalance: { fontSize: 9, color: APP_COLORS.muted },
  emptyBox: {
    backgroundColor: APP_COLORS.paperSoft,
    borderRadius: APP_RADIUS.md,
    padding: 32,
    alignItems: 'center',
    marginBottom: APP_SPACING.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  emptyText: { fontSize: 13, color: APP_COLORS.muted, fontStyle: 'italic' },
  paginationText: { fontSize: 11, color: APP_COLORS.muted, textAlign: 'center', marginTop: 12 },
  errorText: { color: APP_COLORS.danger, fontSize: 15, textAlign: 'center', marginBottom: 20 },
  retryBtn: {
    backgroundColor: APP_COLORS.burgundy,
    borderRadius: APP_RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryText: { color: APP_COLORS.white, fontWeight: '700' },
});
