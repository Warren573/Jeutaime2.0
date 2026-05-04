# Règles produit — Sourire / Grimace / Match

## 1. Principe général

Le système "Sourire / Grimace" remplace le swipe classique.

Objectifs :

- exprimer un intérêt basé sur le **profil (bio + questions)**, pas uniquement sur le visuel
- créer une interaction réfléchie avant le match
- éviter le matching instantané superficiel

Flow global :

```
Découverte → Sourire → Match → Questions → Lettres → Photo
```

Pas :

```
Swipe → Match → Chat direct
```

---

## 2. Sourire 😄

### Définition

Un "Sourire" signifie :
→ "Ton profil m'intéresse, j'ai envie d'en savoir plus"

### Action

```
POST /discover/react
{ toId: B, type: "SMILE" }
```

### Effets

Si B n'a pas encore réagi :

- stocker le sourire (upsert en base)
- pas de notification immédiate
- A ne peut pas envoyer un deuxième sourire (upsert idempotent)

### Sourire mutuel → Match immédiat

Si A sourit à B et B sourit à A :

→ **match créé automatiquement** (`matchCreated: true`, `matchId` retourné)
→ les deux voient le match dans "Lettres"
→ accès au jeu des 3 questions
→ pas d'accès direct aux lettres

---

## 3. Match

### Création

Automatique au sourire mutuel.

État initial :

- `status: ACTIVE`
- `questionsValidated: false`
- `canSend: false` (lettres bloquées jusqu'à validation des questions)

### Vérifications avant création

Le backend vérifie avant de créer le match :

- pas de blocage existant entre les deux utilisateurs
- limite de matchs actifs non atteinte (différente selon premium / non-premium)

---

## 4. Grimace 😬

### Définition

Une grimace signifie :
→ "Ton profil ne me correspond pas"

### Action

```
POST /discover/react
{ toId: B, type: "GRIMACE" }
```

### Effets

- B disparaît de la découverte pour A (profil filtré de la liste)
- aucune notification envoyée à B
- interaction silencieuse

> Note : le backend utilise `"GRIMACE"` (et non `"PASS"`).

---

## 5. Conditions pour pouvoir sourire

Un utilisateur peut sourire uniquement si son profil est complet (`canMatch = true`) :

- bio ≥ 50 mots
- 3 questions remplies
- centres d'intérêt remplis
- 3 compétences remplies

### UX

Si `canMatch = false` :

- le bouton Sourire est **visuellement désactivé** (grisé, icône 🔒)
- au tap : Alert explicatif selon le champ manquant
  - questions manquantes → `"Ajoute tes 3 questions pour pouvoir matcher."`
  - sinon → `"Complète ton profil (bio 50 mots minimum) pour pouvoir matcher."`

Le champ `canMatch` est calculé par le backend et exposé dans le profil utilisateur (`profileStatus.canMatch`).

---

## 6. UX découverte

Sur chaque profil affiché :

- bouton 😄 / 🔒 **SOURIRE** (grisé si `canMatch = false`)
- bouton 😬 **PASSER** (toujours actif)
- bouton 🎁 **CADEAU** (non actif pour l'instant)

Contraintes UX :

- action immédiate
- feedback visuel instantané
- profil suivant affiché automatiquement
- format "journal papier" pour encourager la lecture du profil avant d'agir

### Match overlay

En cas de match (`matchCreated = true`) :

- plein écran rouge avec `"💕 C'EST UN MATCH !"` pendant ~2,5 secondes
- rechargement des matches via `loadMatches()`

---

## 7. États à gérer par profil

| Champ | Source | Usage |
|---|---|---|
| `alreadyReacted` | déduit (profil filtré de la liste) | Les profils réagis ne réapparaissent pas |
| `reactionType` | déduit (`likedProfiles` / `dislikedProfiles` en store) | Sourire ou grimace passé |

> Les profils sur lesquels l'utilisateur a déjà réagi sont filtrés de la liste de découverte (`availableProfiles`). Ils ne réapparaissent pas dans la session courante.

---

## 8. Données backend

### Table `Reaction`

Champs nécessaires :

- `fromId`, `toId` (utilisateurs)
- `type` (`SMILE` | `GRIMACE`)
- contrainte unique `@@unique([fromId, toId])` — upsert possible (changer d'avis)

### Réponse `ReactionDTO`

```ts
{
  id: string;
  fromId: string;
  toId: string;
  type: "SMILE" | "GRIMACE";
  createdAt: string;
  matchCreated: boolean;
  matchId?: string;   // présent si matchCreated = true
}
```

---

## 9. Règles importantes

- pas de match sans sourire mutuel
- pas de like automatique
- pas de swipe ultra-rapide encouragé (format journal)
- pas de visibilité publique des likes reçus

---

## 10. Objectif produit

Créer :

- une sélection basée sur la personnalité
- une attente avant le match
- une progression relationnelle logique

---

## 11. Interactions interdites

- pas de compteur de likes visibles
- pas de "boost"
- pas de swipe infini ultra-rapide
- pas de match sans lecture profil

---

## Résumé

Le "Sourire" est un **engagement léger mais réfléchi**, pas un simple clic automatique.
