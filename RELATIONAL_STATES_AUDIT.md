# Audit des États Relationnels - JeuTaime

**Objectif:** Définir clairement quoi afficher/refuser à chaque état, sans redesign ni refactor.

---

## États Possibles d'un Match

| État | Créé par | Accessible | Lettres | Découverte | Relance | Déblocage |
|------|----------|-----------|---------|-----------|---------|-----------|
| **PENDING** | Smile mutuel | OUI (questions) | ✅ Visible | ❌ Non | ❌ Non | N/A |
| **ACTIVE** | Questions validées | OUI (lettres) | ✅ Visible | ❌ Non | ❌ Non | N/A |
| **BROKEN** | Rupture volontaire | OUI (souvenir) | ❌ **CACHÉ** | ❓ Réapparaît | ✅ OUI | N/A |
| **BLOCKED** | Blocage utilisateur | NON | ❌ **CACHÉ** | ❌ Non | ❌ Non | ✅ OUI |
| **GHOSTED** | Détection auto | Limité | ✅ Visible | ❌ Non | ✅ OUI (relance) | N/A |

---

## Écrans & Responsabilités

### 1. **DISCOVERY (ProfilesScreen.tsx)**

**Rôle:** Afficher les profils disponibles

**Règles:**
- ❌ N'affiche PAS les profils avec match PENDING ou ACTIVE
- ❌ N'affiche PAS les profils avec match BLOCKED
- ✅ AFFICHE les profils avec match BROKEN (permettre re-match)
- ✅ AFFICHE les profils jamais matchés

**Filtre à appliquer:**
```
Exclure si:
  match.status === 'ACTIVE' OR match.status === 'PENDING' OR match.status === 'BLOCKED'
Inclure sinon
```

**État Actuel:** ❓ À vérifier

---

### 2. **LETTRES (LettersScreen.tsx)**

**Rôle:** Afficher les conversations en cours

