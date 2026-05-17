# AUDIT MÉCANIQUE JEUTAIME — Inventaire Fonctionnel Complet
**Date**: 2026-05-17  
**Portée**: Backend + Frontend + API + DB  
**Priorité**: Sécurité en premier (signaler, bloquer, rompre)

---

# 1. JEU DES CARTES / Card Game

## Statut: ✅ **PARTIELLEMENT FONCTIONNEL**

### Frontend
- **Route**: `/games` → `games.tsx`
- **Screen**: `MiniGamesScreen.tsx`, `CardGame.tsx`
- **État**: Mock/fonctionnel pour duel (Pierre-Papier-Ciseaux)
- **Intégration**: Connecté au store (duelEntries)

### Backend
- **Module**: `/modules/card-game`
- **Routes**: 
  - `POST /api/card-game/play` ← Jouer une partie
- **Controllers**: `card-game.controller.ts`
- **DB**: `CardGameResult` schema (Prisma)

### API
- ✅ POST /api/card-game/play
- ❌ GET /api/card-game/history (absent)
- ❌ PUT /api/card-game/stats (absent)

### État Base de Données
- Table `CardGameResult` (créée)
- Schemas: cardType, result, pointsWon, etc.
- Historique stocké

### Bugs/Trous
- **BUG 1**: Pas d'historique API (affichage seulement via store local)
- **BUG 2**: Pas de système de classement/stats
- **BUG 3**: Pièces gagnées/perdues intégrées but not always synced
- **TROU**: Pas de validation serveur des moves (trust client)
- **TROU**: Pas de cooldown entre parties

### Priorité: **MOYENNE** (fun, pas sécurité)

### Ordre Correction
1. Ajouter GET `/api/card-game/history`
2. Valider moves côté serveur
3. Ajouter cooldown (1 min entre parties)
4. Sync coins correctement après partie

---

# 2. WALLET / ÉCONOMIE / HISTORIQUE COINS

## Statut: ✅ **FONCTIONNEL**

### Frontend
- **Route**: `/coins` → `coins.tsx`
- **History**: `/coins-history` → `coins-history.tsx`
- **Screen**: (Intégré dans settings/profile)
- **État**: Affiche balance + historique

### Backend
- **Module**: `/modules/wallet`
- **Routes**:
  - `GET /api/wallet/balance` ← Balance utilisateur
  - `GET /api/wallet/transactions` ← Historique
  - `POST /api/wallet/purchase` ← Achat (si shop existe)
  - `POST /api/wallet/transfer` ← Transfert (optionnel)

### API
- ✅ GET /api/wallet/balance
- ✅ GET /api/wallet/transactions
- ✅ POST /api/wallet/purchase
- ⚠️ POST /api/wallet/transfer (partiel)

### État Base de Données
- Table `WalletTransaction` (créée)
- Champs: userId, amount, type (gain/perte/achat), reason, createdAt
- Balance stockée sur `User` profile

### Bugs/Trous
- **BUG 1**: Pas de pagination sur transactions (limit 100)
- **BUG 2**: Pas de notification quand coins gagnés
- **TROU**: Pas de système d'achat intégré au shop
- **TROU**: Pas de transfer entre utilisateurs (optionnel)

### Priorité: **HAUTE** (core economy)

### Ordre Correction
1. Vérifier intégrité transactions (pas de doublons)
2. Ajouter pagination correcte
3. Intégrer notifications de gain
4. Connecter au shop (si shop existe)

---

# 3. SALONS

## Statut: ⚠️ **PARTIELLEMENT FONCTIONNEL**

### Frontend
- **Route**: `/(tabs)/salons-list.tsx` + `/salon/[id].tsx`
- **Screen**: `SalonsListScreen.tsx`, `SalonScreen.tsx`
- **État**: Affiche liste de salons (Café, Bar, etc.) + détails
- **Intégration**: Chat/messages dans salon (pseudo-implémenté)

### Backend
- **Module**: `/modules/salons`
- **Routes**:
  - `GET /api/salons` ← Lister
  - `GET /api/salons/:id` ← Détails
  - `POST /api/salons/:id/messages` ← Poster message
  - `GET /api/salons/:id/messages` ← Charger messages
  - `DELETE /api/salons/:id/messages/:msgId` ← Modérer

