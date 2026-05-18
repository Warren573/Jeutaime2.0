# Audit Wallet + Jeu des Cartes — Phase 3 Stabilisation

**Date:** 2026-05-18  
**Status:** En cours  
**Objectif:** Auditer et stabiliser la mécanique pièces + jeu des cartes

---

## 1. Architecture Générale

### Backend Structure
- **Wallet Service** (`backend/src/modules/wallet/wallet.service.ts`)
  - Transactions atomiques ✅
  - `debitWallet()` — débit sécurisé
  - `creditWallet()` — crédit sécurisé
  - Tests unitaires complets ✅

- **Card Game Service** (`backend/src/modules/card-game/card-game.service.ts`)
  - `start()` — initialiser partie, débiter 20 pièces
  - `reveal()` — révéler carte, calculer gains
  - `claim()` — encaisser gains
  - `bet()` — pari sur cœurs restants
  - Tests unitaires: ❌ MANQUANTS

- **Policies** (règles pure)
  - `wallet.ts` — logique débit/crédit
  - `cardGame.ts` — mécanique jeu (deck, effets cartes)

### Frontend Structure
- **API Clients** (`frontend/src/api/wallet.ts`, `card-game.ts`)
  - Appels HTTP basiques
  - Pas de logique métier côté client ✅

- **Screens**
  - `CardGame.tsx` — UI du jeu
  - `coins.tsx` — affichage solde
  - `coins-history.tsx` — historique transactions

---

## 2. Audit Détaillé

### ✅ Points Forts

1. **Atomicité des transactions**
   - Tous les débits/crédits dans `prisma.$transaction()`
   - Impossible d'avoir un wallet négatif
   - Erreur 402 (Payment Required) si insuffisant

2. **Validation côté serveur obligatoire**
   - `computeDebitBalance()` lance `NotEnoughCoinsError` si <0
   - Sessions expirées rejetées
   - Owned session checks (user can't play others' sessions)

3. **Erreurs bien typées**
   ```
   HTTP 402: NOT_ENOUGH_COINS
   HTTP 404: Session not found
   HTTP 422: Session expired / already claimed
   HTTP 403: Not session owner
   ```

4. **Tests wallet robustes**
   - 15 tests unitaires pour débit/crédit
   - Invariant: solde jamais négatif
   - Cas limites couverts

---

### ⚠️ Problèmes Trouvés

#### 1. **Card Game Service: Débit direct sans validation robuste** (LOW)
**Fichier:** `backend/src/modules/card-game/card-game.service.ts:111-129`

```typescript
// ❌ Problème: débit direct sans helper
const newBalance = computeDebitBalance(wallet.coins, ENTRY_COST);
await tx.wallet.update({ where: { userId }, data: { coins: newBalance } });
// Pas de transaction cohérente débit+log
```

**Impact:** Faible — `computeDebitBalance` lance une erreur si <0, donc c'est atomique. MAIS pas de helper `debitWallet` qui garantit cohérence.

**Fix:** Utiliser `debitWallet()` en dehors de transaction, puis créer session.

---

#### 2. **Pas de tests Card Game** (MEDIUM)
**Fichier:** `/backend/tests/unit/card-game.test.ts` — N'EXISTE PAS

**Scenarios manquants:**
- [ ] Démarrage avec 20 pièces insuffisantes
- [ ] Révélation valide d'une carte
- [ ] Révélation d'une carte déjà révélée (doit rejeter)
- [ ] Claim avec gains > 0
- [ ] Claim avec gains = 0
- [ ] Bet gagnant (tous cœurs révélés)
- [ ] Bet perdant (cœurs restants)
- [ ] Session expirée après 30 min
- [ ] Deux sessions simultanées (must return existing)
- [ ] Non-owner tentant de jouer session d'un autre
- [ ] Injection de sessionId

**Impact:** Moyen — aucune couverture d'intégration

---

#### 3. **Frontend: Pas de prévalidation du solde** (LOW)
**Fichier:** `frontend/src/screens/games/CardGame.tsx:82-100`

Quand l'utilisateur clique "Jouer", il n'y a pas de vérification locale du solde avant appel API.

**Impact:** UX seulement — le serveur rejette avec 402, mais l'utilisateur voit une erreur brute.

**Fix:** Vérifier `wallet.coins >= ENTRY_COST` avant `startCardGame()`.

---

#### 4. **Gestion d'erreur réseau basique** (LOW)
**Fichier:** `frontend/src/screens/games/CardGame.tsx:143-148`

```typescript
} catch (err: any) {
  if (isExpiredError(err)) { setPhase('expired'); return; }
  Alert.alert('Erreur', err?.message ?? 'Impossible de révéler cette carte.');
}
```

Pas de retry, pas de sauvegarde d'état. Si erreur réseau pendant reveal, l'utilisateur perd le contexte.

**Impact:** Très faible en prod (rare), mais mauvaise UX.

---

#### 5. **Entrypoint débit non cohérent** (LOW)
**Fichier:** `backend/src/modules/card-game/card-game.service.ts`

Lines 111-129 et 196-212 font des opérations wallet en transaction.

