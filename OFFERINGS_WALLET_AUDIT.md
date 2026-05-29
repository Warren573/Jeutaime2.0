# Offerings / Gifts E2E Audit

## I. Modèles Prisma Concernés

### 1. OfferingCatalog
```prisma
model OfferingCatalog {
  id            String           @id
  emoji         String
  name          String
  cost          Int              // Coût en coins
  category      OfferingCategory // BOISSON, NOURRITURE, SYMBOLIQUE, HUMOUR
  durationMs    Int?             // null = permanent, sinon milliseconds
  stackPriority Int              @default(0)
  salonOnly     SalonKind?       // null = envoyable partout, sinon METAL, etc.
  enabled       Boolean          @default(true)
  
  sentOfferings OfferingSent[]
}

enum OfferingCategory {
  BOISSON      // Café (20c), Thé (15c), Jus (25c), Champagne (200c), Bière (30c)
  NOURRITURE   // Croissant (25c), Macaron (40c), Gâteau (120c), Éclairs (35c)
  SYMBOLIQUE   // Rose (50c, 24h), Bouquet (100c, 24h), Coeur (150c, 24h), Guitare (80c)
  HUMOUR       // Tarte (30c), Chaussette (10c)
}

enum SalonKind {
  METAL        // Salon rock
  // ... autres types
}
```

### 2. OfferingSent (Transaction)
```prisma
model OfferingSent {
  id         String          @id @default(cuid())
  offeringId String
  offering   OfferingCatalog @relation(fields: [offeringId], references: [id])
  fromUserId String
  toUserId   String
  fromUser   User            @relation("OfferingFrom", fields: [fromUserId], references: [id])
  toUser     User            @relation("OfferingTo",   fields: [toUserId],   references: [id])
  salonId    String?         // null si envoyé hors salon
  salon      Salon?          @relation(fields: [salonId], references: [id])
  expiresAt  DateTime?       // null si permanent
  createdAt  DateTime        @default(now())
  
  @@index([toUserId])
  @@index([salonId])
}
```

### 3. Wallet & CoinTransaction (Existant)
Voir **PREMIUM_WALLET_AUDIT.md** — Offerings débite via `debitWallet()`.

**CoinTxnType relevants :**
- `OFFERING_SENT` : Débit du sender quand offering envoyé

---

## II. Endpoints

### `GET /api/offerings/catalog`
**Authentification :** OUI

**Réponse :**
```json
{
  "data": [
    {
      "id": "off_cafe",
      "emoji": "☕",
      "name": "Café",
      "cost": 20,
      "category": "BOISSON",
      "durationMs": null,
      "stackPriority": 1,
      "salonOnly": null
    },
    // ... 15 offerings au total
  ]
}
```

**Filtrage :**
- Uniquement offerings avec `enabled: true`
- Triés : category ASC, stackPriority DESC, cost ASC, id ASC

---

### `POST /api/offerings/send`
**Authentification :** OUI

**Payload :**
```json
{
  "offeringId": "off_cafe",
  "toUserId": "user123",
  "salonId": "salon456"  // optionnel
}
```

**Réponse (201 CREATED) :**
```json
{
  "data": {
    "id": "offsent_001",
    "offeringId": "off_cafe",
    "offering": {
      "id": "off_cafe",
      "emoji": "☕",
      "name": "Café",
      "cost": 20,
      "category": "BOISSON",
      "durationMs": null,
      "stackPriority": 1,
      "salonOnly": null
    },
    "fromUserId": "userA",
    "toUserId": "userB",
    "salonId": null,
    "createdAt": "2026-05-29T14:23:45.000Z",
    "expiresAt": null,
    "isActive": true
  }
}
```

**Erreurs :**
- `400 BadRequestError` : `fromUserId === toUserId` (self-offering)
- `400 BadRequestError` : `salonOnly !== null` mais pas de salonId fourni
- `400 BadRequestError` : Salon fourni mais kind ≠ salonOnly
- `403 ForbiddenError` : Destinataire banni
- `404 NotFoundError` : Offering inexistant ou disabled
- `404 NotFoundError` : Destinataire inexistant
- `404 NotFoundError` : Salon inexistant ou inactif
- `404 NotFoundError` : Wallet sender inexistant
- `422 NotEnoughCoinsError` : Solde insuffisant (cost > coins)

---

### `GET /api/offerings/received`
**Authentification :** OUI

**Query Params :**
- `onlyActive` : "true" | "false" (default: "true")
- `page` : number (default: 1, min: 1)
- `pageSize` : number (default: 20, min: 1, max: 100)