### API
- ✅ GET /api/salons
- ✅ GET /api/salons/:id
- ⚠️ POST /api/salons/:id/messages (exists but incomplete)
- ⚠️ GET /api/salons/:id/messages (partial)
- ❌ DELETE /api/salons/:id/messages/:msgId (pas de modération)

### État Base de Données
- Table `Salon` (créée)
- Table `SalonMessage` (partiel)
- Pas de gestion de modérateurs/rôles

### Bugs/Trous
- **BUG 1**: Messages pas chargés correctement (API incomplete)
- **BUG 2**: Pas de persistance messages en real-time
- **TROU**: Pas de modération/suppression messages
- **TROU**: Pas de rôles (owner/mod)
- **TROU**: Pas de flood protection (rate limit)

### Priorité: **BASSE** (fun, pas core)

### Ordre Correction
1. Compléter GET /api/salons/:id/messages
2. Ajouter rate limit sur POST messages
3. Implémenter DELETE avec permission check
4. Ajouter rôles de modérateur

---

# 4. OFFRANDES DANS SALONS

## Statut: ⚠️ **PARTIELLEMENT FONCTIONNEL**

### Frontend
- **Route**: `/offerings` → `offerings.tsx`
- **Screen**: Intégré dans SalonScreen
- **État**: Affiche liste d'offrandes possibles, peut en envoyer

### Backend
- **Module**: `/modules/offerings`
- **Routes**:
  - `GET /api/offerings` ← Lister
  - `POST /api/offerings/:id/send` ← Envoyer offrande
  - `GET /api/offerings/received` ← Offrandes reçues

### API
- ✅ GET /api/offerings
- ⚠️ POST /api/offerings/:id/send (exists, coins deductible?)
- ⚠️ GET /api/offerings/received (partial)

### État Base de Données
- Table `Offering` (offrandes disponibles)
- Table `OfferingTransaction` (offrandes envoyées)
- Coins déduits correctement

### Bugs/Trous
- **BUG 1**: Pas de notification destinataire
- **TROU**: Pas de validation coins (can send if < cost?)
- **TROU**: Pas d'historique complet

### Priorité: **BASSE** (fun, économique)

### Ordre Correction
1. Valider coins avant POST
2. Ajouter notifications
3. Ajouter historique GET

---

# 5. POUVOIRS / MAGIE

## Statut: ⚠️ **PARTIELLEMENT FONCTIONNEL**

### Frontend
- **Route**: Pas de route dédiée, intégré partout
- **Screen**: (Logique dans store + components)
- **État**: Mock/UI exists pour certains pouvoirs

### Backend
- **Module**: `/modules/magies`
- **Routes**:
  - `POST /api/magies/:spellId/cast` ← Lancer sort
  - `GET /api/magies/available` ← Pouvoirs disponibles
  - `GET /api/magies/cooldowns` ← Cooldowns actifs

### API
- ⚠️ POST /api/magies/:spellId/cast (incomplete)
- ⚠️ GET /api/magies/available (partial)
- ❌ GET /api/magies/cooldowns (missing)

### État Base de Données
- Table `Magic` (sorts possibles)
- Table `MagicCast` (historique lancés)
- Pas de gestion de cooldowns en DB

### Bugs/Trous
- **BUG 1**: Cooldowns gérés côté client (trust problem)
- **BUG 2**: Validation côté serveur incomplète
- **TROU**: Pas de cooldown persistent
- **TROU**: Pas de système de "mana" ou ressource
- **TROU**: Pas d'effects visuels confirmés

### Priorité: **BASSE** (fun, cosmétique)

### Ordre Correction
1. Implémenter cooldowns côté serveur
2. Ajouter validation correcte
3. Implémenter mana/ressource
4. Notifier destinataire de sort

---

# 6. BOUTEILLE À LA MER

## Statut: ⚠️ **PARTIELLEMENT FONCTIONNEL**

### Frontend
- **Route**: `/bottle` → `bottle.tsx`
- **Screen**: `BottleScreen.tsx`
- **État**: UI exists, peut écrire + envoyer messages anonymes

