# Règles produit — Sourire / Grimace / Match

## 1. Principe général

Le système "Sourire / Grimace" remplace le swipe classique.

Objectif :

- exprimer un intérêt basé sur le **profil (bio + questions)**, pas uniquement sur le visuel
- créer une interaction avant le match
- éviter le matching instantané superficiel

---

## 2. Sourire 😄

### Définition

Un "Sourire" signifie :
→ "Ton profil m'intéresse, j'ai envie d'en savoir plus"

---

### Action

Quand un utilisateur A sourit à B :

```
POST /discover/react
{ toId: B, type: "SMILE" }
```

> Implémentation : le champ s'appelle `toId` (et non `targetUserId`) ; `type` (et non `reaction`).

---

### Effets

Si B n'a pas encore réagi :

- stocker le sourire (upsert idempotent)
- aucune notification obligatoire (à décider plus tard)
- A ne peut pas envoyer un deuxième sourire

---

### Cas de sourire mutuel

Si A sourit à B et B sourit à A :

→ **MATCH IMMÉDIAT**

---

## 3. Match

### Création

Un match est créé automatiquement si sourire mutuel.

État initial :

- `status: ACTIVE`
- `questionsValidated: false`
- `canSend: false` (lettres bloquées jusqu'à validation des questions)

> Implémentation : le champ est `canSend` (et non `canWriteLetters`).

---

### Comportement

Après match :

- les deux utilisateurs voient le match dans "Lettres"
- accès au **jeu des 3 questions**
- pas d'accès direct aux lettres

---

## 4. Grimace 😬

### Définition

Une grimace signifie :
→ "Ton profil ne me correspond pas"

---

### Action

```
POST /discover/react
{ toId: B, type: "GRIMACE" }
```

> Implémentation : le type est `"GRIMACE"` (et non `"PASS"`).

---

### Effets

- B disparaît de la découverte pour A
- aucune notification envoyée
- interaction silencieuse

---

### Re-match possible

Option produit — à décider :

- permettre de revoir un profil après X heures
  OU
- ne jamais le revoir

> En l'état : les profils grimacés sont filtrés pour la session courante (store local). Pas de règle backend de réapparition.

---

## 5. Conditions pour pouvoir sourire

Un utilisateur ne peut sourire que si son profil est complet (`canMatch = true`) :

- bio ≥ 50 mots
- 3 questions remplies
- centres d'intérêt remplis
- 3 compétences remplies

Sinon :

- bouton Sourire **visuellement désactivé** (grisé, icône 🔒)
- au tap : Alert avec message selon le champ manquant

---

## 6. UX découverte

Sur chaque profil :

- bouton 😄 / 🔒 **SOURIRE** (désactivé si profil incomplet)
- bouton 😬 **PASSER**

Contraintes :

- action immédiate
- feedback visuel instantané
- profil suivant affiché automatiquement

---

## 7. États à gérer

Pour chaque profil affiché :

| Champ | Description |
|---|---|
| `alreadyReacted` | déduit — profils réagis filtrés de la liste |
| `reactionType` | `SMILE` / `GRIMACE` / `null` |

---

## 8. Données backend nécessaires

| Donnée | Implémentation |
|---|---|
| `reactions table` | modèle `Reaction` Prisma ✓ |
| `matchId` | retourné dans `ReactionDTO.matchId` ✓ |
| `matchCreated (boolean)` | retourné dans `ReactionDTO.matchCreated` ✓ |
| `hasMutualSmile (boolean)` | déduit : `matchCreated = true` → sourire mutuel ✓ |

---

## 9. Règles importantes

- pas de match sans interaction mutuelle
- pas de "like automatique"
- pas de swipe rapide sans lire
- pas de visibilité publique des likes

---

## 10. Objectif produit

Créer :

- une sélection basée sur la personnalité
- une attente avant le match
- une progression relationnelle logique :

```
Découverte → Sourire → Match → Questions → Lettres → Photo
```

Pas :

```
Swipe → Match → Chat direct
```

---

## 11. Interactions interdites

- pas de compteur de likes visibles
- pas de "boost"
- pas de swipe infini ultra-rapide
- pas de match sans lecture profil

---

## Résumé

Le "Sourire" est un **engagement léger mais réfléchi**,
pas un simple clic automatique.
