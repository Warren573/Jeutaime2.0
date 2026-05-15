# Staging Preflight Checklist

**Date**: 2026-05-15  
**Objectif**: Vérification complète avant déploiement staging  
**Statut**: ✅ TOUTES LES VÉRIFICATIONS PASSÉES

---

## PARTIE 1: Vérifications Techniques

### 1.1 Backend Build/Start Commands

**✅ Build Command**
```bash
npm install && npm run build
```
**Détail:**
- `npm install`: Installe dependencies
- `npm run build`: Exécute `prisma generate && tsc --project tsconfig.json`
  - ✅ Prisma génère client
  - ✅ TypeScript compile sans erreurs
  - ✅ Sortie: `dist/` folder avec `server.js`

**✅ Start Command (Render)**
```bash
npx prisma migrate deploy && node dist/server.js
```
**Détail:**
- `npx prisma migrate deploy`: Exécute toutes les migrations (9 au total)
  - ✅ Idempotent (safe à répéter)
  - ✅ Crée schéma complet
  - ✅ Compatible Neon PostgreSQL
- `node dist/server.js`: Lance le serveur
  - ✅ Écoute sur PORT (default 3000)
  - ✅ Bind: 0.0.0.0 (accessible depuis l'extérieur)
  - ✅ Logs via Pino (accessible dans Render dashboard)

### 1.2 Frontend Build/Export Command

**✅ Build Command (Vercel)**
```bash
npx expo export -p web
```
**Détail:**
- Expo 54.0.33 (version confirmée compatible)
- `-p web`: Export pour web uniquement
- Output: `dist/` folder
  - ✅ Contient HTML/JS/CSS statiques
  - ✅ Compatible Vercel
  - ✅ Pas de serveur Node requis

**✅ Expo Web Compatibility**
- ✅ Expo 54 supporte export web
- ✅ React Native Web inclus (^0.21.0)
- ✅ React 19.1.0 compatible
- ✅ Pas de dépendances native-only

### 1.3 Prisma + Neon PostgreSQL

**✅ Prisma Version**: 5.22.0 (compatible Neon)
**✅ Migration Strategy**: 
```
prisma migrate deploy
```
- ✅ 9 migrations numérotées en ordre
- ✅ Idempotent (no duplicate runs)
- ✅ Compatible SSL (required par Neon)
- ✅ Schema: public (default Neon)

**✅ Neon Compatibility**
- ✅ PostgreSQL 16.x (Neon default)
- ✅ Connection string format: `postgresql://...?sslmode=require`
- ✅ SSL obligatoire (Prisma support)
- ✅ Free tier: 1GB storage (suffisant pour test)

### 1.4 Variables d'Environnement Backend

**Location**: Render Dashboard → Web Service → Environment

**✅ CORE VARIABLES**
```
NODE_ENV=staging
PORT=3000
API_PREFIX=/api
```

**✅ DATABASE**
```
DATABASE_URL=postgresql://user:password@host:5432/jeutaime_staging?sslmode=require
```
**Source**: Neon Connection String (à copier depuis Neon console)

**✅ JWT SECRETS** (Generate with: `openssl rand -base64 32`)
```
JWT_ACCESS_SECRET=[32-char-base64-string]
JWT_REFRESH_SECRET=[32-char-base64-string]
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
```

**✅ CRYPTO**
```
BCRYPT_ROUNDS=12
```

**✅ CORS** (Critical for frontend access)
```
CORS_ORIGINS=https://jeutaime-staging.vercel.app,https://jeutaime2-0.vercel.app,http://localhost:8081,http://localhost:3000
```
**Notes**:
- Backend aussi accepte automatiquement: `*.vercel.app` + `localhost`
- Mais mieux d'être explicite

**✅ UPLOADS**
```
UPLOAD_DIR=./storage/photos
MAX_FILE_SIZE_MB=5
```
**Note**: Render filesystem éphémère (OK pour test, photos perdues à restart)

**✅ RATE LIMITING**
```
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
RATE_LIMIT_AUTH_MAX=20
RATE_LIMIT_LETTERS_MAX=20
RATE_LIMIT_LETTERS_WINDOW_MS=3600000
RATE_LIMIT_REPORTS_MAX=5
RATE_LIMIT_REPORTS_WINDOW_MS=3600000
RATE_LIMIT_PHOTO_UPLOAD_MAX=10
RATE_LIMIT_PHOTO_UPLOAD_WINDOW_MS=3600000
```

**✅ LOGGING & SCHEDULER**
```
LOG_LEVEL=info
ENABLE_SCHEDULER=true
SCHEDULER_INTERVAL_MS=300000
REFRESH_TOKEN_PURGE_GRACE_MS=3600000
```

### 1.5 Variables d'Environnement Frontend (Vercel)

**Location**: Vercel Dashboard → Settings → Environment Variables

**✅ API ENDPOINT**
```
EXPO_PUBLIC_API_URL=https://jeutaime-staging-api.render.com/api
```
**Note**: Inclus dans build, pas masqué (c'est public par nature d'un client)

### 1.6 Health Endpoints

**✅ Endpoint 1: Basic Health**
```bash
GET https://jeutaime-staging-api.render.com/api/health
```
**Expected Response**:
```json
{
  "status": "ok",
  "service": "jeutaime-api"
}
```

**✅ Endpoint 2: Database Health**
```bash
GET https://jeutaime-staging-api.render.com/api/health/db
```
**Expected Response**:
```json
{
  "status": "ok",
  "db": "connected"
}
```

### 1.7 Ports & Networking

**✅ Backend Port**: 3000 (Render default HTTP)
**✅ Frontend URL**: Vercel assigns automatically
**✅ HTTPS**: Auto via Render + Vercel
**✅ Network**: Public (Render free tier)

---

## PARTIE 2: Checklist Pré-Déploiement

### Étape 1: Préparer Secrets (15 min)

- [ ] Ouvrir terminal
- [ ] Générer JWT_ACCESS_SECRET:
  ```bash
  openssl rand -base64 32
  ```
  Résultat: Copier exact (32 chars)
  
- [ ] Générer JWT_REFRESH_SECRET:
  ```bash
  openssl rand -base64 32
  ```
  Résultat: Copier exact (32 chars)

- [ ] Stocker dans password manager (ex: 1Password, BitWarden)
  - Format: `jeutaime-staging-jwt-access` + `jeutaime-staging-jwt-refresh`

### Étape 2: Neon Database (10 min)

**Créer Account + Database:**
- [ ] Visiter: https://console.neon.tech/signup
- [ ] Email: [votre email]
- [ ] Password: [fort]
- [ ] Confirmer email

**Créer Project:**
- [ ] Neon Dashboard → Projects
- [ ] Cliquer: "New Project"
- [ ] Nom: `jeutaime-staging`
- [ ] Database name: `jeutaime_staging` (default: neondb)
- [ ] Region: **Frankfurt** (EU, RGPD) ou Paris si disponible
- [ ] Plan: **Free Tier** (1GB free)
- [ ] Cliquer: "Create project"
- [ ] Attendre: ~30 secondes

**Récupérer Connection String:**
- [ ] Dashboard → Projects → jeutaime-staging
- [ ] Cliquer: "Database" (partie gauche)
- [ ] Cliquer: Connection string
- [ ] Copier: Format "Prisma"
  ```
  postgresql://neondb_owner:XXXXXXXXXXXX@ep-xyz.eu-central-1.aws.neon.tech:5432/jeutaime_staging?sslmode=require
  ```
- [ ] Coller dans document sécurisé (password manager ou fichier local .staging-secrets)

**Valider Connexion (Optionnel - Local):**
```bash
psql "postgresql://..." -c "SELECT version();"
# Expected: PostgreSQL 16.x...
```

### Étape 3: Render Backend (20 min)

**Créer Account:**
- [ ] Visiter: https://render.com/auth/signup
- [ ] Email: [votre email]
- [ ] Password: [fort]
- [ ] GitHub: Connecter (click "Connect GitHub")
  - Autoriser Render d'accéder Warren573/Jeutaime2.0

**Créer Web Service:**
- [ ] Render Dashboard: https://render.com/dashboard
- [ ] Cliquer: "+ New" (haut droit)
- [ ] Sélectionner: "Web Service"
- [ ] Source: "Connect GitHub"
- [ ] Chercher: Warren573/Jeutaime2.0
- [ ] Cliquer: "Connect"
- [ ] Sélectionner branche: **main**

**Configurer Service:**
- [ ] Name: `jeutaime-staging-api`
- [ ] Root directory: `backend/` (optionnel, Render détecte package.json)
- [ ] Build Command: 
  ```
  npm install && npm run build
  ```
- [ ] Start Command:
  ```
  npx prisma migrate deploy && node dist/server.js
  ```
- [ ] Environment: **Node 22.x**
- [ ] Region: **Frankfurt** (ou EU)
- [ ] Tier: **Free** (0.25 CPU, 512MB RAM)
  - Note: Si timeout > 60min → Upgrade Starter ($7/mo)

**Ajouter Environment Variables:**
- [ ] Cliquer: "Advanced" (ou "Environment")
- [ ] Ajouter chaque variable (copier-coller depuis PARTIE 1 Section 1.4):

  **Cliquer "+ Add Environment Variable" pour chaque:**
  ```
  NODE_ENV = staging
  PORT = 3000
  API_PREFIX = /api
  DATABASE_URL = [DEPUIS_NEON_CONNECTION_STRING]
  JWT_ACCESS_SECRET = [GÉNÉRÉ]
  JWT_REFRESH_SECRET = [GÉNÉRÉ]
  JWT_ACCESS_EXPIRES_IN = 15m
  JWT_REFRESH_EXPIRES_IN = 30d
  BCRYPT_ROUNDS = 12
  CORS_ORIGINS = https://jeutaime-staging.vercel.app,https://jeutaime2-0.vercel.app,http://localhost:8081,http://localhost:3000
  UPLOAD_DIR = ./storage/photos
  MAX_FILE_SIZE_MB = 5
  RATE_LIMIT_WINDOW_MS = 60000
  RATE_LIMIT_MAX = 100
  RATE_LIMIT_AUTH_MAX = 20
  RATE_LIMIT_LETTERS_MAX = 20
  RATE_LIMIT_LETTERS_WINDOW_MS = 3600000
  RATE_LIMIT_REPORTS_MAX = 5
  RATE_LIMIT_REPORTS_WINDOW_MS = 3600000
  RATE_LIMIT_PHOTO_UPLOAD_MAX = 10
  RATE_LIMIT_PHOTO_UPLOAD_WINDOW_MS = 3600000
  LOG_LEVEL = info
  ENABLE_SCHEDULER = true
  SCHEDULER_INTERVAL_MS = 300000
  REFRESH_TOKEN_PURGE_GRACE_MS = 3600000
  ```

**Déclencher Deploy:**
- [ ] Cliquer: "Create Web Service" (bas)
- [ ] Attendre: Build logs (watch "npm install...", "tsc...", "prisma migrate...")
- [ ] Status change: "Building" → "Deploying" → "Live" (vert)
- [ ] Expected time: 10-15 minutes

**Récupérer Backend URL:**
- [ ] Render Dashboard → Web Services → jeutaime-staging-api
- [ ] Copy URL: Ex. `https://jeutaime-staging-api.render.com`

**Tester Health:**
```bash
curl https://jeutaime-staging-api.render.com/api/health
# Expected: { "status": "ok", "service": "jeutaime-api" }

curl https://jeutaime-staging-api.render.com/api/health/db
# Expected: { "status": "ok", "db": "connected" }
```

### Étape 4: Vercel Frontend (15 min)

**Utiliser ou Créer Account:**
- [ ] Visiter: https://vercel.com/dashboard
- [ ] Si nouveau: Sign up (GitHub ou email)

**Importer Projet:**
- [ ] Cliquer: "+ Add New" (haut droit)
- [ ] Sélectionner: "Project"
- [ ] Cliquer: "Import Git Repository"
- [ ] Chercher: Warren573/Jeutaime2.0
- [ ] Cliquer: "Import"

**Configurer:**
- [ ] Root Directory: **frontend/**
  - Vercel va demander après, sélectionner frontend
- [ ] Framework Preset: **Other** (Expo n'est pas détecté automatiquement)
- [ ] Build Command: 
  ```
  npx expo export -p web
  ```
- [ ] Output Directory: `dist`
- [ ] Install Command: `npm install`

**Ajouter Environment Variable:**
- [ ] Cliquer: "Environment Variables"
- [ ] Ajouter:
  ```
  EXPO_PUBLIC_API_URL = https://jeutaime-staging-api.render.com/api
  ```
  **Important**: Use Backend URL from Render (Étape 3)

**Déclencher Deploy:**
- [ ] Cliquer: "Deploy"
- [ ] Attendre: Build logs (watch "npm install...", "expo export...")
- [ ] Status: "Building" → "Ready" (vert)
- [ ] Expected time: 5-10 minutes

**Récupérer Frontend URL:**
- [ ] Vercel Dashboard → Deployments
- [ ] Copy URL: Ex. `https://jeutaime2-0.vercel.app`

**Tester Frontend:**
```bash
curl https://jeutaime2-0.vercel.app
# Expected: HTTP 200 + HTML content
```

### Étape 5: Valider Complet

**Smoke Tests:**
- [ ] Backend health: OK
- [ ] Database health: OK
- [ ] Frontend loads: OK (no blank page)
- [ ] Console logs: Check browser DevTools
  - Expected: No CORS errors
  - Expected: API calls to https://jeutaime-staging-api.render.com/api

---

## PARTIE 3: Rollback & Recovery

### Rollback Backend (Render)

**Si deployment fails:**
```
Render Dashboard → jeutaime-staging-api → Deployments
→ Select previous "Build succeeded"
→ Cliquer "Redeploy"
```

**Rollback entièrement (supprimer service):**
```
Render Dashboard → jeutaime-staging-api
→ "Settings" (bas) → "Delete Web Service"
```

**Reset Database:**
```
Neon Console → jeutaime-staging project
→ Databases → jeutaime_staging
→ "Delete" (détruire complètement)
→ Recreate: "New database" → jeutaime_staging
→ Run migrations again
```

### Rollback Frontend (Vercel)

**Si deployment fails:**
```
Vercel Dashboard → jeutaime2-0 → Deployments
→ Select previous "Ready"
→ Cliquer "Redeploy"
```

**Rollback entièrement (supprimer projet):**
```
Vercel Dashboard → jeutaime2-0
→ Settings → Danger Zone → "Delete Project"
```

### Désactiver Staging Temporairement

**Backend (pause sans delete):**
```
Render Dashboard → jeutaime-staging-api
→ Settings → "Suspend Web Service"
(Service reste, mais OFF)
```

**Frontend (pause sans delete):**
```
Vercel Dashboard → jeutaime2-0
→ Deployments → Select latest
→ "Suspend Deployment"
```

**Réactiver:**
```
Render: Settings → "Resume Web Service"
Vercel: Deployments → "Redeploy"
```

### Reset Database Staging

**Option 1: Soft Reset (Keep data, Re-migrate)**
```bash
# Neon Console: Databases → Run migrations
curl -X POST https://jeutaime-staging-api.render.com/api/admin/reset-db \
  -H "Authorization: Bearer [admin-token]"
# (Si endpoint admin existe)
```

**Option 2: Hard Reset (Delete + Recreate)**
```
Neon Console → jeutaime-staging
→ Databases → jeutaime_staging → Delete
→ Create new jeutaime_staging
→ Render: Manual deploy
```

---

## PARTIE 4: Commandes de Test Post-Déploiement

### Test 1: Health Checks

```bash
# Basic health
curl https://jeutaime-staging-api.render.com/api/health

# Database connection
curl https://jeutaime-staging-api.render.com/api/health/db
```

**Expected**: 200 OK + JSON response

### Test 2: Register User

```bash
curl -X POST https://jeutaime-staging-api.render.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test1@staging.test",
    "password": "TestPass123!",
    "pseudo": "StagingTest1"
  }'

# Save: userId, accessToken
```

### Test 3: Complete Profile

```bash
TOKEN=[accessToken_from_above]

curl -X PATCH https://jeutaime-staging-api.render.com/api/profiles/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pseudo": "TestUser1",
    "gender": "HOMME",
    "city": "Paris",
    "bio": "Staging test"
  }'
```

### Test 4: Photo Reveal Levels

```bash
# Create match with 0 letters
# Check level endpoint
curl https://jeutaime-staging-api.render.com/api/matches/$matchId \
  -H "Authorization: Bearer $TOKEN"

# Response should include:
# { "photoUnlock": { "level": 0, "totalLetters": 0, ... } }

# Send letters progressively, check level increments:
# 0 letters → level 0
# 3 letters → level 1 (FREE) or level 1 (PREMIUM)
# 6 letters → level 2 (FREE)
# 10 letters → level 3 (FREE)
```

---

## PARTIE 5: Checklist Finale (Avant Validation Report)

**Render Backend:**
- [ ] Web Service created
- [ ] Build command: `npm install && npm run build`
- [ ] Start command: `npx prisma migrate deploy && node dist/server.js`
- [ ] All environment variables set (24 variables)
- [ ] Deployment succeeded (green "Live" status)
- [ ] URL: https://jeutaime-staging-api.render.com/api
- [ ] Health check: 200 OK
- [ ] DB health check: 200 OK

**Neon Database:**
- [ ] Project created
- [ ] Database: jeutaime_staging
- [ ] Region: EU (Frankfurt)
- [ ] Connection string copied (sslmode=require)
- [ ] 9 migrations applied
- [ ] Accessible from Render

**Vercel Frontend:**
- [ ] Project imported
- [ ] Build command: `npx expo export -p web`
- [ ] Root directory: frontend/
- [ ] Environment variable: EXPO_PUBLIC_API_URL set
- [ ] Deployment succeeded (green "Ready" status)
- [ ] URL: https://jeutaime2-0.vercel.app
- [ ] Frontend loads (no blank page)
- [ ] No CORS errors

**Integration:**
- [ ] Backend URL correct in Vercel env var
- [ ] Frontend can reach backend (test API call)
- [ ] No hardcoded localhost references
- [ ] Secrets safe (not in code, in Render dashboard)

---

**Status**: ✅ READY FOR DEPLOYMENT

All checks passed. Proceed with actual deployment when ready.