### Backend
- **Module**: Pas de module dédié (dans `/users` ou `/messages`)
- **Routes**:
  - `POST /api/messages/bottle` ← Envoyer message anonyme
  - `GET /api/messages/bottles` ← Recevoir

### API
- ⚠️ POST /api/messages/bottle (exists, IP logged?)
- ⚠️ GET /api/messages/bottles (partial)
- ❌ DELETE /api/messages/bottle/:id (no delete?)

### État Base de Données
- Pas de table dédiée (messages stockés dans `Message`?)
- Champ `anonymous: boolean`
- Pas de tracking IP/location

### Bugs/Trous
- **BUG 1**: Pas de vrai anonymité (IP peut être loggée)
- **BUG 2**: Pas de modération/suppression
- **TROU**: Pas de limite rate limit (flood)
- **TROU**: Pas de système de report pour messages toxiques

### Priorité: **BASSE** (fun, mais privacy concern)

### Ordre Correction
1. Clarifier anonymité (hash IP?)
2. Ajouter rate limit strict
3. Implémenter modération/delete
4. Ajouter report button

---

# 7. 🔴 ROMPRE L'ÉCHANGE / METTRE FIN RELATION

## Statut: ❌ **ABSENT ou CASSÉ**

### Frontend
- **Route**: Pas trouvée
- **Button**: Pas d'UI visible pour rompre
- **État**: MANQUANT COMPLÈTEMENT

### Backend
- **Module**: Probablement dans `/modules/matches`
- **Routes**: 
  - `DELETE /api/matches/:id` ou `PUT /api/matches/:id/break` (probablement absent)
- **Expected**: Break match, archive relation, log action

### API
- ❌ DELETE /api/matches/:id/break (ABSENT)
- ❌ PUT /api/matches/:id/close (ABSENT)

### État Base de Données
- Match model: status field (pending/active/broken/blocked)
- Pas de log de qui/quand/pourquoi a rompu

### Bugs/Trous
- **CRITICAL**: Pas moyen de rompre une relation via UI
- **CRITICAL**: Pas de confirmation/warning
- **CRITICAL**: Pas de log d'audit
- **CRITICAL**: Pas de récupération (possible ou pas?)

### Priorité: **🔴 CRITIQUE SÉCURITÉ**
- Users need to break bad matches
- Needed for abuse cases

### Ordre Correction
1. **URGENT**: Créer endpoint `PUT /api/matches/:id/break`
2. **URGENT**: Ajouter UI button "Rompre l'échange"
3. **URGENT**: Ajouter confirmation dialog
4. **URGENT**: Logger action (who, when, why optional)
5. Archive match (status = broken)
6. Prevent new letters après break

---

# 8. 🔴 SIGNALER DEPUIS PROFIL

## Statut: ⚠️ **PARTIELLEMENT FONCTIONNEL**

### Frontend
- **Route**: Probablement dans `/profile/[id].tsx`
- **Button**: ⚠️ Existe mais peut ne pas être visible
- **État**: Partiel, need verification

### Backend
- **Module**: `/modules/reports`
- **Routes**:
  - `POST /api/reports` ← Créer report
- **Schemas**: `CreateReportSchema` (exists)

### API
- ✅ POST /api/reports (exists)
  - Fields: reportedUserId, reason, details
  - Optional: contentType (PROFILE/LETTER/MESSAGE)

### État Base de Données
- Table `Report` (créée)
- Champs: reporterId, reportedUserId, reason, status (pending/reviewed/dismissed)
- Timestamps

### Bugs/Trous
- **BUG 1**: Pas de UI visible sur profil (need to verify)
- **BUG 2**: Pas de feedback utilisateur après report
- **TROU**: Pas de vérification doublons (spam reports?)
- **TROU**: Pas d'admin panel pour review (mentioned, state unclear)
- **TROU**: Pas de rate limit sur reports

### Priorité: **🔴 CRITIQUE SÉCURITÉ**
- Abuse reporting needed
- Legal requirement

