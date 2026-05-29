# Premium / Wallet E2E Audit

## I. Modèles Prisma Concernés

### 1. Wallet
```prisma
model Wallet {
  userId         String          @id
  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  coins          Int             @default(0)  // Solde disponible
  lastDailyBonus DateTime?                    // Timestamp dernier bonus (UTC day)
  updatedAt      DateTime        @updatedAt
  transactions   CoinTransaction[]
}
```

**Comportement :**
- Créé automatiquement à l'inscription avec balance initiale de **100 coins** (`auth.service.ts`)
- `coins` peut JAMAIS être négatif (enforced by `computeDebitBalance` policy)
- `lastDailyBonus` utilisé pour tracker la journée UTC du dernier bonus

---

### 2. CoinTransaction
```prisma
model CoinTransaction {
  id        String      @id @default(cuid())
  walletId  String
  wallet    Wallet      @relation(fields: [walletId], references: [userId], onDelete: Cascade)
  type      CoinTxnType
  amount    Int         // SIGNÉ : positif=crédit, négatif=débit
  balance   Int         // Solde POST-transaction
  meta      Json?       // Métadonnées contextuelles
  createdAt DateTime    @default(now())
}

enum CoinTxnType {
  DAILY_BONUS
  GAME_WIN
  GAME_ENTRY
  LETTER_SENT
  OFFERING_SENT
  POWER_USED
  PET_ADOPTION
  PET_CARE
  PREMIUM_PURCHASE
  STORY_PARTICIPATION
}
```

**Comportement :**
- Journal immuable de toutes opérations sur le wallet
- `amount` signé : `+20` crédit, `-50` débit
- `balance` = solde APRÈS transaction (intégrité : balance >= 0 toujours)
- `meta` contient le contexte (ex: `{ planId: "monthly", durationDays: 30 }`)

---

### 3. User (Champs Premium)
```prisma
model User {
  // ...
  premiumTier   PremiumTier  @default(FREE)     // FREE | PREMIUM
  premiumUntil  DateTime?                       // null = inactif
  // ...
}

enum PremiumTier {
  FREE
  PREMIUM
}
```

**Règle Premium :**
- User est Premium **IFF** : `premiumTier === PREMIUM` ET `premiumUntil !== null` ET `premiumUntil > now`
- Si `premiumUntil === null`, l'utilisateur est considéré **inactif** (même si tier=PREMIUM)
- Aucun concept de "Premium à vie" implicite

---

## II. Endpoints

### Wallet Endpoints

#### `GET /api/wallet/me`
**Authentification :** OUI (Bearer token)

**Réponse :**
```json
{
  "data": {
    "userId": "user123",
    "coins": 100,
    "lastDailyBonus": "2026-05-29T14:23:45.000Z" | null,
    "updatedAt": "2026-05-29T14:23:45.000Z"
  }
}
```

**Erreurs :**
- `404 NotFoundError` : Wallet n'existe pas (ne devrait jamais arriver — invariant)

---

#### `GET /api/wallet/me/transactions`
**Authentification :** OUI

**Query Params :**
- `page` : number (default: 1, min: 1)
- `pageSize` : number (default: 20, min: 1, max: 100)

**Réponse :**
```json
{
  "data": [
    {
      "id": "txn_001",
      "type": "DAILY_BONUS",
      "amount": 20,
      "balance": 120,
      "meta": { "isPremium": false },
      "createdAt": "2026-05-29T14:23:45.000Z"
    },
    // ... plus récentes en premier (orderBy: [createdAt DESC, id DESC])
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "pageSize": 20,
    "totalPages": 3
  }
}
```

**Comportement :**
- Retourne ALL transactions du wallet (historique complet)
- Triées par `createdAt DESC` (plus récentes en premier)
- Aucun filtre par type actuellement

---

#### `POST /api/wallet/me/daily-bonus`
**Authentification :** OUI

