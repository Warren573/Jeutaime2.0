# 🧪 Guide de Test Complet Backend/Frontend

## 📌 Objectif

Tester le flow complet de l'application:
1. Inscription de 2 utilisateurs
2. Création de leurs profils
3. Échange de "smiles" (sourires/grimaces)
4. Création automatique du match
5. Acceptation du match
6. Jeu des 3 questions
7. Échange de lettres
8. Vérification des alternances et compteurs

---

## 🚀 DÉMARRAGE RAPIDE

### Étape 1: Lancer le backend
```bash
cd /home/user/Jeutaime2.0/backend

# Configuration (une fois)
cp .env.example .env
# Éditer .env avec DATABASE_URL et JWT secrets
npm install
npm run setup:local

# Lancer en développement
npm run dev
```

**Vérifier qu'il écoute:**
```bash
curl http://localhost:3000/api/health
# Doit répondre: {"status":"ok"}
```

### Étape 2: Lancer les tests
```bash
cd /home/user/Jeutaime2.0
./TEST_FLOW.sh
```

### Étape 3: Interpréter les résultats
Voir `TEST_FLOW_EXPECTED.md` pour les réponses attendues.

---

## 📊 STRUCTURE DES TESTS

### Test Flow (20 étapes)

```
ÉTAPE 1-2:   Inscription (register)
ÉTAPE 3-6:   Profils & Questions (profile setup)
ÉTAPE 7-8:   Réactions (sourires mutuels → match créé)
ÉTAPE 9-10:  Acceptation (match ACTIVE)
ÉTAPE 11-13: Questions validées
ÉTAPE 14-17: Lettres échangées (alternance)
ÉTAPE 18-20: Compteurs & Read status
```

### Points clés testés

| Point | Étapes | Vérification |
|-------|--------|--------------|
| **Auth** | 1-2 | Tokens générés, users créés |
| **Profil** | 3-4 | Bio, intérêts, city stockés |
| **Questions** | 5-6 | 3 questions + réponses requises |
| **Match** | 7-10 | Sourires mutuels → match ACTIVE |
| **Jeu** | 11-13 | Réponses évaluées |
| **Lettres** | 14-17 | Envoi + alternance (canSend) |
| **Compteurs** | 18-20 | Unread count, readAt |

---

## 🔍 RÉSULTATS ATTENDUS

### ✅ Succès complet
Tous les 20 tests passent (code HTTP correct).

### ⚠️ Partiellement réussi
Certains endpoints retournent une erreur. Voir le détail:
- `404`: Endpoint non trouvé ou route mal configurée
- `401`: Token invalide ou pas envoyé
- `400`: Validation échouée (vérifier les données)
- `500`: Erreur serveur (vérifier les logs backend)

### ❌ Échec total
Backend pas accessible → `curl: (7) Failed to connect`

---

## 🐛 Troubleshooting

### Le backend ne démarre pas
```bash
# Vérifier PostgreSQL
psql "postgresql://postgres:postgres@localhost:5432/jeutaime_dev"

# Vérifier les variables d'environnement
cat backend/.env | grep DATABASE_URL

# Relancer
cd backend && npm run dev
```

### Tests retournent 404 sur `/matches/:id/letters`
→ Vérifier que `backend/src/modules/matches/matches.routes.ts` contient:
```typescript
router.get("/:matchId/letters", ...)
router.post("/:matchId/letters", ...)
```

### Tests retournent 401 partout
→ Tokens pas générés correctement ou pas envoyés.
→ Vérifier que `TOKEN_A` et `TOKEN_B` ne sont pas vides dans le script.

### Tests retournent 400 "Questions not validated"
→ Les questions doivent être créées AVANT d'envoyer une lettre.
→ Vérifier étapes 5-6 passent (code 200).

---

## 📈 Résultats documentés

Une fois les tests exécutés, créer un fichier `TEST_RESULTS.md` avec:

```markdown
# Résultats du Test Flow

Date: 2026-05-14
Backend: http://localhost:3000/api
PostgreSQL: jeutaime_dev

## Résumé
- Tests passés: 20 / 20 ✅
- Tests échoués: 0
- Durée: ~15 secondes

## Détails par étape
(Copier les résultats du test ici)

## Bugs trouvés
Aucun

## Actions suivantes
- ✅ Backend prêt pour intégration frontend
- Tester sur la vraie app Expo/iOS
```

---

## 🎯 PROCHAINES ÉTAPES

Une fois tous les tests verts:

1. **Tester sur le frontend Expo**
   - Accès au backend via `EXPO_PUBLIC_API_URL`
   - CORS configuré correctement
   - Flow complet fonctionnel end-to-end

2. **Tests manuels supplémentaires**
   - Upload de photos
   - Découverte avec filtres
   - Blocage / déblocage
   - Notifications push
   - Ghosting détection

3. **Performance**
   - Tests de charge
   - Timeout sous forte charge
   - Pagination des résultats

---

## 📝 Notes

- Le script utilise `curl` pour éviter les dépendances externes
- Les tokens sont stockés en variables pour les requêtes suivantes
- Les erreurs de réseau causent une création de match "fausse" → à re-run le script
- Les données de test sont jetées après chaque exécution (pas de nettoyage)

---

## ✉️ Support

Si un test échoue:
1. Vérifier les logs du backend: `npm run dev`
2. Vérifier le fichier concerné dans le backend
3. Vérifier la réponse exacte: ajouter `-v` à la commande curl du script
4. Vérifier la structure des données: `curl -s ... | jq .`

Exemple:
```bash
# Déboguer une requête
curl -v -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{...}' | jq .
```

---

## 🏁 Résumé

| Phase | Status | Action |
|-------|--------|--------|
| Backend setup | 📋 Guide fourni | Lancer `npm run dev` |
| Test script | ✅ Créé | Exécuter `./TEST_FLOW.sh` |
| Attentes | 📋 Documentées | Voir `TEST_FLOW_EXPECTED.md` |
| Résultats | ⏳ À exécuter | Lancer le test et capture les résultats |
| Bugs | ❓ À identifier | Documenter et proposer corrections |
| Frontend | 🔗 Prêt | Connecter une fois backend validé |

---

**Besoin d'aide?** Voir `LOCAL_SETUP.md` pour le backend ou `TEST_FLOW_EXPECTED.md` pour les détails des tests.