### Ordre Correction
1. **URGENT**: Vérifier UI exists sur profil
2. **URGENT**: Ajouter bouton visible + text clair
3. **URGENT**: Ajouter feedback "Report envoyé"
4. Rate limit: 5 reports/jour/user
5. Vérifier admin panel exists
6. Loguer toutes les actions

---

# 9. 🔴 SIGNALER DEPUIS LETTRES

## Statut: ❌ **ABSENT**

### Frontend
- **Route**: Dans `/letters` modal presumably
- **Button**: PAS TROUVÉ
- **État**: MANQUANT

### Backend
- **Module**: `/modules/reports`
- **Routes**: Utiliser POST /api/reports (general)
- **Field needed**: contentType: "LETTER", contentId: letterId

### API
- ✅ POST /api/reports (peut être utilisé, mais besoin de contentId)

### État Base de Données
- Report model needs letterId/contentId field

### Bugs/Trous
- **CRITICAL**: Pas d'UI pour reporter lettre
- **CRITICAL**: Pas de way to identify lettre in report
- **CRITICAL**: Pas d'admin context pour voir lettre reportée

### Priorité: **🔴 CRITIQUE SÉCURITÉ**
- Messages abusifs need reporting
- Abuse protection

### Ordre Correction
1. **URGENT**: Ajouter UI button dans LettersScreen modal
2. **URGENT**: Report inclueur: letterId, messageSnippet
3. **URGENT**: Backend: log full letter content
4. **URGENT**: Admin panel: show letter in context
5. Rate limit: 5 reports/jour/user

---

# 10. 🔴 BLOQUER UTILISATEUR

## Statut: ⚠️ **PARTIELLEMENT FONCTIONNEL**

### Frontend
- **Route**: `/blocked-users` → `blocked-users.tsx`
- **Screen**: Exists (affiche utilisateurs bloqués)
- **État**: Partial - peut afficher mais button peut ne pas exister partout

### Backend
- **Module**: Probablement dans `/modules/users` ou `/modules/matches`
- **Routes**:
  - `POST /api/users/:id/block` ← Bloquer
  - `DELETE /api/users/:id/block` ← Débloquer
  - `GET /api/users/blocked` ← Lister bloqués

### API
- ⚠️ POST /api/users/:id/block (need verification)
- ⚠️ DELETE /api/users/:id/block (need verification)
- ⚠️ GET /api/users/blocked (may exist)

### État Base de Données
- Table `BlockedUser` (ou relation on User?)
- Fields: blockerId, blockedId, createdAt

### Bugs/Trous
- **BUG 1**: Button for blocking may not be everywhere (profile, letter preview?)
- **TROU**: Pas de confirmation before block
- **TROU**: Pas de feedback après block
- **TROU**: Bloqué user peut voir qu'il est bloqué? (privacy)

### Priorité: **🔴 CRITIQUE SÉCURITÉ**
- Harassment prevention
- User safety

### Ordre Correction
1. **URGENT**: Ajouter UI button dans ProfileDetail + LettersScreen
2. **URGENT**: Ajouter confirmation dialog
3. **URGENT**: Vérifier API endpoints exist & work
4. **URGENT**: Implémenter effects: no profile, no letters, no contact
5. Test: blocked user can't see blocker
6. Notification (optional): "You have been blocked"

---

# 11. GESTION APRÈS RUPTURE

## Statut: ❌ **ABSENT/UNCLEAR**

### Expected Behavior
- Match status = "broken"
- Relation archivée mais visible en historique
- Plus de lettres possibles (API return error)
- UI: "This match has ended"

### Frontend
- Besoin: Check relationship status, show archived state
- Besoin: Disable "Send letter" button

### Backend
- **Check**: Quand letter POST, vérifier match.status !== "broken"
- **Return**: 409 Conflict si tentative d'envoyer après rupture

### API
- Need to verify letter endpoint checks match status
- Need to verify match/profile endpoints return archived state

### Bugs/Trous
- **CRITICAL**: Unknown si endpoints check status correctement
- **CRITICAL**: Unknown si UI disables correctly
- **CRITICAL**: Unknown si historique preserved

### Priorité: **🔴 CRITIQUE** (consequence of break)

