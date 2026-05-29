# Les 5 Workflows Métier Critiques Sans Tests E2E

## Classement par Risque de Régression

---

### 🔴 CRITIQUE #1: Photo Unlock System (Photo Progressive Reveal)

**Impact Utilisateur:**
- Monétisation complète du produit
- Révélation progressive des photos basée sur lettres échangées
- Condition sine qua non pour engagement utilisateur
- Si cassé: utilisateurs ne voient rien, churn immédiat

**Endpoints Concernés:**
```
GET /api/photos/me                 (mon album)
GET /api/photos/:userId            (album d'un autre)
POST /api/photos/me                (upload photo)
DELETE /api/photos/:photoId        (suppression)
GET /api/profiles/:id              (incluent niveau photo)
POST /api/wallet/... → lettres     (déverrouille photos)
```

**Workflow:**
1. User A et B échangent N lettres
2. Photo unlock level calculé (0-3) basé sur letterCount
3. Photos filtrées par niveau selon viewer isPremium
4. Photo variant appliqué (blurred/medium/original)

**Dépendances Critiques:**
- `getPhotoLevel()` avec premium/letterCount
- `getPhotoVariant()` mapping level→variant
- Photo filtering aux endpoints profiles
- Cache invalidation après lettre

**Difficulté du Test E2E:**
- 🟠 MOYEN (4-5 heures)
- Upload photo, échange lettres, vérifier révélation progressive
- Variantes premium vs free
- Edge cases: photos supprimées, user bloqué, match rompu

**Priorité:**
- 🔴 CRITIQUE: Si cassé = produit inutile pour monétisation

---

### 🔴 CRITIQUE #2: Match Breaking & Profile Reappearance

**Impact Utilisateur:**
- Permet quitter une mauvaise correspondance
- Réactivise la découverte
- Perte de fonctionnalité = users bloqués avec bad match

**Endpoints Concernés:**
```
POST /api/matches/:id/break        (casser match)
POST /api/matches/:id/decline      (refuser)
DELETE /api/matches/:id            (annuler demande)
GET /api/profiles                  (découverte affectée)
GET /api/matches                   (liste affectée)
```

**Workflow:**
1. User A et B en match ACTIVE
2. A/B appelle POST /break
3. Match passe à BROKEN
4. Profil réapparaît en découverte pour l'autre
5. Lettres restent visibles mais match fermé

**Dépendances Critiques:**
- Match.status transition ACTIVE→BROKEN
- Discovery filter exclude matched profiles
- Letter access restrictions post-break
- lastLetterBy reset (ou pas?)

**Difficulté du Test E2E:**
- 🟠 MOYEN (3-4 heures)
- Créer match, break, vérifier découverte
- Vérifier letters encore lisibles
- Vérifier rematch impossible avec même user

**Priorité:**
- 🔴 CRITIQUE: Feature de base UX

---

### 🟠 HAUT #3: Premium/Wallet Payment Flow

**Impact Utilisateur:**
- Monétisation directe (abonnement)
- Si cassé = perte de revenus
- Premium unlocks: match limit (5→20), photo level boost

**Endpoints Concernés:**
```
GET /api/wallet/me                 (solde)
POST /api/wallet/me/daily-bonus    (bonus)
POST /api/premium/... (payment)    (achat)
GET /api/matches                   (limit appliqué)
POST /api/photos/me/paid-unlock    (achat niveau photo)
```

**Workflow:**
1. User vérifies solde coins
2. Achète premium ou features payantes
3. Tier mis à jour (FREE→PREMIUM)
4. Premium perks appliqués (match limit, photo level)
5. Daily bonus réclamable

**Dépendances Critiques:**
- `isPremiumActive()` avec expiration
- Match limit enforcement `canOpenNewMatch()`
- Photo level boost `getPhotoLevel(isPremium=true)`
- Wallet deduction atomicity

