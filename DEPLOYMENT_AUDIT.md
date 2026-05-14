# Audit de Déploiement - JeuTaime 2.0

**Date:** 2026-05-14  
**Status:** Analyse complète - En attente de stratégie finale  
**Main Branch:** ✅ Contient tous les fixes PR #61

---

## 1. État du Code Principal

### ✅ Merge PR #61 Confirmé
- Commit merge: `8b7bfcfb` ("Merge pull request #61...")
- Parent: `f55ad341` (Merge: Fix app regression - 6 bugs fixed)
- Tests: 20/20 passing (100%)
- Migrations: 9 applied (latest: 20260511000000_add_show_photo_by_default)

---

## 2. Plateforme de Déploiement Détectée

### Backend: **Render** ✅ (Confirmé)
Evidence:
- `backend/package.json` contient script: `"start:render": "npx prisma db push && node dist/server.js"`
- Render est un PaaS Node.js populaire (alternative à Heroku)
- Supporte les vars d'environnement et déploiement via git/GitHub

### Frontend: **Vercel** ✅ (Confirmé)
Evidence:
- `frontend/vercel.json` présent avec config de build
- `backend/src/config/env.ts` ligne 69: détecte `.vercel.app` dans CORS
- Expo web export compatible Vercel

### Database: **PostgreSQL** ✅ (Confirmé)
Evidence:
- `backend/prisma/schema.prisma` → `datasource db { provider = "postgresql" }`
- Nom de DB: `jeutaime_dev` (développement)
- Neon (PostgreSQL as a Service) ou Supabase sont les choix courants avec Render

---

## 3. Configuration Actuelle (Développement)

### Backend (.env)
```
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jeutaime_dev"
JWT_ACCESS_SECRET=abcdefghijklmnopqrstuvwxyz123456
JWT_REFRESH_SECRET=zyxwvutsrqponmlkjihgfedcba654321
CORS_ORIGINS=http://localhost:8081,http://localhost:3000,http://192.168.0.40:8081
RATE_LIMIT_AUTH_MAX=100 (changé de 5 pour testing)
BCRYPT_ROUNDS=12
```

### Frontend (.env)
```
EXPO_PUBLIC_API_URL=http://192.168.0.40:3000/api
```

### Health Checks ✅
- GET `/api/health` → { status: "ok", service: "jeutaime-api" }
- GET `/api/health/db` → { status: "ok", db: "connected" }

---

## 4. Fichiers de Configuration Requis

### ✅ Backend
- `backend/package.json` — scripts, dépendances
- `backend/.env.example` — template des vars
- `backend/prisma/schema.prisma` — schéma DB
- `backend/prisma/migrations/` — 9 migrations appliquées
- `backend/src/config/env.ts` — validation Zod des vars

### ✅ Frontend
- `frontend/package.json` — build Expo
- `frontend/.env.example` — template EXPO_PUBLIC_API_URL
- `frontend/vercel.json` — config de build Vercel

### ⚠️ À Créer/Vérifier
- `backend/.env.production` (template pour production)
- `backend/.env.staging` (template pour staging)
- `frontend/.env.production` (API URL en production)
- `frontend/.env.staging` (API URL en staging)

---

## 5. Variables d'Environnement Critiques

### Backend Production (Render)

| Variable | Type | Exemple | Notes |
|----------|------|---------|-------|
| `NODE_ENV` | string | `production` | ✅ Active "trust proxy" |
| `PORT` | number | `3000` | Render assigne automatiquement |
| `DATABASE_URL` | string | `postgresql://...` | **Critique** — Neon/Supabase |
| `JWT_ACCESS_SECRET` | string | 32+ chars | Générer avec `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | string | 32+ chars | Générer avec `openssl rand -base64 32` |
| `CORS_ORIGINS` | string | `https://jeutaime.vercel.app,https://app.jeutaime.com` | URLs de prod frontend |
| `BCRYPT_ROUNDS` | number | `12` | 12-14 pour production |
| `ENABLE_SCHEDULER` | string | `true` | Active cron jobs (purge tokens, etc.) |
| `LOG_LEVEL` | string | `info` | Production: info ou warn |
| `RATE_LIMIT_*` | numbers | Voir `.env.example` | Ajuster selon trafic |

### Frontend Production (Vercel)

| Variable | Type | Exemple | Notes |
|----------|------|---------|-------|
| `EXPO_PUBLIC_API_URL` | string | `https://api.jeutaime.render.com/api` | Backend API complète |

### Database Production (PostgreSQL/Neon/Supabase)

| Paramètre | Valeur | Notes |
|-----------|--------|-------|
| **Fournisseur** | Neon OU Supabase | PostgreSQL managé |
| **Région** | EU (Europe) | Pour RGPD/latence |
| **Backups** | Daily | Au minimum |
| **SSL** | ✅ Obligatoire | CONNECTION_STRING avec ?sslmode=require |
| **Pools** | PgBouncer activé | Pour Node.js |
| **Replica** | Optionnel | Pour scaling reads |