**Règles:**
- ✅ AFFICHE les matches PENDING (en attente d'acceptation)
- ✅ AFFICHE les matches ACTIVE (conversation en cours)
- ❌ N'affiche PAS les matches BROKEN (disparaissent, allez aux souvenirs)
- ❌ N'affiche PAS les matches BLOCKED (disparus complètement)

**Filtre à appliquer:**
```
Afficher si:
  match.status === 'PENDING' OR match.status === 'ACTIVE'
Cacher sinon
```

**État Actuel:** ✅ CORRIGÉ (voir derniers commits)

---

### 3. **SOUVENIRS (LettersScreen.tsx - tab Souvenirs)**

**Rôle:** Archiver les relations finies (BROKEN seulement)

**Règles:**
- ✅ AFFICHE les matches BROKEN (avec possibilité de relance)
- ❌ N'affiche PAS les matches BLOCKED
- ❌ N'affiche PAS les ACTIVE/PENDING

**État Actuel:** ✅ Onglet existe (mais logique de peuplement à vérifier)

---

### 4. **STORE (useStore.ts)**

**Responsabilités:**
- loadMatches(): charger ALL matches (PENDING + ACTIVE + BROKEN + BLOCKED)
- Exposer matches pour les filtres des écrans
- Pas de filtrage au niveau du store (c'est du travail de l'écran)

**Problèmes Potentiels:**
- `if (!viewerId || data.length === 0) return;` → empêche mise à jour si liste vide?
- Status conversion (PENDING → pending) correct?
- Matches exposés au bon format?

**État Actuel:** ❓ À auditer

---

## Flux Relationnel Complet

### Scénario 1: Smile Mutuel → Match Créé

```
1. Bernard sourit Doudou
   → Backend: crée Reaction (SMILE, fromId=bernard, toId=doudou)
   → Frontend: addLike(doudou.id), setCurrentIndex++
   → Doudou disparaît de la découverte de Bernard ✅
   
2. Doudou sourit Bernard  
   → Backend: crée Reaction + détecte smile mutuel → crée Match(PENDING)
   → Frontend: loadMatches() + apiFetch('/profiles')
   → Match doit apparaître dans Lettres pour les deux ✅
   → Bernard/Doudou disparaissent de la découverte l'un de l'autre ✅
```

**Où ça casse?**
- ❓ loadMatches() charge-t-il le match?
- ❓ Match apparaît-il dans le store?
- ❓ Le filtre ProfilesScreen exclut-il correctement?
- ❓ Le filtre LettersScreen inclut-il correctement?

---

### Scénario 2: Acceptation Questions (PENDING → ACTIVE)

```
1. Match est PENDING
   → Les deux voient "Jouer aux questions" en Lettres
   
2. Un des deux accepte les questions
   → Match passe à ACTIVE
   → Les deux voient "Écrire une lettre" en Lettres
   → Peuvent commencer la correspondance
```

**État Actuel:** ✅ Backend géré (regarder handleSubmitAnswers)

---

### Scénario 3: Rupture Volontaire (ACTIVE → BROKEN)

```
1. Utilisateur clique "Rompre"
   → Backend: Match.status = BROKEN
   → Frontend: handleBreakMatch()
   
2. Immédiatement après:
   → Match disparaît de Lettres actives ✅
   → Match réapparaît dans Souvenirs ❓
   → Profil réapparaît en découverte ✅
   
3. Utilisateur peut relancer plus tard:
   → Nouveau smile sur le même profil
   → Backend: détecte match BROKEN + nouveau smile → relance
   → Match revient à PENDING
```

**État Actuel:** ❓ À vérifier

---

### Scénario 4: Blocage (ACTIVE → BLOCKED)

```
1. Utilisateur clique "Bloquer"
   → Backend: Match.status = BLOCKED
   → Frontend: handleBlockUser()
   
2. Immédiatement après:
   → Match disparaît de Lettres ✅
   → Match disparaît COMPLÈTEMENT (pas de souvenirs) ❓
   → Profil N'apparaît JAMAIS en découverte ❌ (TODO)
   → Pas de possibilité de relance (définitif)
```

**État Actuel:** ❓ À vérifier

---

## Tests à Créer (Frontend)

### Test 1: Store.loadMatches() charge les matches
```
Input: backend retourne match PENDING
Expected: store.matches contient match
Actual: ❓
```

### Test 2: ProfilesScreen filtre correctement
```
Input: matches = [PENDING, ACTIVE, BROKEN]
Expected: availableProfiles exclut PENDING et ACTIVE
Actual: ❓
```

### Test 3: LettersScreen affiche que PENDING + ACTIVE
```
Input: matches = [PENDING, ACTIVE, BROKEN, BLOCKED]
Expected: rendered = [PENDING, ACTIVE]
Actual: ❓
```

---

## Résumé: Ce Qui Est Cassé

| Composant | État | Preuve |
|-----------|------|--------|
| **Backend** | ✅ OK | Test passe |
| **Store.loadMatches** | ❓ ? | À auditer |
| **ProfilesScreen.filter** | ❓ ? | À auditer |
| **LettersScreen.render** | ✅ OK | Filtre appliqué |
| **Souvenirs.logic** | ❓ ? | À vérifier |
| **Blocage.discovery** | ❌ KO | Profil peut réapparaître |

---

## Prochaines Étapes

1. ✅ Backend test créé et passe
2. ⏳ Auditer store.loadMatches() → vérifie-t-il les matches?
3. ⏳ Auditer ProfilesScreen filter → appliqué correctement?
4. ⏳ Vérifier LettersScreen render → matches BROKEN cachés?
5. ⏳ Implémenter logique Souvenirs → matches BROKEN vont dedans?
6. ⏳ Implémenter garde blocage → profils BLOCKED jamais en découverte

---

**Règle d'Or:** 1 écran = 1 responsabilité = 1 commit