À comparer avec `wallet.service.ts:debitWallet()` qui encapsule tout.

**Pattern incohérent:** 
- Wallet.service utilise helpers `debitWallet()`
- CardGame.service réimplémente inline

**Fix:** Normaliser pour utiliser les helpers.

---

## 3. Risques de Fraude

### ✅ Protected Against
1. **Solde négatif** — Impossible (validation server)
2. **Rejeu de session** — Session marquée CLAIMED après encaissement
3. **Double claim** — `loadActiveSession()` rejette CLAIMED/EXPIRED
4. **Session d'un autre** — Vérification `session.userId === userId`
5. **Débitage sans log** — Chaque débit crée CoinTransaction

### ⚠️ Potentiellement Vulnérable
1. **Race condition claim+bet**
   - Si client envoie `claim()` ET `bet()` en parallèle
   - Serveur traite les deux dans des transactions séparées
   - Deuxième call rejette car session déjà CLAIMED ✅ OK
   - Mais possible qu'un du deux soit perdu (OK car attesté par DB)

2. **Frontend manipulation**
   - Client pourrait modifier `gainsCurrent` en état local
   - Mais `claim()` lit depuis DB, pas depuis client
   - Donc impossible de gonfler les gains ✅ OK

3. **Resubmission après erreur**
   - Client rejette `claim()`, erreur réseau
   - Client retry — rejette car session déjà CLAIMED ✅ OK

---

## 4. Plan de Test

### Tests Unitaires (Priorities)
- [ ] **Card Game Policies** — testable sans Prisma
- [ ] **Card Game Service** — avec mocks Prisma
- [ ] **Wallet-CardGame Integration** — débits cohérents

### Tests d'Intégration
- [ ] Workflow complet: start → reveal → reveal → ... → claim
- [ ] Workflow pari: start → reveals → bet
- [ ] Erreur solde insuffisant
- [ ] Session expirée
- [ ] Race conditions

### Tests Frontend
- [ ] Affichage solde côté client
- [ ] Erreur 402 affichée proprement
- [ ] State restore après erreur réseau

---

## 5. Corrections Minimales Proposées

### C1: Ajouter tests Card Game Service
**Fichier:** `backend/tests/unit/card-game.test.ts` (NEW)
**Effort:** 30min
**Bloquant:** NON (mais recommandé)

### C2: Utiliser `debitWallet()` dans start()
**Fichier:** `backend/src/modules/card-game/card-game.service.ts`
**Effort:** 5min
**Bloquant:** NON (refactor de cohérence)
**Détail:** Extraire appel `debitWallet()` avant transaction créer session

### C3: Valider solde côté frontend avant start
**Fichier:** `frontend/src/screens/games/CardGame.tsx`
**Effort:** 5min
**Bloquant:** NON (UX only)
**Détail:** Check `currentUser?.wallet?.coins >= 20` avant `handleStart()`

### C4: Améliorer messages d'erreur
**Fichier:** `frontend/src/screens/games/CardGame.tsx`
**Effort:** 5min
**Bloquant:** NON
**Détail:** Mapper erreur code 402 → "Pièces insuffisantes"

---

## 6. Résumé de Stabilité

| Aspect | Status | Notes |
|--------|--------|-------|
| Solde jamais négatif | ✅ Garantie | Server-side atomic |
| Historique transactions | ✅ Complet | Tous débits/crédits loggés |
| Débit avant session | ✅ Atomique | `start()` in transaction |
| Gains calculés côté serveur | ✅ Obligatoire | Pas de trust client |
| Validation serveur | ✅ Stricte | Tous les endpoints protégés |
| Tests unitaires | ⚠️ Partiels | Wallet OK, CardGame missing |
| Tests intégration | ⚠️ Manquants | À ajouter |
| Rate limiting | ❌ Absent | Pas de limite bets/day |
| Audit trail | ✅ Complet | CoinTransaction pour chaque opération |

---

## 7. Fichiers Affectés

**Backend**
- `backend/src/modules/wallet/wallet.service.ts` — ✅ Stable
- `backend/src/modules/card-game/card-game.service.ts` — ⚠️ À refactor légèrement
- `backend/src/policies/cardGame.ts` — ✅ Pure, OK
- `backend/src/policies/wallet.ts` — ✅ OK
- `backend/tests/unit/wallet.test.ts` — ✅ Complet
- `backend/tests/unit/card-game.test.ts` — ❌ À créer

**Frontend**
- `frontend/src/api/card-game.ts` — ✅ Simple, OK
- `frontend/src/api/wallet.ts` — ✅ OK
- `frontend/src/screens/games/CardGame.tsx` — ⚠️ Petites améliorations UX
- `frontend/app/coins.tsx` — À auditer
- `frontend/app/coins-history.tsx` — À auditer

---

## 8. Next Steps

1. **Créer tests Card Game** (30min)
2. **Refactor `start()` pour cohérence** (5min)
3. **Améliorer UX erreurs** (10min)
4. **Vérifier coins.tsx et coins-history.tsx** (15min)
5. **Commit et push** (2min)

**Durée estimée:** 1h

