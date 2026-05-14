# 🚀 Setup Backend JeuTaime en Local

Ce guide explique comment démarrer le backend JeuTaime en développement local pour tester les features (auth, profils, lettres, matches, etc.).

---

## 📋 Prérequis

- **Node.js** ≥ 20.0.0 (vérifier: `node --version`)
- **PostgreSQL** ≥ 12 (installé et en cours d'exécution)
- **npm** ou **yarn**

---

## 🔧 Configuration (5 minutes)

### Étape 1: Créer le fichier `.env`

```bash
cp .env.example .env
```

Puis éditer `/backend/.env` et remplir les valeurs:

```env
# --- Serveur ---
NODE_ENV=development
PORT=3000
API_PREFIX=/api

# --- Base de données PostgreSQL ---
# Format: postgresql://username:password@host:port/database
# Exemple local:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jeutaime_dev"

# --- JWT Secrets (générer des clés aléatoires ≥ 32 chars) ---
# ⚠️  IMPORTANT: Ne jamais commiter ces secrets!
# Générer avec: openssl rand -base64 32
JWT_ACCESS_SECRET=your_random_32chars_access_secret_here_generate_with_openssl
JWT_REFRESH_SECRET=your_random_32chars_refresh_secret_here_generate_with_openssl
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# --- Bcrypt (nombre de rounds, 10-15 recommandé) ---
BCRYPT_ROUNDS=12

# --- CORS (origines frontend autorisées) ---
# Pour développement local:
CORS_ORIGINS=http://localhost:8081,http://localhost:3000,http://192.168.0.40:8081

# --- Uploads (dossier pour photos) ---
UPLOAD_DIR=./storage/photos
MAX_FILE_SIZE_MB=5

# --- Rate Limiting ---
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_LETTERS_MAX=20
RATE_LIMIT_LETTERS_WINDOW_MS=3600000
RATE_LIMIT_REPORTS_MAX=5
RATE_LIMIT_REPORTS_WINDOW_MS=3600000
RATE_LIMIT_PHOTO_UPLOAD_MAX=10
RATE_LIMIT_PHOTO_UPLOAD_WINDOW_MS=3600000

# --- Logs ---
LOG_LEVEL=info
```

---

### Étape 2: Vérifier PostgreSQL

```bash
# Vérifier que PostgreSQL écoute sur localhost:5432
psql -U postgres -h localhost -c "SELECT version();"

# Créer la base de données (si nécessaire)
createdb -U postgres -h localhost jeutaime_dev

# Vérifier la connexion avec la DATABASE_URL
psql "postgresql://postgres:postgres@localhost:5432/jeutaime_dev" -c "\dt"
# (Devrait être vide la première fois)
```

---

### Étape 3: Générer les Secrets JWT

```bash
# Générer 2 secrets aléatoires de 32+ caractères
openssl rand -base64 32
openssl rand -base64 32

# Copier les 2 résultats dans le .env:
# JWT_ACCESS_SECRET=<1er résultat>
# JWT_REFRESH_SECRET=<2e résultat>
```

---

### Étape 4: Installer les dépendances

```bash
cd backend

npm install
# ou
yarn install
```

---

### Étape 5: Générer Prisma Client

```bash
npm run prisma:generate
# ou
npx prisma generate
```

---

### Étape 6: Créer le schéma et migrations

**Option A: Développement (recommandé)**
```bash
npm run prisma:migrate:dev
# Cela va:
# 1. Créer les tables dans PostgreSQL
# 2. Générer les migrations locales
# À la question "Name of migration?", entrer par exemple: "init"
```

**Option B: Production/Render (si migrations existent déjà)**
```bash
npm run prisma:migrate
# Déploie les migrations existantes
```

**Option C: Rapide (sans migration tracking)**
```bash
npx prisma db push
# Synchronise le schéma sans créer de fichiers migration
```

---

### Étape 7: Lancer le backend

```bash
npm run dev
```

Vous devriez voir:
```
🚀 JeuTaime API démarrée
  port: 3000
  env: development
  prefix: /api
  host: 0.0.0.0
```

---

## ✅ Tester le backend

### Test 1: Vérifier que le serveur écoute

```bash
curl http://localhost:3000/api/health
# Réponse attendue: {"status":"ok"}
```

### Test 2: Créer un compte

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "pseudo": "testuser",
    "birthDate": "1990-01-01",
    "gender": "HOMME",
    "city": "Paris"
  }'