**Réponse :**
```json
{
  "data": {
    "wallet": {
      "userId": "user123",
      "coins": 120,
      "lastDailyBonus": "2026-05-29T14:23:45.000Z",
      "updatedAt": "2026-05-29T14:23:45.000Z"
    },
    "amount": 20,
    "transaction": {
      "id": "txn_001",
      "type": "DAILY_BONUS",
      "amount": 20,
      "balance": 120,
      "meta": { "isPremium": false },
      "createdAt": "2026-05-29T14:23:45.000Z"
    }
  }
}
```

**Erreurs :**
- `422 UnprocessableError` : Bonus déjà réclamé aujourd'hui (même UTC day)
- `404 NotFoundError` : Wallet ou User n'existe pas

**Montants par type d'utilisateur :**
- FREE user : **20 coins/jour**
- PREMIUM user : **50 coins/jour**

---

### Premium Endpoints

#### `GET /api/premium/plans`
**Authentification :** OUI

**Réponse :**
```json
{
  "data": [
    {
      "id": "monthly",
      "label": "Mensuel",
      "durationDays": 30,
      "priceCoins": 500,
      "priceEur": 4.99
    },
    {
      "id": "quarterly",
      "label": "Trimestriel",
      "durationDays": 90,
      "priceCoins": 1200,
      "priceEur": 12.99
    },
    {
      "id": "yearly",
      "label": "Annuel",
      "durationDays": 365,
      "priceCoins": 4000,
      "priceEur": 39.99
    }
  ]
}
```

---

#### `GET /api/premium/me`
**Authentification :** OUI

**Réponse :**
```json
{
  "data": {
    "tier": "FREE" | "PREMIUM",
    "premiumUntil": "2026-06-29T00:00:00.000Z" | null,
    "active": true | false
  }
}
```

**Logique `active` :**
```
active = (tier === PREMIUM) 
       AND (premiumUntil !== null) 
       AND (premiumUntil > now)
```

---

#### `POST /api/premium/subscribe`
**Authentification :** OUI

**Payload :**
```json
{
  "planId": "monthly" | "quarterly" | "yearly",
  "paymentMethod": "coins" | "stripe_stub"
}
```

**Réponse :**
```json
{
  "data": {
    "status": {
      "tier": "PREMIUM",
      "premiumUntil": "2026-06-29T00:00:00.000Z",
      "active": true
    },
    "plan": {
      "id": "monthly",
      "label": "Mensuel",
      "durationDays": 30,
      "priceCoins": 500,
      "priceEur": 4.99
    },
    "paymentMethod": "coins" | "stripe_stub",
    "coinsSpent": 500 | null
  }
}
```

**Erreurs :**
- `400 BadRequestError` : Plan ID invalide
- `403 ForbiddenError` : `stripe_stub` en production
- `422 NotEnoughCoinsError` : Insufficient coins (payment="coins")
- `404 NotFoundError` : User ou Wallet n'existe pas