---

## 6. Migrations Prisma

### Migrations Appliquées (9 total)

```
1. 20260410000000_phase5_salon_cms
2. 20260411000000_phase10_notifications
3. 20260422000000_add_profile_v1_fields
4. 20260426000000_add_reactions           ← Nouvelles pour fix
5. 20260427000000_add_question_attempts   ← Nouvelles pour fix
6. 20260427000100_add_blur_medium_path
7. 20260429000000_add_card_game
8. 20260430000000_add_push_tokens
9. 20260511000000_add_show_photo_by_default
```

### Déploiement des Migrations

**Render Start Command:**
```bash
npx prisma db push && node dist/server.js
```

Ou alternativement:
```bash
npx prisma migrate deploy && node dist/server.js
```

**Différence:**
- `db push` — Synchronise schema local → DB (mode développement/prototypage)
- `migrate deploy` — Applique migrations numérotées (mode production strict)

⚠️ **Pour production:** Utiliser `migrate deploy` (versioning strict des migrations)

---

## 7. Points de Vérification Déploiement

### Backend (Render)

- [ ] Repository GitHub lié à Render
- [ ] Variables d'environnement définies dans Render dashboard
  - [ ] DATABASE_URL (Neon/Supabase)
  - [ ] JWT_ACCESS_SECRET (32+ chars)
  - [ ] JWT_REFRESH_SECRET (32+ chars)
  - [ ] CORS_ORIGINS (domaines frontend)
  - [ ] NODE_ENV = `production`
  - [ ] ENABLE_SCHEDULER = `true` (si jobs nécessaires)
- [ ] Build command: `npm install && npm run build`
- [ ] Start command: `npx prisma migrate deploy && node dist/server.js`
- [ ] Health check: GET `/api/health` → 200 OK
- [ ] Database check: GET `/api/health/db` → 200 OK
- [ ] SSL/HTTPS: ✅ Automatique sur Render

### Frontend (Vercel)

- [ ] Repository GitHub lié à Vercel
- [ ] Environment variable: `EXPO_PUBLIC_API_URL` (API backend URL)
- [ ] Build command: `npx expo export -p web`
- [ ] Output directory: `dist`
- [ ] Framework preset: **Other** (custom)
- [ ] Build should work: `yarn build` ou `npm run build` test local
- [ ] Environment variables: Secret if needed

### Database (PostgreSQL)

- [ ] PostgreSQL 14+ (Neon/Supabase)
- [ ] Région sélectionnée (EU)
- [ ] SSL mode: `require`
- [ ] Backups: Daily + 7-day retention
- [ ] Connection pooling: Activé (PgBouncer)
- [ ] Max connections: Adapté au nombre d'instances Node

---

## 8. Test Plan Déploiement (Post-Merge)

### Phase 1: Préparation DB Production

```bash
# 1. Créer DB PostgreSQL sur Neon/Supabase
# 2. Noter CONNECTION_STRING
# 3. Ajouter en Render dashboard: DATABASE_URL
# 4. Vérifier SSL: sslmode=require dans CONNECTION_STRING
```

### Phase 2: Déploiement Backend (Render)

```bash
# 1. Connecter GitHub repo à Render
# 2. Ajouter toutes les vars d'environnement
# 3. Deploy → Watch logs
# 4. Vérifier: GET /api/health → 200
# 5. Vérifier: GET /api/health/db → 200
```

### Phase 3: Authentification (Test)

```bash
# Depuis curl ou Postman:
POST /api/auth/register
{
  "email": "test@jeutaime.com",
  "password": "SecurePass123!",
  "pseudo": "TestUser"
}

# Réponse attendue:
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "userId": "cmp5bvaiv003kvc9d2c28y5l1"
}
```

### Phase 4: Profil (Test)

```bash
# PATCH /api/profiles/me
# Vérifier que mise à jour fonctionne
# Vérifier: pseudo max 30 chars
```

### Phase 5: Match & Lettres (Test)

```bash
# 1. Créer 2 utilisateurs (User A, User B)
# 2. Envoyer reactions (smile)
# 3. Accepter match
# 4. Répondre questions
# 5. Envoyer/recevoir lettres
# 6. Tester alternation (initiator peut envoyer en premier)
```

### Phase 6: Déploiement Frontend (Vercel)

```bash
# 1. Connecter GitHub repo à Vercel
# 2. Ajouter EXPO_PUBLIC_API_URL = https://[backend].render.com/api
# 3. Deploy → Verify build
# 4. Tester application web: https://jeutaime.vercel.app
```

---

## 9. CORS Configuration Détails

### Actuellement (Développement)
```
CORS_ORIGINS=http://localhost:8081,http://localhost:3000,http://192.168.0.40:8081
```

### Production (À Confirmer)
```
CORS_ORIGINS=https://jeutaime.vercel.app,https://jeutaime.render.com,https://app.jeutaime.com
```

