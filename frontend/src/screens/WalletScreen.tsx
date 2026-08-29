import React, { useEffect, useState } from 'react';
import { Alert, Button, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import {
  getWallet,
  listTransactions,
  claimDailyBonus,
  type WalletDTO,
  type CoinTxnDTO,
  type PaginationMeta,
} from '../api/wallet';

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  DAILY_BONUS: 'Bonus quotidien',
  GAME_ENTRY: 'Entrée jeu des cartes',
  GAME_WIN: 'Gain jeu des cartes',
  MATCH_CREATION: 'Création match',
  LETTER_SEND: 'Lettre envoyée',
  OTHER: 'Autre',
};

export default function WalletScreen() {
  const router = useRouter();
  const loadWallet = useStore((s) => s.loadWallet);
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
      Alert.alert('Succès', `Bonus quotidien reçu : +${result.amount} pièces`);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de réclamer le bonus');
    } finally {
      setClaimingBonus(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  if (loading) return <View><Text>Chargement...</Text></View>;

  if (error || !wallet) {
    return (
      <View>
        <Text>{error || 'Impossible de charger le solde'}</Text>
        <Button title="Réessayer" onPress={loadData} />
        <Button title="Retour" onPress={() => router.back()} />
      </View>
    );
  }

  const canClaimBonus = wallet.lastDailyBonus
    ? new Date(wallet.lastDailyBonus).toDateString() !== new Date().toDateString()
    : true;

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      <Text>Portefeuille</Text>
      <Text>Solde actuel : {wallet.coins} pièces</Text>
      <Text>Mis à jour : {new Date(wallet.updatedAt).toLocaleString('fr-FR')}</Text>

      <Button title="Boutique" onPress={() => router.push('/shop')} />

      {canClaimBonus ? (
        <Button
          title={claimingBonus ? 'Réclamation en cours...' : 'Réclamer le bonus quotidien'}
          onPress={handleClaimBonus}
          disabled={claimingBonus}
        />
      ) : (
        <Text>Bonus quotidien déjà reçu aujourd'hui.</Text>
      )}

      <Text>Historique</Text>
      {transactions.length === 0 && <Text>Aucune transaction</Text>}
      {transactions.map((transaction) => (
        <TransactionRow key={transaction.id} transaction={transaction} />
      ))}

      {pagination && pagination.pages > 1 && (
        <Text>Page 1 sur {pagination.pages} ({pagination.total} total)</Text>
      )}

      <Button title="Actualiser" onPress={handleRefresh} />
      <Button title="Retour" onPress={() => router.back()} />
    </ScrollView>
  );
}

function TransactionRow({ transaction }: { transaction: CoinTxnDTO }) {
  const label = TRANSACTION_TYPE_LABELS[transaction.type] || TRANSACTION_TYPE_LABELS.OTHER;
  const sign = transaction.amount > 0 ? '+' : '';

  return (
    <View>
      <Text>{label}</Text>
      <Text>{new Date(transaction.createdAt).toLocaleString('fr-FR')}</Text>
      <Text>{sign}{transaction.amount} pièces</Text>
      <Text>Solde après opération : {transaction.balance} pièces</Text>
    </View>
  );
}
