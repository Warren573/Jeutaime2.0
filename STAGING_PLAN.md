# Plan de Déploiement Staging - JeuTaime 2.0

**Date:** 2026-05-14  
**Scope:** Staging privé non-public (test interne)  
**Base:** Commit 8b7bfcfb (PR #61 mergée, 20/20 tests)  
**Livraison:** URLs testables mais sans ouverture publique

---

## 1. Architecture Staging (Recommandée)

### Stack Simple & Éprouvée

```
┌─────────────────────────────────────────────────────────────┐
│                     STAGING ENVIRONMENT                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend (Vercel)        Backend (Render)   Database        │
│  ─────────────────        ──────────────     ────────        │
│  staging.jeutaime-        staging-api.       Neon            │
│  staging.vercel.app       render.com         PostgreSQL      │
│  (Protected DNS)          (Env vars)         (Copy of prod)  │
│                                                               │
│  ✓ CI/CD auto            ✓ Github deploy    ✓ Auto backups   │
│  ✓ Preview URLs          ✓ Env secrets      ✓ SSL included  │
│  ✓ 20 concurrent users   ✓ Logs accessible ✓ 99.9% uptime   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Services Recommandés

| Composant | Service | Raison |
|-----------|---------|--------|
| **Backend** | Render Free Tier | Simple, free, Node.js natif, migrations auto |
| **Frontend** | Vercel (Hobby) | Déjà configured, Expo export compatible, gratuit |
| **Database** | Neon Free Tier | PostgreSQL managé, 1GB free, easy scaling |
| **Secrets** | Render + Vercel dashboards | Pas besoin 3e service |
| **Monitoring** | Built-in logs | Pino logs via Render, basic alerting |

---

## 2. Configuration Détaillée

### 2.1 Backend (Render)

#### Repository Setup
```bash
# 1. Connecter repository GitHub à Render
# https://render.com/dashboard
# → New+ → Web Service → Connect GitHub repo
# → Repository: Warren573/Jeutaime2.0
# → Branch: main
```

#### Build Configuration
```
Build Command:  npm install && npm run build
Start Command:  npx prisma migrate deploy && node dist/server.js
Environment:    Node 22.x
Region:         EU (Frankfurt) — pour latence + RGPD
Tier:           Free Tier (0.25 CPU, 512MB RAM) ou Starter ($7/mois)
```

#### Environment Variables (Render Dashboard)
```
NODE_ENV=staging
PORT=3000
API_PREFIX=/api

DATABASE_URL=postgresql://user:pass@neon-staging.neon.tech:5432/jeutaime_staging?sslmode=require

JWT_ACCESS_SECRET=[GÉNÉRER: openssl rand -base64 32]
JWT_REFRESH_SECRET=[GÉNÉRER: openssl rand -base64 32]
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

BCRYPT_ROUNDS=12

CORS_ORIGINS=https://staging.jeutaime.vercel.app,https://jeutaime-staging.vercel.app,http://localhost:8081,http://localhost:3000

UPLOAD_DIR=./storage/photos
MAX_FILE_SIZE_MB=5

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
RATE_LIMIT_AUTH_MAX=20
RATE_LIMIT_LETTERS_MAX=20
RATE_LIMIT_LETTERS_WINDOW_MS=3600000
RATE_LIMIT_REPORTS_MAX=5
RATE_LIMIT_REPORTS_WINDOW_MS=3600000
RATE_LIMIT_PHOTO_UPLOAD_MAX=10
RATE_LIMIT_PHOTO_UPLOAD_WINDOW_MS=3600000

LOG_LEVEL=info
ENABLE_SCHEDULER=true
SCHEDULER_INTERVAL_MS=300000
REFRESH_TOKEN_PURGE_GRACE_MS=3600000
```

#### Deploy
```bash
# Render deploy automatically on:
# 1. Push to main branch
# 2. Manual trigger via dashboard
# OR:
# 3. git push triggers GitHub webhook

# Render logs:
# Accessible via: https://render.com/dashboard → Web Service → Logs
```

#### Santé Check
```bash
# Vérifier après déploiement:
curl https://staging-api.render.com/api/health
# Expected: { "status": "ok", "service": "jeutaime-api" }

curl https://staging-api.render.com/api/health/db
# Expected: { "status": "ok", "db": "connected" }
```

---

### 2.2 Database (Neon PostgreSQL)

#### Setup

```bash
# 1. Créer account Neon
# https://console.neon.tech
# → Create Project → Select region EU
# → Create database "jeutaime_staging"

# 2. Récupérer connection string
# Format: postgresql://user:password@host:5432/jeutaime_staging?sslmode=require

# 3. Copier en Render environment: DATABASE_URL
```

#### Migrations

```bash
# Render exécute automatiquement:
npx prisma migrate deploy

# Cette commande:
# ✓ Applique les 9 migrations
# ✓ Crée toutes les tables (users, profiles, matches, letters, etc.)
# ✓ Valide le schéma
# ✓ Idempotent (safe to run multiple times)
```

#### Données Initiales (Optionnel)

```bash
# Si seed data nécessaire:
# 1. Créer admin user
POST https://staging-api.render.com/api/auth/register
{
  "email": "admin@staging.jeutaime",
  "password": "StrongPass123!",
  "pseudo": "AdminStaging"
}

# 2. Ou importer depuis dev (avec care)
# Ne pas copier les données de production!
```

---

### 2.3 Frontend (Vercel)

#### Repository Setup
```bash
# 1. Connecter repo GitHub à Vercel
# https://vercel.com/dashboard
# → Add New → Project → Import Git Repository
# → Select: Warren573/Jeutaime2.0
```

#### Build Configuration
```
Framework:           Other (Expo)
Build Command:       npx expo export -p web
Output Directory:    dist
Install Command:     npm install
Environment:         Node 22.x
```

#### Environment Variables
```
EXPO_PUBLIC_API_URL=https://staging-api.render.com/api
```

#### Deploy
```bash
# Vercel deploy automatically on:
# 1. Push to main branch
# OR manually via dashboard

# URL générée:
# https://jeutaime2-0.vercel.app (auto)
# Ou custom: https://jeutaime-staging.vercel.app (custom domain)
```

#### Build Test Local
```bash
cd frontend
export EXPO_PUBLIC_API_URL="https://staging-api.render.com/api"
npx expo export -p web
# Output: dist/ folder
# Upload to Vercel or test locally
```

---

## 3. Checklist Déploiement Staging

### Phase 1: Préparation (30 min)

- [ ] Générer JWT secrets
  ```bash
  openssl rand -base64 32  # Do this 2x
  ```

- [ ] Créer account Neon (free)
  - [ ] Créer database "jeutaime_staging"
  - [ ] Copier CONNECTION_STRING

- [ ] Créer account Render (free)
  - [ ] Connecter GitHub repo

- [ ] Vercel (libre si account existe)
  - [ ] Connecter GitHub repo

### Phase 2: Backend Deployment (20 min)

- [ ] Render setup
  - [ ] Web Service → main branch
  - [ ] Build: `npm install && npm run build`
  - [ ] Start: `npx prisma migrate deploy && node dist/server.js`
  - [ ] Environment variables: Tous listés ci-dessus

- [ ] Database Render
  - [ ] DATABASE_URL = Neon connection string

- [ ] Deploy & Test
  - [ ] Render → Deploy (watch logs)
  - [ ] Wait: ~5-10 min pour build + deploy
  - [ ] Test health: GET /api/health → 200
  - [ ] Test DB: GET /api/health/db → 200
  - [ ] Check Render logs pour erreurs

### Phase 3: Frontend Deployment (15 min)

- [ ] Vercel setup
  - [ ] Import project from GitHub
  - [ ] Framework: Other
  - [ ] Build command: `npx expo export -p web`

- [ ] Environment
  - [ ] EXPO_PUBLIC_API_URL = Backend URL (Render)

- [ ] Deploy & Test
  - [ ] Vercel → Deploy (auto ou manual)
  - [ ] Wait: ~3-5 min
  - [ ] Test: https://jeutaime-staging.vercel.app
  - [ ] Check network requests: Point vers backend staging

### Phase 4: Smoke Tests (30 min)

#### Tester Core Flow
```bash
# Script: Use same as TEST_FLOW.sh but targeting staging URL

# 1. Register User A
curl -X POST https://staging-api.render.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testA@staging.jeutaime",
    "password": "Password123!",
    "pseudo": "TestUserA"
  }'

