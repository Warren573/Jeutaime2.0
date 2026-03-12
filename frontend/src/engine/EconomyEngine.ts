// ============================================
// ECONOMY ENGINE - Gestion des coins et transactions
// ============================================

import { Wallet, Transaction, TransactionCategory } from '../shared/types';

// Configuration des récompenses
export const REWARDS = {
  dailyBonus: 20,
  dailyBonusPremium: 50,
  letterSent: 10,
  letterReceived: 5,
  matchCreated: 25,
  offeringSent: 5,
  storyParticipation: 5,
  storyCompletion: 50,
  gameWin: 15,
  petDailyBonus: 50,
  petFeed: 5,
  petPlay: 8,
  petClean: 5,
  petSleep: 5,
};

export const COSTS = {
  offeringMin: 10,
  offeringMax: 100,
  powerMin: 20,
  powerMax: 150,
  petAdoptionMin: 300,
  petAdoptionMax: 5000,
  bottleSend: 10,
  bottleReveal: 50,
  weeklyVote: 5,
  reconnectFilter: 30,
};

// ==================== FONCTIONS PRINCIPALES ====================

/**
 * Vérifie si l'utilisateur peut payer un montant
 */
export function canAfford(wallet: Wallet, amount: number): boolean {
  return wallet.coins >= amount;
}

/**
 * Ajoute des coins au wallet
 */
export function addCoins(
  wallet: Wallet,
  amount: number,
  reason: string,
  category: TransactionCategory
): Wallet {
  const transaction: Transaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'gain',
    amount,
    reason,
    category,
    timestamp: Date.now(),
  };

  return {
    ...wallet,
    coins: wallet.coins + amount,
    transactions: [transaction, ...wallet.transactions].slice(0, 100), // Garder les 100 dernières
  };
}

/**
 * Retire des coins du wallet (retourne null si pas assez)
 */
export function removeCoins(
  wallet: Wallet,
  amount: number,
  reason: string,
  category: TransactionCategory
): Wallet | null {
  if (!canAfford(wallet, amount)) {
    return null;
  }

  const transaction: Transaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'spend',
    amount,
    reason,
    category,
    timestamp: Date.now(),
  };

  return {
    ...wallet,
    coins: wallet.coins - amount,
    transactions: [transaction, ...wallet.transactions].slice(0, 100),
  };
}

/**
 * Vérifie si le bonus quotidien peut être réclamé
 */
export function canClaimDailyBonus(wallet: Wallet): boolean {
  const now = new Date();
  const lastBonus = new Date(wallet.lastDailyBonus);
  
  // Vérifier si c'est un nouveau jour
  return (
    now.getDate() !== lastBonus.getDate() ||
    now.getMonth() !== lastBonus.getMonth() ||
    now.getFullYear() !== lastBonus.getFullYear()
  );
}

/**
 * Applique le bonus quotidien
 */
export function applyDailyBonus(wallet: Wallet, isPremium: boolean): Wallet {
  if (!canClaimDailyBonus(wallet)) {
    return wallet;
  }

  const bonusAmount = isPremium ? REWARDS.dailyBonusPremium : REWARDS.dailyBonus;
  
  const updatedWallet = addCoins(
    wallet,
    bonusAmount,
    isPremium ? 'Bonus quotidien Premium' : 'Bonus quotidien',
    'daily_bonus'
  );

  return {
    ...updatedWallet,
    lastDailyBonus: Date.now(),
  };
}

/**
 * Calcule la récompense d'un mini-jeu
 */
export function calculateGameReward(gameId: string, score: number, won: boolean): number {
  if (!won) return 0;
  
  // Récompenses de base par jeu
  const baseRewards: Record<string, number> = {
    tictactoe: 30,
    whack: 50,
    memory: 40,
    pong: 60,
    brickbreaker: 70,
    cards: 100,
    story: 50,
  };

  return baseRewards[gameId] || REWARDS.gameWin;
}

/**
 * Crée un nouveau wallet
 */
export function createWallet(odId: string, initialCoins: number = 100): Wallet {
  return {
    odId,
    coins: initialCoins,
    lastDailyBonus: 0,
    transactions: [{
      id: `tx_welcome_${Date.now()}`,
      type: 'gain',
      amount: initialCoins,
      reason: 'Bienvenue sur JeuTaime!',
      category: 'daily_bonus',
      timestamp: Date.now(),
    }],
  };
}

/**
 * Obtient l'historique des transactions filtré
 */
export function getTransactionHistory(
  wallet: Wallet,
  limit?: number,
  category?: TransactionCategory
): Transaction[] {
  let transactions = wallet.transactions;
  
  if (category) {
    transactions = transactions.filter(t => t.category === category);
  }
  
  if (limit) {
    transactions = transactions.slice(0, limit);
  }
  
  return transactions;
}

/**
 * Calcule le total des gains/dépenses sur une période
 */
export function calculatePeriodStats(
  wallet: Wallet,
  periodMs: number
): { totalGained: number; totalSpent: number } {
  const cutoff = Date.now() - periodMs;
  const recentTx = wallet.transactions.filter(t => t.timestamp >= cutoff);
  
  return {
    totalGained: recentTx.filter(t => t.type === 'gain').reduce((sum, t) => sum + t.amount, 0),
    totalSpent: recentTx.filter(t => t.type === 'spend').reduce((sum, t) => sum + t.amount, 0),
  };
}
