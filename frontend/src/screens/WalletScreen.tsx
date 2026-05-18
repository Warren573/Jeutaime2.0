import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import {
  getWallet,
  listTransactions,
  claimDailyBonus,
  type WalletDTO,
  type CoinTxnDTO,
  type PaginationMeta,
} from '../api/wallet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const { currentUser, loadWallet } = useStore();
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
      Alert.alert(
        'Succès',
        `Bonus quotidien reçu : +${result.amount} 🪙`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Impossible de réclamer le bonus';
      Alert.alert('Erreur', msg);
    } finally {
      setClaimingBonus(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#9C7A4D" />
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
        <Text style={styles.headerTitle}>Portefeuille</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Solde actuel */}
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

        {/* Bonus quotidien */}
        {canClaimBonus ? (
          <TouchableOpacity
            style={[styles.bonusBtn, claimingBonus && styles.bonusBtnDisabled]}
            onPress={handleClaimBonus}
            disabled={claimingBonus}
          >
            {claimingBonus ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.bonusEmoji}>📅</Text>
                <View style={styles.bonusContent}>
                  <Text style={styles.bonusTitle}>Bonus quotidien disponible</Text>
                  <Text style={styles.bonusSub}>Tappez pour recevoir votre bonus</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.bonusClaimed}>
            <Text style={styles.bonusClaimedText}>
              ✅ Bonus quotidien déjà reçu aujourd'hui
            </Text>
          </View>
        )}

        {/* Historique */}
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
        <Text style={styles.txnDate}>
          {new Date(transaction.createdAt).toLocaleString('fr-FR')}
        </Text>
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
  container: {
    flex: 1,
    backgroundColor: '#EFE4D4',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E3D1B9',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2B1B12',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  balanceCard: {
    backgroundColor: '#FFF8E7',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#D4B896',
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7A5A3A',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  balanceEmoji: {
    fontSize: 32,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#2B1B12',
  },
  balanceDate: {
    fontSize: 11,
    color: '#8B6F47',
    fontStyle: 'italic',
  },
  bonusBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bonusBtnDisabled: {
    opacity: 0.6,
  },
  bonusEmoji: {
    fontSize: 28,
  },
  bonusContent: {
    flex: 1,
  },
  bonusTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 2,
  },
  bonusSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  bonusClaimed: {
    backgroundColor: '#D4EDDA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#28A745',
  },
  bonusClaimedText: {
    fontSize: 13,
    color: '#155724',
    fontWeight: '600',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2B1B12',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transactionsList: {
    gap: 10,
    marginBottom: 20,
  },
  transactionRow: {
    backgroundColor: '#FFF8E7',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  txnIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnIconEmoji: {
    fontSize: 24,
  },
  txnInfo: {
    flex: 1,
  },
  txnLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B1B12',
    marginBottom: 2,
  },
  txnDate: {
    fontSize: 11,
    color: '#8B6F47',
  },
  txnAmount: {
    alignItems: 'flex-end',
  },
  txnAmountText: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  txnPositive: {
    color: '#27AE60',
  },
  txnNegative: {
    color: '#E74C3C',
  },
  txnBalance: {
    fontSize: 10,
    color: '#8B6F47',
  },
  emptyBox: {
    backgroundColor: '#F5EFDA',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#8B6F47',
    fontStyle: 'italic',
  },
  paginationText: {
    fontSize: 12,
    color: '#8B6F47',
    textAlign: 'center',
    marginTop: 12,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#9C7A4D',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryText: {
    color: '#FFF',
    fontWeight: '700',
  },
});