# Extract: userId, accessToken

# 2. Complete profile
curl -X PATCH https://staging-api.render.com/api/profiles/me \
  -H "Authorization: Bearer $accessToken" \
  -d '{
    "pseudo": "TestA",
    "bio": "Staging test user",
    "gender": "HOMME"
  }'

# 3. Setup questions
curl -X PUT https://staging-api.render.com/api/profiles/me/questions \
  -H "Authorization: Bearer $accessToken" \
  -d '{
    "questions": [
      {
        "question": "Hobby?",
        "answer": "Coding",
        "wrongAnswers": ["Reading", "Sports"]
      },
      // ... 2 more
    ]
  }'

# 4. Register User B (repeat steps 1-3)

# 5. Send smile (User A → User B)
curl -X POST https://staging-api.render.com/api/discover/react \
  -H "Authorization: Bearer $tokenA" \
  -d '{ "reactedUserId": "userB", "reaction": "SMILE" }'

# 6. Send smile back (User B → User A) = creates MATCH
curl -X POST https://staging-api.render.com/api/discover/react \
  -H "Authorization: Bearer $tokenB" \
  -d '{ "reactedUserId": "userA", "reaction": "SMILE" }'

# 7. Accept match (User A)
curl -X POST https://staging-api.render.com/api/matches/$matchId/accept \
  -H "Authorization: Bearer $tokenA"

