# Déploiement Staging - Plan d'Exécution

**Date**: 2026-05-15  
**Objectif**: Déployer JeuTaime 2.0 staging privé pour valider photo reveal  
**Base**: main (PR #64 mergée + PR #65 prête)  
**Scope**: Backend (Render) + Frontend (Vercel) + Database (Neon)

---

## 1. Préparation Pré-Déploiement

### Secrets à Générer

```bash
# Générer 2 secrets JWT (32 bytes base64)
JWT_ACCESS_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

echo "JWT_ACCESS_SECRET: $JWT_ACCESS_SECRET"
echo "JWT_REFRESH_SECRET: $JWT_REFRESH_SECRET"

# À sauvegarder de manière sécurisée
```

### Variables d'Environnement Backend (Render)

```
# Core
NODE_ENV=staging
PORT=3000
API_PREFIX=/api

# Database (sera rempli par Neon)
DATABASE_URL=[À_REMPLIR_DEPUIS_NEON]

# JWT Secrets (générés ci-dessus)
JWT_ACCESS_SECRET=[GÉNÉRÉ]
JWT_REFRESH_SECRET=[GÉNÉRÉ]
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Crypto
BCRYPT_ROUNDS=12

# CORS (Frontend staging + localhost dev)
CORS_ORIGINS=https://jeutaime-staging.vercel.app,https://jeutaime2-0.vercel.app,http://localhost:8081,http://localhost:3000

# Upload
UPLOAD_DIR=./storage/photos
MAX_FILE_SIZE_MB=5

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
RATE_LIMIT_AUTH_MAX=20
RATE_LIMIT_LETTERS_MAX=20
RATE_LIMIT_LETTERS_WINDOW_MS=3600000
RATE_LIMIT_REPORTS_MAX=5
RATE_LIMIT_REPORTS_WINDOW_MS=3600000
RATE_LIMIT_PHOTO_UPLOAD_MAX=10
RATE_LIMIT_PHOTO_UPLOAD_WINDOW_MS=3600000

# Logging
LOG_LEVEL=info
ENABLE_SCHEDULER=true
SCHEDULER_INTERVAL_MS=300000
REFRESH_TOKEN_PURGE_GRACE_MS=3600000
```

### Variables d'Environnement Frontend (Vercel)

```
EXPO_PUBLIC_API_URL=https://jeutaime-staging-api.render.com/api
```

---

## 2. Étapes de Déploiement

### Étape 1: Neon Database (10 min)

**Objectif**: Créer une base PostgreSQL managée

```bash
# 1. Créer account Neon
#    https://console.neon.tech/signup
#    Email: [votre email]
#    Password: [fort]

# 2. Créer project
#    → Create Project
#    → Nom: "JeuTaime Staging"
#    → Region: Europe (Frankfurt ou Paris) - RGPD
#    → Plan: Free Tier

# 3. Créer database
#    → Databases → Create database
#    → Nom: jeutaime_staging
#    → Owner: neon_owner (default)

# 4. Récupérer CONNECTION_STRING
#    Depuis Neon console:
#    → Connection Details
#    → Prisma format
#    Format: postgresql://user:password@host:5432/jeutaime_staging?sslmode=require

# 5. Tester connexion local (optionnel)
psql "[CONNECTION_STRING]" -c "SELECT version();"
# Expected: PostgreSQL 16.x...
```

**Sortie attendue**: 
- Connection String: `postgresql://...`
- Status: ✅ Actif et accessible

---

### Étape 2: Render Backend (15 min)

**Objectif**: Déployer API backend

```bash
# 1. Créer account Render
#    https://render.com/auth/signup
#    Email: [votre email]
#    GitHub: Connecter Warren573/Jeutaime2.0

# 2. Créer Web Service
#    → Dashboard → New+ → Web Service
#    → Select Repository: Warren573/Jeutaime2.0
#    → Branch: main ✓

# 3. Configurer service
#    Name: jeutaime-staging-api
#    
#    Build Command:
#    npm install && npm run build
#    
#    Start Command:
#    npx prisma migrate deploy && node dist/server.js
#    
#    Environment: Node 22.x
#    Region: Frankfurt (EU)
#    Tier: Free (ou Starter si timeout)

# 4. Ajouter Environment Variables
#    (Copier depuis section 1 ci-dessus)
#    - NODE_ENV: staging
#    - DATABASE_URL: [DEPUIS_NEON]
#    - JWT_ACCESS_SECRET: [GÉNÉRÉ]
#    - JWT_REFRESH_SECRET: [GÉNÉRÉ]
#    - Tous les RATE_LIMIT_*
#    - CORS_ORIGINS
#    - etc.

# 5. Déclencher deploy
#    → Create Web Service
#    Watch logs (takes ~10-15 min)
#    Attendre: "Build succeeded" + "Service is live"

# 6. Récupérer URL
#    Depuis Render dashboard:
#    Format: https://jeutaime-staging-api.render.com
```

**Tests de santé**:
```bash
# Health check
curl https://jeutaime-staging-api.render.com/api/health
# Expected: { "status": "ok", "service": "jeutaime-api" }

# DB check
curl https://jeutaime-staging-api.render.com/api/health/db
# Expected: { "status": "ok", "db": "connected" }
```

---

### Étape 3: Vercel Frontend (10 min)

**Objectif**: Déployer application frontend

```bash
# 1. Créer/Utiliser account Vercel
#    https://vercel.com/signup ou login

# 2. Importer repository
#    → Dashboard → Add New → Project
#    → Import Git Repository
#    → Select: Warren573/Jeutaime2.0
#    → Root Directory: frontend/
#    → Framework: Other

# 3. Configurer build
#    Build Command: npx expo export -p web
#    Output Directory: dist
#    Install Command: npm install

# 4. Ajouter Environment Variable
#    EXPO_PUBLIC_API_URL: https://jeutaime-staging-api.render.com/api

# 5. Déclencher deploy
#    → Deploy
#    Attendre ~5-10 min
#    Status: Ready

# 6. Récupérer URL
#    Format: https://jeutaime2-0.vercel.app (ou custom)
#    Ou: https://jeutaime-staging.vercel.app (si domaine configuré)
```

**Test**:
```bash
# Frontend accessible?
curl https://jeutaime2-0.vercel.app
# Expected: HTML document (200 OK)

# API requests redirected correctly?
# Open browser console et checker Network tab
# XHR requests vers https://jeutaime-staging-api.render.com/api
```

---

## 3. URLs Finales Staging

```
Backend API:     https://jeutaime-staging-api.render.com/api
Frontend Web:    https://jeutaime2-0.vercel.app
Health Check:    https://jeutaime-staging-api.render.com/api/health
Database Check:  https://jeutaime-staging-api.render.com/api/health/db

Dashboards:
Render:  https://render.com/dashboard
Vercel:  https://vercel.com/dashboard
Neon:    https://console.neon.tech
```

---

## 4. Test Post-Déploiement

### Phase 1: Smoke Tests (API)

```bash
# 1. Health
curl https://jeutaime-staging-api.render.com/api/health

# 2. Register User A
curl -X POST https://jeutaime-staging-api.render.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tester1@staging.test",
    "password": "TestPass123!",
    "pseudo": "TesterA"
  }'
# Expected: { "data": { "userId": "...", "accessToken": "..." } }

# 3. Complete profile (User A)
# TOKEN=[accessToken_from_step_2]
curl -X PATCH https://jeutaime-staging-api.render.com/api/profiles/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pseudo": "TesterA",
    "gender": "HOMME",
    "city": "Paris",
    "bio": "Staging test"
  }'

# 4. Setup questions (User A)
curl -X PUT https://jeutaime-staging-api.render.com/api/profiles/me/questions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      {
        "questionId": "q1",
        "answer": "Answer 1",
        "wrongAnswers": ["Wrong 1", "Wrong 2"]
      },
      {
        "questionId": "q2",
        "answer": "Answer 2",
        "wrongAnswers": ["Wrong 1", "Wrong 2"]
      },
      {
        "questionId": "q3",
        "answer": "Answer 3",
        "wrongAnswers": ["Wrong 1", "Wrong 2"]
      }
    ]
  }'

# 5. Repeat User B registration + profile + questions
# [Script same as User A but different email/pseudo]

# 6. Create match (User A smile → User B)
# Use IDs from registration and discovery endpoints
```

### Phase 2: Photo Reveal Tests

**Concept**: Tester tous les niveaux 0-3

```bash
# Setup: 2 users en match avec N lettres

# Level 0 (0-2 lettres - FREE)
# Level 1 (3-5 lettres - FREE, ou 1 lettre - PREMIUM)
# Level 2 (6-9 lettres - FREE, ou 2 lettres - PREMIUM)
# Level 3 (10+ lettres - FREE, ou 3+ lettres - PREMIUM)

# 1. Fetch match details (get photoUnlock metadata)
curl https://jeutaime-staging-api.render.com/api/matches/$matchId \
  -H "Authorization: Bearer $TOKEN"
# Check response: { "photoUnlock": { "level": 0, "totalLetters": 0, ... } }

# 2. Send letters progressively
# For each letter count, check photoUnlock.level

# 3. Test photo visibility endpoint
curl https://jeutaime-staging-api.render.com/api/photos/user/$userId \
  -H "Authorization: Bearer $TOKEN"
# Check: { "data": [...photos], "meta": { "level": X } }

# 4. Test photo variants
# GET /api/photos/file/:photoId/:variant
# variant: "original", "medium", "blurred"
# Verify correct file served based on level
```

### Phase 3: Full Flow Test

```bash
# Open browser: https://jeutaime2-0.vercel.app

# 1. Register User A
# 2. Complete profile
# 3. Add photos (test upload)
# 4. Add 3 questions
# 5. Discovery → find User B
# 6. Send smile
# 7. [User B] Accept match
# 8. Play questions game
# 9. Send/receive letters
# 10. Observe photo reveal progression

# Expected: All steps succeed, no console errors
```

---

## 5. Validation Checklist

- [ ] Neon database créée et accessible
- [ ] Render backend déployé (logs verts)
- [ ] Vercel frontend déployé (prêt)
- [ ] /api/health répond 200 OK
- [ ] /api/health/db répond 200 OK
- [ ] Auth register/login fonctionne
- [ ] Profile update fonctionne
- [ ] Questions setup fonctionne
- [ ] Match creation fonctionne
- [ ] Photo upload fonctionne
- [ ] Photo levels 0-3 fonctionnent
- [ ] Photo variants (blurred/medium/original) servis correctement
- [ ] Frontend accède backend sans erreur CORS
- [ ] Aucune donnée production ne se trouve en staging

---

## 6. Troubleshooting Rapide

| Issue | Symptôme | Fix |
|-------|----------|-----|
| **Build timeout** | Render: "Build failed after 60min" | Upgrade to Starter, ou optimize build |
| **Database connection fail** | "FATAL: password authentication failed" | Vérifier CONNECTION_STRING, whitelist IP |
| **CORS error** | Frontend: "Access-Control-Allow-Origin missing" | Vérifier CORS_ORIGINS contient frontend URL |
| **Migration fail** | "Migration not found" | Vérifier npx prisma migrate deploy exécuté |
| **Frontend blank page** | https://jeutaime2-0.vercel.app = white | Checker browser console, vérifier EXPO_PUBLIC_API_URL |
| **Photos not loading** | /api/photos retourne 404 | Vérifier UPLOAD_DIR existe, permissions correctes |

---

## 7. Prochaines Étapes

### Immédiat
1. ✅ Préparer secrets
2. ✅ Créer Neon database
3. ✅ Déployer Render backend
4. ✅ Déployer Vercel frontend
5. ✅ Tester health + core flow
6. ✅ Valider photo reveal 0-3

### Si OK
- Produire STAGING_VALIDATION_REPORT.md
- Documenter URLs finales
- Accès pour testing

### Après Validation
- Merger PR #65 frontend
- Préparer production deployment
- Documenter lessons learned

---

**Status**: Prêt à exécuter  
**Durée estimée**: 2 heures (première fois)  
**Coût**: $0 (free tiers)