# Réponse attendue:
# {
#   "data": {
#     "accessToken": "eyJ...",
#     "refreshToken": "eyJ..."
#   }
# }
```

### Test 3: Récupérer le profil avec le token

```bash
TOKEN="<accessToken from test 2>"

curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/api/profiles/me
```

---

## 📚 Scripts utiles

```bash
# Développement avec hot-reload
npm run dev

# Compiler TypeScript
npm build

# Lancer la version compilée
npm start

# Générer Prisma Client
npm run prisma:generate

# Créer une migration (dev)
npm run prisma:migrate:dev

# Déployer les migrations
npm run prisma:migrate

# Ouvrir Prisma Studio (interface DB GUI)
npm run prisma:studio

# Linter
npm run lint
npm run lint:fix

# Tester
npm test
npm run test:watch

# Vérifier les types TypeScript
npm run typecheck
```

---

## 🔄 Script de setup rapide (npm run setup:local)

Pour simplifier le setup, vous pouvez ajouter à `package.json`:

```json
"setup:local": "prisma generate && prisma db push"
```

Puis:
```bash
npm run setup:local
```

---

## 🐛 Troubleshooting

### Erreur: `DATABASE_URL est requis`
→ Vérifier que le fichier `.env` existe et contient `DATABASE_URL`

### Erreur: `ECONNREFUSED` (PostgreSQL)
→ Vérifier que PostgreSQL est en cours d'exécution
```bash
# macOS (Homebrew)
brew services start postgresql

# Linux (systemd)
sudo systemctl start postgresql

# Windows (Services)
# Démarrer PostgreSQL depuis les Services Windows
```

### Erreur: `JWT_ACCESS_SECRET is too short`
→ Utiliser `openssl rand -base64 32` pour générer des secrets ≥ 32 chars

### Erreur: `CORS: origin not allowed`
→ Ajouter l'URL frontend à `CORS_ORIGINS` dans `.env`
→ Format: `http://ip:port` (virgule-séparé pour plusieurs)

### Erreur: `column "..." does not exist`
→ Lancer les migrations: `npm run prisma:migrate:dev`

### Port 3000 déjà utilisé
→ Changer le PORT dans `.env` ou tuer le processus existant:
```bash
lsof -i :3000  # Voir quel process utilise le port
kill -9 <PID>  # Tuer le process
```

---

## 📝 Notes de développement

- **Hot-reload**: `npm run dev` recharge automatiquement les changements
- **Logs**: Vérifier `LOG_LEVEL` dans `.env` (info, debug, trace pour plus de détails)
- **Prisma Studio**: `npm run prisma:studio` ouvre une UI pour explorer la DB
- **Migrations**: Toujours commiter les fichiers dans `prisma/migrations/`
- **Secrets**: Jamais commiter le `.env` réel - utiliser `.env.example`

---

## 🚀 Prêt à tester

Une fois le backend lancé sur `http://localhost:3000/api`:
1. L'auth fonctionne (register, login, refresh)
2. Les profils se chargent et se mettent à jour
3. Les matches et lettres s'échangent
4. Les notifications arrivent

Vérifier les URLs dans le frontend:
```
Frontend .env: EXPO_PUBLIC_API_URL=http://192.168.0.40:3000/api
Backend .env: CORS_ORIGINS=...http://192.168.0.40:8081...
```

---

**Besoin d'aide?** Vérifier:
- Les logs du backend (`npm run dev`)
- La réponse du curl: `curl -v http://localhost:3000/api/health`
- Les erreurs de migration Prisma: `npx prisma db push --skip-generate`