# 8-20: Rest of flow (questions game → letters)
```

#### Frontend Web Tests
1. Open https://jeutaime-staging.vercel.app
2. Register User A
3. Complete profile
4. Add 3 questions
5. Search discover
6. Send smile → match
7. Accept match
8. Play questions
9. Send/receive letters

**Expected:** Tous les 20 ÉTAPES passent (identique à local)

---

## 4. Risques & Mitigation

| Risque | Likelihood | Impact | Mitigation |
|--------|------------|--------|-----------|
| **JWT secrets compromis** | Low | Critical | Store in Render secrets only, rotate monthly |
| **Database connection fails** | Low | Critical | Test Neon SSL, use sslmode=require |
| **Migrations fail** | Very Low | High | Run locally first, test rollback script |
| **CORS blocks requests** | Medium | Medium | Verify CORS_ORIGINS includes staging frontend URL |
| **Render free tier slow** | Medium | Low | Upgrade to Starter if needed ($7/mth) |
| **Vercel build times out** | Low | Medium | Check build logs, optimize if needed |
| **Data leak (test data)** | Medium | High | Use fake test data only, never production copies |
| **Scheduler running in staging** | Low | Low | Set ENABLE_SCHEDULER=true (OK for test) |

---

## 5. Accès & Sécurité

### Qui a accès?

**Staging est PRIVÉ:**
- [ ] Pas de DNS public
- [ ] Pas de annonce
- [ ] Pas de robots.txt indexing
- [ ] Accès par URL opaque ou IP whitelist (optionnel)

### Authentification

- [ ] Render secrets: Pas exposés en logs
- [ ] Vercel secrets: Masqués du public
- [ ] Database: SSL required, password fort
- [ ] Staging data: Test data ONLY (pas de vraies données)

### Monitoring

- [ ] Render logs: Accessible via dashboard
- [ ] Vercel logs: Accessible via dashboard
- [ ] Alertes: Optionnelles (free tier limité)
- [ ] Manual checks: Quotidiens si actif

---

## 6. Déploiement Pas à Pas

### Étape 1: Préparer Secrets

```bash
# Terminal local
cd /home/user/Jeutaime2.0

# Générer JWT secrets
JWT_ACCESS=$(openssl rand -base64 32)
JWT_REFRESH=$(openssl rand -base64 32)

echo "JWT_ACCESS_SECRET=$JWT_ACCESS"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH"

# Save these in password manager / secure place
```

### Étape 2: Neon Database

```bash
# 1. Créer account: https://console.neon.tech
# 2. Créer project → select EU region
# 3. Créer database: jeutaime_staging
# 4. Copier connection string (format: postgresql://...)
# 5. Tester locally:

psql "postgresql://user:pass@host:5432/jeutaime_staging?sslmode=require" -c "SELECT 1"
# Should return: 1
```

### Étape 3: Render Backend

```bash
# 1. https://render.com/dashboard → New Web Service
# 2. Select repository: Warren573/Jeutaime2.0
# 3. Configure:
#    - Name: "jeutaime-staging-api"
#    - Branch: main
#    - Build: npm install && npm run build
#    - Start: npx prisma migrate deploy && node dist/server.js
#    - Region: EU (Frankfurt)
#    - Tier: Free or Starter ($7)

# 4. Add environment variables (copy from section 2.1)

# 5. Deploy → Watch logs (takes ~10 min)
# 6. After deploy, test:
curl https://jeutaime-staging-api.render.com/api/health
```

### Étape 4: Vercel Frontend

```bash
# 1. https://vercel.com/dashboard → Add New → Import
# 2. Select repository: Warren573/Jeutaime2.0
# 3. Configure:
#    - Framework: Other
#    - Build command: npx expo export -p web
#    - Output: dist
#    - Root directory: frontend

# 4. Add environment variable:
#    EXPO_PUBLIC_API_URL = https://jeutaime-staging-api.render.com/api

# 5. Deploy → Auto or Manual (takes ~5 min)
# 6. After deploy, test: https://jeutaime2-0.vercel.app
```

### Étape 5: Test Complete Flow

```bash
# A. Smoke tests (5 min)
# - Register 2 users
# - Create profiles
# - Send smiles
# - Accept match
# - Play questions
# - Send letters

