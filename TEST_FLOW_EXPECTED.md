# 🧪 TEST FLOW COMPLET BACKEND/FRONTEND

## 📋 Guide d'exécution

### Prérequis
1. **Backend lancé** sur `http://localhost:3000/api`
   ```bash
   cd /home/user/Jeutaime2.0/backend
   npm run dev
   ```

2. **PostgreSQL actif** avec la base de données configurée

### Lancer les tests
```bash
cd /home/user/Jeutaime2.0
./TEST_FLOW.sh
```

---

## 📊 TABLEAU DES ÉTAPES ATTENDUES

| # | Étape | Endpoint | Méthode | Code Attendu | Résultat Attendu | Détails |
|---|-------|----------|---------|--------------|------------------|---------|
| **1** | Register User A | `/auth/register` | POST | 201 | `{ data: { accessToken, refreshToken, userId } }` | Crée un nouvel utilisateur avec email, password, pseudo, date de naissance, genre, ville |
| **2** | Register User B | `/auth/register` | POST | 201 | `{ data: { accessToken, refreshToken, userId } }` | 2e utilisateur, même format |
| **3** | User A - Update Profile | `/profiles/me` | PATCH | 200 | `{ data: { id, userId, pseudo, bio, city, interests[], lookingFor[], interestedIn[], ... } }` | Remplit bio, intérêts, ce qu'il cherche, description physique, etc. |
| **4** | User B - Update Profile | `/profiles/me` | PATCH | 200 | `{ data: { id, userId, pseudo, ... } }` | Remplit le profil de User B |
| **5** | User A - Add Questions | `/profiles/me/questions` | PUT | 200 | `{ data: { matchId, questions } }` | 3 questions avec réponse correcte + 2 mauvaises réponses |
| **6** | User B - Add Questions | `/profiles/me/questions` | PUT | 200 | `{ data: { ... } }` | 3 questions pour User B |
| **7** | User A Smile User B | `/discover/react` | POST | 200 | `{ data: { id, toId, type, matchCreated: false, ... } }` | 1er sourire, match NON créé (pas mutuel) |
| **8** | User B Smile User A | `/discover/react` | POST | 200 | `{ data: { id, toId, type, matchCreated: true, matchId: "...", ... } }` | 2e sourire, match CRÉÉ (réaction mutuelle) |
| **9** | List Matches (User A) | `/matches` | GET | 200 | `{ data: [{ id, status: "PENDING", otherUserId, ... }], meta: { ... } }` | Match en status PENDING (en attente d'acceptation) |
| **10** | Accept Match (User A) | `/matches/:id/accept` | POST | 200 | `{ data: { id, status: "ACTIVE", ... } }` | Match devient ACTIVE après acceptation |
| **11** | Get Match Questions | `/matches/:matchId/questions` | GET | 200 | `{ data: { matchId, questions: [...], myStatus: "pending", myScore: null } }` | Questions de l'autre utilisateur, status "pending" |
| **12** | User A - Submit Answers | `/matches/:matchId/questions/answers` | POST | 200 | `{ data: { myScore: X, passed: boolean, questionsValidated: boolean, ... } }` | User A soumet ses réponses |
| **13** | User B - Submit Answers | `/matches/:matchId/questions/answers` | POST | 200 | `{ data: { myScore: Y, passed: boolean, questionsValidated: boolean, ... } }` | User B soumet ses réponses |
| **14** | User A - Send Letter | `/matches/:matchId/letters` | POST | 201 | `{ data: { id, matchId, content, sentAt, status: "SENT" } }` | Lettre envoyée avec statut SENT |
| **15** | Check User A canSend | `/matches/:id` | GET | 200 | `{ data: { canSend: false, canSendReason: "AWAITING_REPLY", ... } }` | User A NE PEUT PAS renvoyer (en attente de réponse) |
| **16** | User B - Send Letter Reply | `/matches/:matchId/letters` | POST | 201 | `{ data: { id, matchId, content, sentAt, status: "SENT" } }` | Lettre de User B envoyée |
| **17** | Check User B canSend | `/matches/:id` | GET | 200 | `{ data: { canSend: false, canSendReason: "AWAITING_REPLY", ... } }` | User B NE PEUT PAS renvoyer |
| **18** | Get Letters in Match | `/matches/:matchId/letters` | GET | 200 | `{ data: [{ id, content, status, sentAt, readAt }, ...] }` | Liste les 2 lettres échangées |
| **19** | Mark Letter as Read | `/letters/:id/read` | PATCH | 200 | OK | Marque la lettre de User B comme lue par User A |
| **20** | Check Unread Count | `/notifications/unread-count` | GET | 200 | `{ data: { count: 0 } }` | Après lecture, count = 0 ou reduced |

---

## ✅ RÉSULTATS ATTENDUS DÉTAILLÉS

### État Final du Match
```json
{
  "id": "match_xxx",
  "userAId": "userA_id",
  "userBId": "userB_id",
  "status": "ACTIVE",
  "letterCountA": 1,
  "letterCountB": 1,
  "questionsValidated": true,
  "lastLetterBy": "userB_id",
  "lastLetterAt": "2026-05-14T...",
  "canSend": false,
  "canSendReason": "AWAITING_REPLY",
  "hasUnreadIncomingLetter": false
}
```

### État des Lettres
```json
[
  {
    "id": "letter_1",
    "matchId": "match_xxx",
    "fromUserId": "userA_id",
    "toUserId": "userB_id",
    "content": "Bonjour! J'ai adoré...",
    "status": "SENT",
    "sentAt": "2026-05-14T12:34:56Z",
    "readAt": null
  },
  {
    "id": "letter_2",
    "matchId": "match_xxx",
    "fromUserId": "userB_id",
    "toUserId": "userA_id",
    "content": "Salut! Moi aussi...",
    "status": "SENT",
    "sentAt": "2026-05-14T12:35:00Z",
    "readAt": "2026-05-14T12:36:00Z"  // Lue par User A
  }
]
```

---

## 🐛 BUGS COURANTS TESTÉS

| Bug | Symptôme | Cause Probable | Correction |
|-----|----------|----------------|-----------|
| **Lettres 404** | `POST /matches/:id/letters` retourne 404 | Backend pas lancé ou route mal configurée | Lancer le backend |
| **Token 401** | Tout endpoint retourne 401 | Token mal envoyé ou expiré | Vérifier Authorization header |
| **CORS error** | Pas de réponse du backend | CORS_ORIGINS dans .env ne contient pas l'origine frontend | Ajouter l'URL frontend à CORS_ORIGINS |
| **Match not found** | Match créé mais GET /matches retourne vide | Les réactions ne créent pas de match | Vérifier que les 2 sourires sont mutuels |
| **canSend reste true** | Après envoi lettre, canSend=true | Logique d'alternance pas implémentée | Vérifier lettres.controller.ts |
| **Lettre dupliquée** | Envoi lettre créé 2x | Requête retried sans idempotence | Normal pour POST (pas d'idempotence) |
| **Questions missing** | GET /matches/:id/questions 404 | Questions pas créées | User doit faire PUT /profiles/me/questions d'abord |

---

## 📋 CHECKLIST D'EXÉCUTION

- [ ] Backend lancé: `curl http://localhost:3000/api/health` retourne OK
- [ ] Script rendu exécutable: `./TEST_FLOW.sh`
- [ ] Étape 1-2: Register User A & B réussit (201)
- [ ] Étape 3-6: Profils et questions créés (200)
- [ ] Étape 7-8: Sourires échangés, match créé (200)
- [ ] Étape 9-10: Match listé et accepté (200)
- [ ] Étape 11-13: Questions soumises (200)
- [ ] Étape 14-17: Lettres échangées (201), canSend=false (200)
- [ ] Étape 18-20: Lettres listées, marquer comme lue (200)
- [ ] Tous les tests passent: TESTS_PASSED = 20

---

## 🔍 INTERPRÉTATION DES RÉSULTATS

### Tous les tests passent ✅
```
Tous les tests sont passés!
Passed: 20 / 20
```
→ Le flow complet fonctionne. Prêt pour intégration frontend.

### Quelques tests échouent ⚠️
```
Failed: 2 / 20
- FAIL: User A - Send Letter (Expected 201, got 404)
- FAIL: Get Letters in Match (Expected 200, got 404)
```
→ Les endpoints lettres ont un problème. À debug dans le backend.

### Erreur réseau ❌
```
curl: (7) Failed to connect to localhost port 3000: Connection refused
```
→ Backend pas lancé: `cd backend && npm run dev`

---

## 🎯 SUITE DES TESTS

Une fois que tous les tests passent, on peut:
1. Tester le frontend avec les vrais appels API
2. Tester l'alternance des lettres (User A peut renvoyer après User B)
3. Tester le timeout de ghosting (5 jours d'inactivité)
4. Tester les blocages et rapports
5. Tester les notifications et unread counts

---

## 💾 Fichiers de tests

- `TEST_FLOW.sh` - Script d'exécution
- `TEST_FLOW_EXPECTED.md` - Ce document (attentes)
- Les résultats réels s'afficheront dans le terminal lors de l'exécution