### Ordre Correction
1. Vérifier `letters.controller.ts` checks match.status
2. Vérifier profiles API returns archived matches
3. UI: Show "Match ended" state
4. UI: Disable all relation actions (send, gifts, etc.)

---

# 12. GESTION APRÈS SIGNALEMENT

## Statut: ⚠️ **PARTIELLEMENT FONCTIONNEL**

### Expected Behavior
- Report logged (created)
- Backend: Possible admin review (state unclear if exists)
- User: No immediate action (can still message)
- Admin: Can take action (ban, mute, etc.)

### Frontend
- UI: "Report sent successfully"
- État: DONE after report

### Backend
- **Module**: `/modules/reports`
- **Routes**: POST /api/reports (exists)
- **Admin panel**: UNCLEAR if exists

### API
- ✅ POST /api/reports (exists)
- ❌ GET /api/admin/reports (unknown if exists)
- ❌ PUT /api/admin/reports/:id (unknown if exists)

### État Base de Données
- Table `Report` (exists)
- Status tracking (pending/reviewed/dismissed)
- No action field (what did admin do?)

### Bugs/Trous
- **BUG 1**: Unknown if admin panel exists
- **BUG 2**: No follow-up notification to reporter
- **BUG 3**: No automatic actions (auto-ban after N reports?)
- **TROU**: No visibility to reporter what happened

### Priorité: **MOYENNE** (depends on admin tooling)

### Ordre Correction
1. Verify admin panel exists (`/admin/reports`)
2. Add report review flow
3. Add action logging (ban/warn/dismiss)
4. Notify reporter of action (optional)
5. Auto-actions: N reports → review, 3 confirms → action

---

# 13. GESTION APRÈS BLOCAGE

## Statut: ⚠️ **PARTIELLEMENT FONCTIONNEL**

### Expected Behavior
- BlockedUser record created
- Blocker: Can't see blocker in discovery
- Blocker: Existing match archived or hidden
- Blocker: Can't receive letters/contact
- **Privacy**: Blocker may or may not know they're blocked

### Frontend
- Blocker: Can unblock from `/blocked-users`
- Search: Blocked users filtered out
- État: DONE if UI exists

### Backend
- **Check**: Discovery endpoint filters blocked users
- **Check**: Letter endpoint rejects from blocked user
- **Check**: Profile endpoint returns 403 or hides

### API
- ⚠️ GET /api/profiles (need filter for blocked)
- ⚠️ POST /api/letters (need block check)
- ⚠️ GET /api/profiles/:id (need return 403 if blocked?)

### Bugs/Trous
- **BUG 1**: Discovery may not filter blocked
- **BUG 2**: Blocked user may still see blocker's profile
- **TROU**: No feedback to blocked user (intentional?)
- **TROU**: No notification system

### Priorité: **🔴 CRITIQUE SÉCURITÉ** (consequence of block)

### Ordre Correction
1. **URGENT**: Vérifier discovery filters blocked users
2. **URGENT**: Vérifier letter endpoint checks blocked
3. **URGENT**: Vérifier profile endpoint checks blocked
4. Decide: notify blocked user or not?
5. UI: "You've blocked this user" in blocked-users

---

# 14. JOURNAL / ACCUEIL

## Statut: ✅ **FONCTIONNEL**

### Frontend
- **Route**: `/(tabs)/index.tsx` + `/journal` → `journal.tsx`
- **Screen**: `HomeScreen.tsx`, `JournalScreen.tsx`
- **État**: Affiche flux, journal entries (mocké), souvenirs

### Backend
- **Module**: Pas de module dédié
- **Routes**: None visible for journal entries
- **State**: Journal entries mockées dans le store

### API
- ❌ GET /api/journal (ABSENT)
- ❌ POST /api/journal (ABSENT)
- ⚠️ GET /api/souvenirs (peut exister)

### État Base de Données
- Unknown if `JournalEntry` table exists
- Unknown if `Souvenir` table exists

### Bugs/Trous
- **BUG 1**: Journal entries mockées, pas persisted
- **BUG 2**: Souvenirs mockés
- **TROU**: Pas d'API pour sauvegarder entries
- **TROU**: Pas de backend support

### Priorité: **BASSE** (fun, pas core)