# B. Check logs
# - Render logs: https://render.com/dashboard
# - Vercel logs: https://vercel.com/dashboard

# C. Cleanup (optional)
# - Delete test users if needed
# - Reset test data if needed
```

---

## 7. Maintenance Staging

### Weekly

- [ ] Check Render logs for errors
- [ ] Test health endpoints
- [ ] Verify database size (if growing, clean test data)

### Monthly

- [ ] Update Render/Vercel secrets if needed
- [ ] Review staging logs for issues
- [ ] Prepare for production deployment

### Before Production

- [ ] Run full TEST_FLOW.sh against staging URLs
- [ ] Run manual flow test (20 ÉTAPES)
- [ ] Check CORS headers
- [ ] Verify JWT expiration handling
- [ ] Test rate limiting
- [ ] Confirm scheduler jobs running

---

## 8. URLs de Référence

### Staging Endpoints

```
Backend:   https://jeutaime-staging-api.render.com/api
Frontend:  https://jeutaime-staging.vercel.app

Health:    https://jeutaime-staging-api.render.com/api/health
DB Check:  https://jeutaime-staging-api.render.com/api/health/db
```

### Dashboards

```
Render:  https://render.com/dashboard
Vercel:  https://vercel.com/dashboard
Neon:    https://console.neon.tech
```

---

## 9. Rollback & Recovery

### Si Backend Fails

```bash
# 1. Render dashboard → Web Service
# 2. Manual Deploy → Select previous build
# 3. Or reset DATABASE_URL if DB corruption suspected
# 4. Monitor logs for root cause
```

### Si Database Corrupt

```bash
# 1. Neon console → Restore backup (free 7-day backups)
# 2. Or recreate database from scratch:
#    - Delete old jeutaime_staging
#    - Create new jeutaime_staging
#    - Re-run migrations
```

### Si Frontend Fails

```bash
# 1. Vercel dashboard → Deployments
# 2. Rollback to previous build
# 3. Check Vercel logs for build errors
```

---

## 10. Migration Vers Production

**Une fois staging validé:**

1. **Créer Production Database** (Neon prod)
   - Nom: `jeutaime_prod`
   - Région: EU
   - Backups: Daily + 30-day retention

2. **Créer Production Backend** (Render prod)
   - Tier: Starter ($7/mth) minimum
   - DATABASE_URL: Production Neon
   - Same environment variables as staging
   - Region: EU

3. **Créer Production Frontend** (Vercel prod)
   - EXPO_PUBLIC_API_URL: Production backend
   - Custom domain: app.jeutaime.com
   - SSL: Auto (Vercel)

4. **Smoke Test Production**
   - Run full TEST_FLOW.sh
   - Manual flow test
   - Monitor 24h

5. **Launch & Communicate**
   - Announce public availability
   - Setup support channel
   - Monitor errors

---

## 11. Coûts Estimés

### Staging (Free)
- Render: Free Tier (0.25 CPU, 512MB) = $0
- Vercel: Hobby (free) = $0
- Neon: Free Tier (1GB) = $0
- **Total: $0/mth**

### Production (avec usage)
- Render: Starter ($7/mth) or Standard ($29+)
- Vercel: Pro ($20/mth) if needed
- Neon: Standard ($0.135/GB excess) + backups
- **Estimated: $30-50/mth minimum**

---

## 12. Checklist Finale (Avant Production)

- [ ] Staging déployé et fonctionnel
- [ ] 20/20 tests passent en staging
- [ ] Health checks répondent
- [ ] JWT secrets générés et stockés
- [ ] CORS configuré correctement
- [ ] Logs accessibles et lisibles
- [ ] Database backups fonctionnent
- [ ] Rate limiting vérifié
- [ ] Scheduler jobs running (si aktivé)
- [ ] No hardcoded secrets in code
- [ ] No test data in database (clean before prod)
- [ ] Documentation staging stable
- [ ] Team trained on staging process

---

## Résumé: Déploiement Rapide Staging

**Temps total:** ~2 heures (première fois)

```
Prep (Secrets):      15 min
Neon Setup:          10 min
Render Deploy:       15 min (auto-deploy included)
Vercel Deploy:       10 min (auto-deploy included)
Testing:             30 min
Troubleshooting:     30 min (buffer)
────────────────────────────
Total:              ~2 hours
```

**Services Free:** Render Free + Vercel Hobby + Neon Free = $0

**Après:** 5 min par deploy (git push → auto-deploy)

---

**Next:** Une fois ce plan approuvé, procéder à:
1. Créer accounts Neon + Render + Vercel
2. Générer secrets
3. Déployer staging
4. Valider flow complet
5. Puis production deployment