**Comportement de paiement :**
- **coins** : Débite immédiatement le wallet, crée CoinTransaction type=PREMIUM_PURCHASE
- **stripe_stub** : No-op de paiement (stub d'intégration), aucun débit

**Atomicité (transaction Prisma) :**
1. Lock User (read premiumUntil)
2. Si payment=coins : lock Wallet, vérifier fonds, débiter, log CoinTransaction
3. Calculer `newUntil = computeNewPremiumUntil(currentPremiumUntil, durationDays)`
4. Update User (premiumTier=PREMIUM, premiumUntil=newUntil)
5. Create AuditLog
6. **Cumul** : Si utilisateur a déjà un Premium actif, la durée s'étend DEPUIS premiumUntil (pas depuis now)

---

#### `POST /api/premium/cancel`
**Authentification :** OUI

**Réponse :**
```json
{
  "data": {
    "tier": "FREE",
    "premiumUntil": "2026-06-29T00:00:00.000Z",  // Conservé pour audit
    "active": false
  }
}
```

**Erreurs :**
- `422 UnprocessableError` : Aucun Premium actif à annuler
- `404 NotFoundError` : User n'existe pas

**Comportement :**
- Annulation **immédiate** : `premiumTier = FREE`
- `premiumUntil` **n'est pas modifié** — conservé pour traçabilité historique
- `active` passe à `false` immédiatement

---

## III. Règles Métier (Business Rules)

### 1. Création du Wallet
- **Trigger** : Inscription utilisateur (`POST /auth/register`)
- **Initial Balance** : 100 coins
- **Code** : `auth.service.ts` → `{ userId: newUser.id, coins: 100 }`

### 2. Invariant : Pas de Solde Négatif
```typescript
// policy/wallet.ts
export function computeDebitBalance(currentCoins: number, amount: number): number {
  if (amount <= 0) throw new BadRequestError("Montant doit être positif");
  if (currentCoins < amount) throw new NotEnoughCoinsError(...);
  return currentCoins - amount;
}
```

- **Garantie** : Aucune opération ne peut créer un solde < 0
- **Enforcement** : Toute écriture Wallet.coins passe par `debitWallet()` ou `creditWallet()`

### 3. Daily Bonus

#### Fréquence
- **1x par jour UTC** : Identifié par le jour calendaire UTC (pas 24h)
- **Logique** : `canClaimDailyBonus(lastDailyBonus, now)` compare les jours UTC
- **Exemple** : Si dernière réclamation le 2026-05-29 14:00 UTC, peut réclamer le 2026-05-30 00:00 UTC

#### Montants
- **FREE user** : 20 coins
- **PREMIUM user** : 50 coins
- **Vérification** : Status Premium relue en transaction (reflect abonnements concurrents)

#### Transaction
- **Type** : `CoinTxnType.DAILY_BONUS`
- **Meta** : `{ isPremium: boolean }`
- **Updates** : Wallet.coins + lastDailyBonus

### 4. Premium Subscription

#### Plans
| Plan | Durée | Prix Coins | Prix EUR |
|------|-------|-----------|----------|
| monthly | 30 jours | 500 | 4.99 |
| quarterly | 90 jours | 1200 | 12.99 |
| yearly | 365 jours | 4000 | 39.99 |

#### Calcul `premiumUntil`
```typescript
computeNewPremiumUntil(currentPremiumUntil: Date | null, durationDays: number, now: Date): Date {
  // Si déjà Premium ET expire APRÈS now : étendre depuis expiration existante (cumul)
  // Sinon : partir de now
  const base = (currentPremiumUntil && currentPremiumUntil > now) ? currentPremiumUntil : now;
  return addDays(base, durationDays);
}
```

**Exemple :**
- Utilisateur s'abonne le 2026-05-29 à "monthly" (30j)
- `premiumUntil = 2026-06-28`
- Le 2026-06-15, s'abonne à "monthly" de nouveau
- `newUntil = 2026-06-28 + 30 = 2026-07-28` (cumul depuis première expiration)

#### Paiement par Coins
- **Débit** : Wallet débité immédiatement (transaction atomique)
- **Transaction** : Type=PREMIUM_PURCHASE, meta={ planId, durationDays }
- **Invariant** : Impossible si solde < priceCoins (NotEnoughCoinsError)

#### Paiement par Stripe (Stub)
- **Production** : Interdit (ForbiddenError)
- **Non-prod** : No-op — aucun débit wallet, simule succès Stripe
- **Future** : Placeholder pour intégration Stripe réelle

#### Annulation
- **Effet** : `premiumTier = FREE`, `active = false`
- **Timing** : Immédiat (pas de "délai de rétractation")
- **Historique** : `premiumUntil` conservé pour audit (ne pas modifier)

### 5. Photo Unlock (Affecté par Premium)

#### Seuils FREE vs PREMIUM
**FREE User :**
- Level 1 (silhouette flou) : 3 lettres
- Level 2 (flou léger) : 6 lettres
- Level 3 (originale) : 10 lettres

**PREMIUM User :**
- Level 1 (silhouette flou) : 1 lettre
- Level 2 (flou léger) : 2 lettres
- Level 3 (originale) : 3 lettres

#### Calcul `photoUnlock`
- Appliqué au moment du **GET /api/matches/:id**
- Basé sur : `totalLetters` (count lettres échangées) + `isPremiumActive(viewer)`
- Différent par utilisateur : A Premium voit différent de B Premium=false

### 6. Match Limits (Affecté par Premium)

**FREE User :** Max 5 matches ACTIVE/PENDING
**PREMIUM User :** Max 20 matches ACTIVE/PENDING

---

## IV. Proposition Workflow E2E Minimal

### Objectifs Testés
1. ✅ Création wallet + balance 100
2. ✅ Daily bonus (20 coins FREE, 50 coins PREMIUM)
3. ✅ Daily bonus blocked si déjà réclamé (UTC day)
4. ✅ Subscribe premium (coins method)
5. ✅ Daily bonus amount change POST-subscription
6. ✅ Cancel premium (immédiat)
7. ✅ Insufficient coins error
8. ✅ Transaction history tracking

### Phase 0 : Setup
1. **POST /test/cleanup-staging-debug-data** → Clean slate
2. **POST /test/reset-mutual-smile** → Créer A & B (balance=100 each)
3. **POST /auth/login A** → TOKEN_A
4. **POST /auth/login B** → TOKEN_B
5. **GET /api/wallet/me (A)** → Vérifier coins=100

### Phase 1 : Daily Bonus (FREE)
6. **GET /api/wallet/me (A)** → coins=100, lastDailyBonus=null
7. **POST /api/wallet/me/daily-bonus (A)** → coins=120, amount=20, type=DAILY_BONUS
8. **GET /api/wallet/me/transactions (A, page=1, pageSize=5)** → Vérifier 1 txn type=DAILY_BONUS amount=20
9. **POST /api/wallet/me/daily-bonus (A)** → 422 Error "Bonus déjà réclamé" (same UTC day)

### Phase 2 : Premium Subscription
10. **GET /api/premium/plans** → Vérifier 3 plans (monthly, quarterly, yearly)
11. **GET /api/premium/me (A)** → tier=FREE, active=false, premiumUntil=null
12. **POST /api/premium/subscribe (A, planId=monthly, paymentMethod=coins)** 
    - coins=120-500 = impossible → 422 NotEnoughCoinsError
13. **POST /api/wallet/me/daily-bonus (B)** → coins=120 (B distinct de A)
14. **Repeat until A has enough coins** (need 500 for monthly)
    - Strategy: Claim daily bonus 25 times? Unrealistic.
    - **Better: Use test endpoint to set wallet balance** (create `/api/test/set-wallet-coins`)
    
    OR: Use cheaper plan (OR mock setup coins in test DB)
    
    **Alternative:** Create `/api/test/set-wallet-coins?userId=X&coins=Y` endpoint for E2E only

15. **POST /api/premium/subscribe (A, planId=monthly, paymentMethod=coins)**
    - coins=500+120-500=120
    - premiumUntil ≈ now + 30 days
    - tier=PREMIUM, active=true
    - Vérifier CoinTransaction type=PREMIUM_PURCHASE amount=-500

16. **GET /api/premium/me (A)** → tier=PREMIUM, active=true, premiumUntil ≠ null

### Phase 3 : Daily Bonus (PREMIUM)
17. **POST /api/wallet/me/daily-bonus (A)** → 422 (same UTC day, claimed at step 7)
    - **Wait until next UTC day** (ou use `/api/test/advance-time` endpoint)
    
    **Better:** Test endpoint `/api/test/set-wallet-timestamp?userId=X&date=YYYY-MM-DD` to fake next day

18. **[After time advance]** **POST /api/wallet/me/daily-bonus (A)** → coins=120+50=170, amount=50 (PREMIUM rate)

### Phase 4 : Transaction History
19. **GET /api/wallet/me/transactions (A, page=1, pageSize=10)**
    - Vérifier order: récentes d'abord
    - Vérifier types: DAILY_BONUS (×2), PREMIUM_PURCHASE (×1)
    - Vérifier balance cumulative correcte

### Phase 5 : Cancel Premium
20. **POST /api/premium/cancel (A)**
    - tier=FREE, active=false
    - premiumUntil conservé (not changed)
    
21. **GET /api/premium/me (A)** → tier=FREE, active=false

---

## V. Test Endpoints Requis (pour E2E)

À créer en staging-only si n'existe pas :

1. **POST /api/test/set-wallet-coins?userId=X&coins=Y**
   - Set wallet coins directement (pour déboguer paiements sans 25 jours d'attente)
   
2. **POST /api/test/set-wallet-lastbonus?userId=X&date=YYYY-MM-DDTHH:MM:SSZ**
   - Set lastDailyBonus (pour tester la contrainte UTC day)

3. **POST /api/test/advance-time?days=N**
   - Mock le temps serveur (pour tester daily bonus UTC-day boundary)
   - OU : relire les endpoints avec `?now=YYYY-MM-DDTHH:MM:SSZ` param

---

## VI. Schéma Réponse Endpoint Summary

| Endpoint | Méthode | Auth | Réponse .data Type | Erreurs Clés |
|----------|---------|------|-------------------|--------------|
| /api/wallet/me | GET | ✅ | WalletDto | 404 |
| /api/wallet/me/transactions | GET | ✅ | [CoinTxnDto] + meta | 200 only |
| /api/wallet/me/daily-bonus | POST | ✅ | { wallet, amount, transaction } | 422, 404 |
| /api/premium/plans | GET | ✅ | [PremiumPlan] | 200 only |
| /api/premium/me | GET | ✅ | { tier, premiumUntil, active } | 404 |
| /api/premium/subscribe | POST | ✅ | { status, plan, paymentMethod, coinsSpent } | 400, 403, 422, 404 |
| /api/premium/cancel | POST | ✅ | { tier, premiumUntil, active } | 422, 404 |

---

## VII. Important Notes

### A. Atomicité
- Toutes opérations wallet / premium usent `Prisma.$transaction`
- Impossible d'avoir état demi-fait (wallet débité sans CoinTxn, etc.)
- CoinTxn.balance = Wallet.coins POST-opération (immuable, vérifiable)

### B. Audit Trail
- **AuditLog** créé pour chaque subscribe/cancel
- **CoinTransaction** log TOUT (daily bonus, debit, credit, premium purchase)
- Historique complet du wallet accessible via GET /transactions

### C. Premium Logic
- `isPremiumActive()` = source unique de vérité pour statut Premium
- Utilisé partout : photos, daily bonus, match limits, etc.
- **Pas de auto-downgrade** : Premium expire silencieusement (active devient false)

### D. Balance Integrity
- `balance` ≥ 0 TOUJOURS
- Erreur if debit > current (NotEnoughCoinsError)
- Pas de "overdraft" concept

### E. Stripe Stub
- Actuellement : no-op paiement en non-prod
- Future : Hook pour Stripe SDK + webhook confirmation
- **NOT TESTED IN E2E** : coins method only (plus déterministe)

---

## VIII. Next Steps

**Créer `.github/workflows/premium-wallet-e2e.yml`** avec :
1. Setup phase (reset, login)
2. Daily bonus FREE phase (test 20 coins)
3. Premium subscription (use test endpoint to set coins)
4. Daily bonus PREMIUM phase (test 50 coins, need UTC day mock)
5. Cancel premium (verify immediate downgrade)
6. Transaction history verification (orderBy, types, balance correctness)

**Assertion Hard-Fail Conditions :**
- ❌ Balance < 0 anywhere
- ❌ Daily bonus claimed twice same day
- ❌ Subscribe success without sufficient coins
- ❌ Premium active after cancel
- ❌ Transaction history missing
- ❌ Next premium claim fails (wrong amount or same day)