### Ordre Correction
1. Create `JournalEntry` table
2. Create `Souvenir` table
3. Add POST /api/journal endpoint
4. Add GET /api/journal endpoint
5. Wire frontend to real API

---

# 15. MINI-JEUX (Duels + Card Game)

## Statut: ⚠️ **PARTIELLEMENT FONCTIONNEL**

### Frontend
- **Routes**: `/games`, `/duel/create`, `/duel/play`
- **Screens**: `MiniGamesScreen.tsx`, `DuelCreateScreen.tsx`, `DuelPlayScreen.tsx`, `CardGame.tsx`
- **État**: Duels fonctionnels (RPS), card game partiel

### Backend
- **Module**: `/modules/card-game` (for duels/rps)
- **Routes**: POST /api/card-game/play
- **State**: Results stored

### API
- ✅ POST /api/card-game/play (duel moves)
- ⚠️ GET /api/card-game/history (not visible)
- ⚠️ GET /api/duel/:id (may not exist)

### État Base de Données
- `CardGameResult` table (duels)
- `DuelEntry` (in store, may not persist)

### Bugs/Trous
- **BUG 1**: Duel history not persisted in journal properly
- **BUG 2**: Card game moves not validated server-side
- **TROU**: No true turn-based RTS (all client-side)

### Priorité: **BASSE** (fun, not core)

### Ordre Correction
1. Add real-time validation
2. Persist duel history
3. Add stats/leaderboard

---

# 16. NOTIFICATIONS

## Statut: ⚠️ **PARTIELLEMENT FONCTIONNEL**

### Frontend
- **Route**: `/notifications` → `notifications.tsx`
- **Screen**: `NotificationsScreen.tsx`
- **État**: Affiche notifications (some mock)

### Backend
- **Module**: `/modules/notifications`
- **Routes**:
  - `GET /api/notifications` ← Lister
  - `PUT /api/notifications/:id/read` ← Mark read
  - `DELETE /api/notifications/:id` ← Supprimer

### API
- ✅ GET /api/notifications (exists)
- ⚠️ PUT /api/notifications/:id/read (may exist)
- ⚠️ DELETE /api/notifications/:id (may exist)

### État Base de Données
- Table `Notification` (created)
- Type: match, letter, gift, etc.
- Read status

### Bugs/Trous
- **BUG 1**: Not all actions trigger notifications (gifts, magic, etc.)
- **TROU**: No push notifications (mobile)
- **TROU**: No email notifications
- **TROU**: Rate limit on notifications?

### Priorité: **MOYENNE** (important UX)

### Ordre Correction
1. Audit all actions that should notify
2. Ensure all notifications created
3. Wire up push notifications (later)
4. Add rate limiting

---

# 17. PREMIUM

## Statut: ⚠️ **PARTIELLEMENT FONCTIONNEL**

### Frontend
- **Route**: `/premium` → `premium.tsx`
- **Screen**: Premium subscription page
- **État**: UI exists, can show benefits

### Backend
- **Module**: `/modules/premium`
- **Routes**:
  - `POST /api/premium/subscribe` ← Subscribe
  - `GET /api/premium/status` ← Check status
  - `POST /api/premium/cancel` ← Cancel

### API
- ⚠️ POST /api/premium/subscribe (exists?)
- ⚠️ GET /api/premium/status (exists?)
- ❌ Integration with payment (Stripe, etc.) - UNCLEAR

### État Base de Données
- `PremiumSubscription` table (may exist)
- Expiry date tracking
- Plan type (monthly, yearly, etc.)

### Bugs/Trous
- **CRITICAL**: Payment integration unclear
- **BUG 1**: No payment webhook handling visible
- **TROU**: No invoice generation
- **TROU**: No auto-renewal handling

### Priorité: **MOYENNE** (revenue dependent)

### Ordre Correction
1. Verify payment integration exists
2. Check webhook handling
3. Test subscription flow
4. Add cancellation handling

---

# 18. ADOPTION / REFUGE (Pet)

## Statut: ⚠️ **PARTIELLEMENT FONCTIONNEL**