**Difficulté du Test E2E:**
- 🟡 MOYEN-DIFFICILE (4-6 heures)
- Simuler payment gateway (test/mock)
- Vérifier limite de match appliquée
- Vérifier photo unlock boost
- Expiration premium

**Priorité:**
- 🟠 HAUT: Directement monétisé

---

### 🟠 HAUT #4: Card Game Shuffle & Scoring

**Impact Utilisateur:**
- Engagement intermédaire (jeu casual)
- Si cassé: perte d'engagement feature
- Dépend de lettres pour débloquer cartes
- Scoring affecte rapport de match

**Endpoints Concernés:**
```
POST /api/card-game/start          (initialiser)
POST /api/card-game/play           (jouer tour)
GET /api/card-game/state           (état)
GET /api/card-game/leaderboard     (scores)
POST /api/matches/.../letters      (déverrouille cartes)
```

**Workflow:**
1. A et B déverrouillent cartes via lettres
2. Jouent tour par tour
3. Score calculé
4. Données sauvegardées

**Dépendances Critiques:**
- Shuffle algorithm déterministe pour rejouer
- Score calculation consistency
- Turn alternation (même que lettres!)
- Leaderboard query performance

**Difficulté du Test E2E:**
- 🟡 MOYEN-DIFFICILE (4-5 heures)
- Jouer game complet
- Vérifier déverrouillage après lettres
- Vérifier score calculation
- Replay same game = same cards

**Priorité:**
- 🟠 HAUT: Feature d'engagement majeure

---

### 🟡 MOYEN #5: Photo Management (Upload, Delete, Reorder)

**Impact Utilisateur:**
- Gestion basique de profil
- Si cassé: users peuvent pas mettre à jour photos
- Affecte découverte (pas de photos = pas visible)

**Endpoints Concernés:**
```
POST /api/photos/me                (upload)
DELETE /api/photos/:id             (supprimer)
PUT /api/photos/:id/reorder        (réordonner)
GET /api/profiles/me/photos        (mon album)
GET /api/profiles/:id              (découverte affichage)
```

**Workflow:**
1. User upload photo
2. Photo validée (taille, format, moderation)
3. Stockée avec métadata
4. Réordonnable
5. Supprimmable (rediscover possible si 0 photos)

**Dépendances Critiques:**
- Image validation pipeline
- Storage (local vs cloud)
- Moderation queue si applicable
- Discovering avec/sans photos

**Difficulté du Test E2E:**
- 🟢 FACILE-MOYEN (2-3 heures)
- Upload test image
- Supprimer, vérifier
- Reorder, vérifier ordre
- Upload invalide

**Priorité:**
- 🟡 MOYEN: Important mais pas urgent

---

## Tableau Récapitulatif

| # | Workflow | Risque | Complexité | Effort | Priorité | Utilisateurs Affectés |
|---|----------|--------|-----------|--------|----------|----------------------|
| 1 | Photo Unlock | 🔴 CRITIQUE | Haut | 4-5h | 🔴 NOW | 100% (monétisation) |
| 2 | Match Break | 🔴 CRITIQUE | Moyen | 3-4h | 🔴 NOW | 100% (UX base) |
| 3 | Premium/Wallet | 🟠 HAUT | Moyen | 4-6h | 🟠 SOON | 50% (payants) |
| 4 | Card Game | 🟠 HAUT | Moyen | 4-5h | 🟠 SOON | 30% (engagement) |
| 5 | Photo Mgmt | 🟡 MOYEN | Facile | 2-3h | 🟡 Q2 | 100% (mais non-blocking) |

---

## Recommandations Immédiates

**Phase 1 (This Week):**
1. ✅ Letter Alternation (DONE)
2. ⚠️ Photo Unlock → Critical impact
3. ⚠️ Match Breaking → Blocks discovery

**Phase 2 (Next Sprint):**
4. Premium/Wallet
5. Card Game

**Phase 3 (Later):**
6. Photo Management

---