### Auto-Allowed (Code dans env.ts)
- `*.vercel.app` (tous les déploiements Vercel, previews inclus)
- `localhost:*` (toutes les instances locales)
- No Origin header (requests depuis mobile apps, server-to-server)

---

## 10. Scheduler Jobs (Cron)

**Activé en production:** ENABLE_SCHEDULER=true

### Jobs Actuels
1. **Demote Expired Premium** — Retirer premium expiré
2. **Expire Card Games** — Expirer cartes de jeu
3. **Purge Expired Refresh Tokens** — Nettoyer tokens (grace period: 1h)

### Configuration
```
ENABLE_SCHEDULER=true
SCHEDULER_INTERVAL_MS=300000  (5 minutes)
REFRESH_TOKEN_PURGE_GRACE_MS=3600000  (1 heure)
```

---

## 11. Checklist Avant Déploiement

### Validation Code
- [ ] `npm run typecheck` → 0 errors
- [ ] `npm test` → 339/341 passing (pre-existing 2 failures OK)
- [ ] `bash TEST_FLOW.sh` → 20/20 passing
- [ ] `node test-frontend.js` → 20/20 passing

### Configuration Préparée
- [ ] `.env.production` template créé
- [ ] `.env.staging` template créé (optionnel)
- [ ] Secrets JWT générés (32+ chars minimum)
- [ ] Database connection string testée localement
- [ ] CORS_ORIGINS listés correctement

### Infrastructure Créée
- [ ] PostgreSQL database sur Neon/Supabase
- [ ] Render app créée
- [ ] Vercel project créé
- [ ] GitHub connexions vérifiées

### Monitoring
- [ ] Healthchecks configurés dans Render
- [ ] Logs accessibles (Pino logging activé)
- [ ] Error alerts configurés (optionnel)

---

## 12. Points Stratégiques À Clarifier

⚠️ **Ne rien déployer tant que ces questions ne sont pas répondues:**

1. **Production Database**
   - Neon (simple, PostgreSQL) ?
   - Supabase (PostgreSQL + extras) ?
   - RDS AWS (enterprise) ?

2. **Frontend Hosting**
   - Vercel (déjà configuré + gratuit) ?
   - Netlify (alternative) ?
   - Même serveur que backend ?

3. **Domaines Personnalisés**
   - Quel domaine pour backend ? (ex: api.jeutaime.com)
   - Quel domaine pour frontend ? (ex: app.jeutaime.com)
   - Certificats SSL ? (Render/Vercel gèrent automatiquement)

4. **Environnements Multiples**
   - Staging branch à part de production ?
   - Staging database séparée ?
   - Production environment strictement isolé ?

5. **Données Initiales**
   - Seed data nécessaire en production ?
   - Import de données depuis dev ?
   - Administrateurs créés manuellement ?

6. **Backups & Disaster Recovery**
   - Rétention des backups DB ? (7 jours par défaut)
   - Export/restore procedures documentées ?
   - Plan de rollback clarifié ?

---

## 13. Prochaines Étapes

### Immédiat (Une fois stratégie validée)
1. Créer `.env.production` avec vraies valeurs
2. Créer database PostgreSQL sur Neon/Supabase
3. Créer app Render et connecter GitHub
4. Créer project Vercel et connecter GitHub
5. Faire déploiement de test (staging environment)

### À Court Terme
1. Valider flot complet en production
2. Tester authentification → match → lettres
3. Configurer monitoring/logs
4. Créer runbook de déploiement

### À Moyen Terme
1. Setup CI/CD pipeline (GitHub Actions)
2. Automatiser tests avant déploiement
3. Configurer alertes
4. Documenter procédure d'incident

---

## 14. Références

### Fichiers Clés
- `backend/.env.example` — Template complet des variables
- `backend/package.json` — Scripts: dev, build, start:render
- `backend/src/config/env.ts` — Validation Zod, CORS rules
- `backend/prisma/schema.prisma` — Schéma DB
- `frontend/vercel.json` — Config Vercel
- `frontend/.env.example` — Template EXPO_PUBLIC_API_URL

### Platforms
- **Render:** https://render.com (Node.js hosting)
- **Vercel:** https://vercel.com (Frontend hosting)
- **Neon:** https://neon.tech (PostgreSQL serverless)
- **Supabase:** https://supabase.com (PostgreSQL + extras)

### Documentation
- Prisma: https://www.prisma.io/docs/guides/deployment
- Render: https://render.com/docs
- Vercel: https://vercel.com/docs
- Express CORS: https://expressjs.com/en/resources/middleware/cors.html

---

**Status:** ⏳ **EN ATTENTE DE DÉCISIONS STRATÉGIQUES**

Avant toute action de déploiement, faire clarifier:
1. Plateforme database (Neon/Supabase/autre)
2. Domaines personnalisés
3. Environnements (production + staging ?)
4. Données initiales et seeding