**Réponse :**
```json
{
  "data": [
    {
      "id": "offsent_001",
      "offeringId": "off_cafe",
      "offering": { ... },
      "fromUserId": "userA",
      "toUserId": "userB",
      "salonId": null,
      "createdAt": "2026-05-29T14:23:45.000Z",
      "expiresAt": null,
      "isActive": true
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

**Filtrage :**
- Toujours filtré par `toUserId` (offres reçues)
- Si `onlyActive=true` : `expiresAt === null OR expiresAt > now`
- Triées : createdAt DESC, id DESC

---

### `GET /api/offerings/salon/:salonId`
**Authentification :** OUI

**Réponse :**
```json
{
  "data": [
    {
      "id": "offsent_001",
      "offeringId": "off_cafe",
      "emoji": "☕",
      "name": "Café",
      "fromUserId": "userA",
      "fromPseudo": "Alice",
      "toUserId": "userB",
      "toPseudo": "Bob",
      "salonId": "salon456",
      "createdAt": "2026-05-29T14:23:45.000Z",
      "expiresAt": null,
      "isActive": true
    }
  ]
}
```

**Filtrage :**
- Par `salonId` (offerings envoyés DANS ce salon)
- Last 24h uniquement (`createdAt > now - 24h`)
- Max 100 résultats
- Triés : createdAt ASC, id ASC
- Inclut pseudo fromUser et toUser (fallback "Anonyme")

---

## III. Règles Métier (Business Rules)

### 1. Offering Catalog (15 offerings seedées)

| ID | Emoji | Nom | Cost | Category | Duration | SalonOnly | Note |
|-------|-------|------|------|----------|----------|-----------|------|
| off_cafe | ☕ | Café | 20 | BOISSON | null | null | Permanent |
| off_the | 🍵 | Thé | 15 | BOISSON | null | null | Cheapest |
| off_jus | 🥤 | Jus | 25 | BOISSON | null | null | |
| off_champagne | 🥂 | Champagne | 200 | BOISSON | null | null | Expensive |
| off_biere | 🍺 | Bière | 30 | BOISSON | null | **METAL** | Salon-only |
| off_croissant | 🥐 | Croissant | 25 | NOURRITURE | null | null | |
| off_macaron | 🍪 | Macaron | 40 | NOURRITURE | null | null | |
| off_gateau | 🎂 | Gâteau | 120 | NOURRITURE | null | null | |
| off_eclair | ⚡ | Éclairs | 35 | NOURRITURE | null | **METAL** | Salon-only |
| off_rose | 🌹 | Rose rouge | 50 | SYMBOLIQUE | 86400000ms (24h) | null | Expires 24h |
| off_bouquet | 💐 | Bouquet | 100 | SYMBOLIQUE | 86400000ms (24h) | null | Expires 24h |
| off_coeur | 💝 | Coeur or | 150 | SYMBOLIQUE | 86400000ms (24h) | null | Expires 24h |
| off_guitare | 🎸 | Guitare cassée | 80 | SYMBOLIQUE | null | **METAL** | Salon-only |
| off_tarte | 🥧 | Tarte | 30 | HUMOUR | null | null | |
| off_chaussette | 🧦 | Chaussette | 10 | HUMOUR | null | null | Cheapest fun |

### 2. Envoi d'Offering (sendOffering)

#### Atomicité
Transaction Prisma : wallet debit + CoinTransaction + OfferingSent ensemble ou rien.

#### Débit Wallet
- **Montant débité** : `offering.cost` coins
- **Source** : Wallet du sender
- **Règle** : Impossible si `wallet.coins < offering.cost` → `NotEnoughCoinsError`
- **Transaction créée** : Type=`OFFERING_SENT`, amount=-cost, balance=newBalance
- **Meta de transaction** :
  ```json
  {
    "offeringId": "off_cafe",
    "toUserId": "userB",
    "salonId": "salon456"  // si fourni
  }
  ```

#### Receiver
- **Crédit reçu** : ❌ **AUCUN** — L'offering ne crédite pas le receiver
- **Historique** : Visible via `GET /api/offerings/received`

#### Expiration
- Si `durationMs === null` : `expiresAt = null` (permanent)
- Si `durationMs > 0` : `expiresAt = createdAt + durationMs`
- Offre ACTIVE ssi : `expiresAt === null OR expiresAt > now` (strict >)

### 3. Contraintes

#### Self-Offering (Anti-abuse)
- ❌ `fromUserId === toUserId` → `BadRequestError`
- Impossible de s'envoyer un cadeau à soi-même (farm prevention)

#### Banned Users
- ❌ Destinataire banni → `ForbiddenError`
- Pas d'envoi à utilisateurs avec `isBanned = true`

#### SalonOnly Constraint
- Si `offering.salonOnly !== null` :
  - **Doit** avoir `salonId` dans la requête
  - **Le salon doit avoir** `kind === offering.salonOnly`
  - Exemple : Bière (METAL-only) ne peut être envoyée que depuis un salon METAL
- Si `offering.salonOnly === null` :
  - Envoyable partout (salonId optionnel)

#### Wallet Invariant
- Balance ne peut JAMAIS être < 0
- Débit refuse si cost > coins (NotEnoughCoinsError)
- Appliqué par `computeDebitBalance()` policy

### 4. Liste Reçue (listReceived)

- Filtrée par `toUserId` (offres adressées à cet utilisateur)
- `onlyActive=true` : Seules les offres actives (non expirées)
- Paginée : `page`, `pageSize` (max 100)
- Triées : createdAt DESC (récentes en premier)

### 5. Salon Offerings (listSalonOfferings)

- Restreint à last 24h (depuis now - 24h)
- Max 100 résultats
- Inclut usernames (pseudo) de sender/receiver
- Fallback "Anonyme" si pseudo manquant

---

## IV. Non-Règles (Hors Scope)

❌ **Offering ne crédite PAS le receiver** — Unidirectionnel, débit sender only
❌ **Pas de notification système** — OfferingSent existe mais PAS de NotificationSent automatique
❌ **Pas de refus d'offering** — Reçu = Reçu (pas de "ignore" ou "decline")
❌ **Pas de validité temporelle du sender** — Un offering banni peut recevoir
❌ **Pas de transaction inverse** — Pas de "revoke" d'offering envoyé

---

## V. Proposition Workflow E2E Minimal

### Phase 0 : Setup
1. **POST /test/cleanup-staging-debug-data** → Clean slate
2. **POST /test/reset-mutual-smile** → Créer A (100c) & B (100c)
3. **POST /auth/login A** → TOKEN_A
4. **POST /auth/login B** → TOKEN_B
5. **GET /api/offerings/catalog** → Vérifier 16 offerings présents

### Phase 1 : Valid Offering Send
6. **GET /api/wallet/me (A)** → coins=100
7. **POST /api/offerings/send (A→B, off_cafe [20c])**
   - ✅ SUCCESS (201)
   - Verify: coins A = 80 (100-20)
   - Verify: OfferingSent created
   - Verify: CoinTransaction type=OFFERING_SENT, amount=-20

### Phase 2 : Receiver Sees Offering
8. **GET /api/offerings/received (B, onlyActive=true)**
   - ✅ Should have 1 offering from A
   - Verify: offering.id, fromUserId=A, isActive=true

### Phase 3 : Insufficient Coins Error
9. **Set A coins to 5 (via test endpoint)**
10. **POST /api/offerings/send (A→B, off_champagne [200c])**
    - ❌ FAIL with NotEnoughCoinsError
    - Verify: A coins still = 5 (no debit)
    - Verify: No OfferingSent created

### Phase 4 : Self-Offering Blocked
11. **POST /api/offerings/send (A→A, off_cafe)**
    - ❌ FAIL with BadRequestError
    - Message: "Tu ne peux pas t'envoyer un cadeau..."

### Phase 5 : Transaction History
12. **GET /api/wallet/me/transactions (A)**
    - ✅ Should have exactly 1 transaction: OFFERING_SENT, amount=-20, balance=80

### Phase 6 : Expiring Offering (Future)
13. (Optional) Test Rose (24h expiry) — requires time mocking

---

## VI. Test Endpoints Requis

### `/api/test/set-wallet-coins` (Existant)
Utiliser pour set A=5c (insufficient coins test)

### `/api/test/set-wallet-lastbonus` (Existant)
Pas nécessaire pour offering tests (pas de daily bonus constraint)

---

## VII. Important Notes

### Atomicité Garantie
`Prisma.$transaction()` couvre :
1. Wallet read
2. Wallet debit
3. CoinTransaction create
4. OfferingSent create
5. AuditLog (si existant)

Tout échoue ensemble ou réussit ensemble.

### Event Emission
`emitOfferingSent()` déclenché après transaction réussie (non-bloquant).

### Expiration Logic
- `durationMs` en **millisecondes** (contrairement aux magies qui sont en secondes)
- `expiresAt === null` = permanent
- Activation stricte : `expiresAt > now` (pas >=)

### No Receiver Credit
Règle métier explicite : offering est **gift symbolique**, pas crédit wallet.
Sender débite, receiver voit l'historique. Zéro crédit.

---

## VIII. Next Steps

**Créer `.github/workflows/offerings-e2e.yml`** avec :
1. Setup phase (cleanup, reset, login)
2. Valid send (A→B café 20c, coins decrease)
3. Receiver sees (B receives offering)
4. Insufficient coins error
5. Self-offering blocked
6. Transaction history verification

**Assertion Hard-Fail Conditions :**
- ❌ Coins not debited after send
- ❌ Offering created without coin debit
- ❌ Insufficient coins doesn't fail
- ❌ Self-offering doesn't fail
- ❌ Wrong transaction type/amount
- ❌ Receiver doesn't see sent offering
- ❌ CoinTransaction missing or wrong