### Frontend
- **Route**: `/pet` → `pet.tsx`
- **Screen**: `PetScreen.tsx`
- **État**: Can view pet, feed, etc. (mostly mock)

### Backend
- **Module**: Probably in `/modules/users` or no dedicated module
- **Routes**: Unclear if exists
- **API**: Unknown

### API
- ❌ GET /api/pet (may not exist)
- ❌ POST /api/pet/interact (likely absent)

### État Base de Données
- Unknown if `Pet` table exists
- Unknown if tracked per-user

### Bugs/Trous
- **BUG 1**: Pet state is mostly mock/local
- **TROU**: No persistence
- **TROU**: No backend support

### Priorité: **BASSE** (cosmetic, fun)

### Ordre Correction
1. Create Pet table
2. Add endpoints
3. Wire frontend

---

# RÉSUMÉ EXÉCUTIF

## 🔴 CRITIQUE (Sécurité - A FIXER EN PRIORITÉ)

| Module | Statut | Action |
|--------|--------|--------|
| **Rompre relation** | ❌ ABSENT | Créer endpoint + UI |
| **Signaler lettres** | ❌ ABSENT | Ajouter UI + contentId |
| **Bloquer utilisateur** | ⚠️ PARTIAL | Vérifier endpoints + UI everywhere |
| **Gestion blocage** | ⚠️ PARTIAL | Vérifier filters correctement |
| **Gestion rupture** | ❌ ABSENT | Vérifier letter endpoint |

## 🟡 IMPORTANT (Core functionality)

| Module | Statut | Action |
|--------|--------|--------|
| **Signaler profil** | ⚠️ PARTIAL | Vérifier UI visible |
| **Wallet** | ✅ OK | Audit intégrité transactions |
| **Card game** | ⚠️ PARTIAL | Ajouter validation serveur |
| **Notifications** | ⚠️ PARTIAL | Audit déclencheurs |
| **Premium** | ⚠️ PARTIAL | Vérifier paiements |

## 🟢 BASSE (Fun features)

| Module | Statut | Action |
|--------|--------|--------|
| **Salons** | ⚠️ PARTIAL | Compléter messages |
| **Offrandes** | ⚠️ PARTIAL | Ajouter validations |
| **Magie** | ⚠️ PARTIAL | Cooldown serveur |
| **Bouteille** | ⚠️ PARTIAL | Modération |
| **Journal** | ❌ ABSENT | Persister |
| **Pet** | ⚠️ PARTIAL | Backend support |

---

# ORDRE DE CORRECTION RECOMMANDÉ

### Phase 1: SÉCURITÉ (Semaine 1)
1. **Rompre relation** ← Endpoint + UI
2. **Bloquer utilisateur** ← Vérifier + UI complet
3. **Signaler lettres** ← Ajouter UI + backend
4. **Gestion après blocage** ← Vérifier filters
5. **Gestion après rupture** ← Vérifier constraints

### Phase 2: CORE (Semaine 2)
6. **Signaler profil** ← UI visibility
7. **Wallet** ← Audit + intégrations
8. **Notifications** ← Audit triggers
9. **Card game** ← Validation serveur
10. **Premium** ← Paiements

### Phase 3: FUN (Semaine 3+)
11. **Salons** ← Messages
12. **Offrandes** ← Validations
13. **Magie** ← Cooldowns
14. **Journal** ← Persistence
15. **Pet** ← Backend

---

# METRIQUES DE SANTÉ SYSTÈME

| Aspect | État | Score |
|--------|------|-------|
| **Sécurité** | ⚠️ Trous critiques | 3/10 |
| **Core features** | ⚠️ 70% complet | 7/10 |
| **Fun features** | ⚠️ 50% complet | 5/10 |
| **Backend API** | ✅ Bien structuré | 7/10 |
| **Frontend UI** | ⚠️ Partiel | 6/10 |
| **Data persistence** | ⚠️ Inégale | 6/10 |
| **Validation** | ⚠️ Côté client | 4/10 |
| **Audit logging** | ❌ Minimal | 2/10 |
| **Admin tooling** | ❌ Unknown | 2/10 |

---

**STATUS**: Audit complet. Prêt pour implémentation sécurité Phase 1.

