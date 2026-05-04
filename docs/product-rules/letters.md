# Règles produit — Lettres

## 1. Principe général

Les lettres sont le **mode principal de communication** entre deux utilisateurs.

Objectifs :

- ralentir les échanges
- créer de la qualité
- éviter le chat instantané vide

Les lettres sont :

- privées
- alternées
- accessibles uniquement après validation du jeu des 3 questions

---

## 2. Conditions d'accès

Un utilisateur peut écrire une lettre uniquement si :

- `match.status = ACTIVE`
- `questionsValidated = true`
- `canSend = true` (calculé et fourni par le backend)

Le frontend ne recalcule pas cette logique — il fait confiance au backend.

---

## 3. Alternance obligatoire

Les lettres sont **strictement alternées**.

```
A envoie → A bloqué
B répond → B bloqué
A peut répondre → etc.
```

Règle UX :

- afficher clairement :
  - `"📬  C'est votre tour — répondez à la lettre reçue"`
  - `"⏳  Lettre envoyée — en attente de réponse"`

---

## 4. Tour d'écriture

Le champ `canSend` (backend → MatchDTO) indique si l'utilisateur courant peut écrire.  
Un utilisateur ne peut écrire que si `canSend = true`.

Le frontend n'a pas besoin d'un `nextTurnUserId` explicite — `canSend` est l'équivalent calculé côté backend.

### Raisons `canSendReason` retournées par le backend

| Valeur | Signification |
|---|---|
| `null` | Peut écrire |
| `MATCH_NOT_ACTIVE` | Match pas encore actif |
| `QUESTIONS_NOT_VALIDATED` | Jeu des 3 questions non complété |
| `AWAITING_REPLY` | En attente de la réponse de l'autre (inclut le cas "non-initiateur attend la première lettre") |
| `GHOST_WINDOW_CLOSED` | Fenêtre de relance fantôme expirée |

---

## 5. Première lettre

Après validation des questions, un utilisateur peut écrire la première lettre si `canSend = true`.

Afficher : **"🖊 Tu peux écrire la première lettre"**

Si `canSend = false` (l'autre écrit en premier) : **"L'autre doit envoyer la première lettre. Tu pourras répondre ensuite."**

---

## 6. Nouvelle lettre reçue

Une "nouvelle lettre" existe uniquement si :

- le dernier message du thread vient de l'autre utilisateur
- ce message n'a pas encore été lu (`readAt === null`)

Détection côté frontend :

```ts
conv.filter(l => l.toUserId === currentUser.id && !l.readAt).length > 0
```

---

## 7. Boîte aux lettres (liste)

Chaque match apparaît sous forme d'une **enveloppe**.

### États de l'enveloppe

#### 1. Lettre reçue non lue

- enveloppe fermée
- **petite animation : vibration légère** (±3px translateX, toutes les ~4 secondes)
- bordure ambrée avec glow orange
- objectif : signal "tu as reçu une nouvelle lettre"

#### 2. Lettre lue / en attente de réponse

- enveloppe stable
- pas d'animation

#### 3. À mon tour

- indicateur visible dans le turnBanner :
  `"📬  C'est votre tour — répondez à la lettre reçue"`

---

## 8. Animation d'ouverture (signature produit)

### Déclenchement

La grande animation `PremiumLetterAnimation` (~4 secondes, enveloppe s'ouvre, lettre monte, sceau) se déclenche **uniquement** si :

- l'utilisateur tape sur une conversation
- ET cette conversation contient au moins une lettre reçue non lue

### Comportement

- animation d'ouverture complète (~4200ms)
- puis affichage de la conversation

### Après lecture (~5100ms)

- marquer la lettre comme lue via `PATCH /letters/:id/read`
- supprimer la vibration dans la liste
- **ne jamais rejouer cette animation pour cette lettre**

---

## 9. Ouverture sans nouvelle lettre

Si l'utilisateur ouvre une conversation sans lettre reçue non lue :

- pas de grande animation
- affichage direct de la conversation

---

## 10. Envoi d'une lettre

Quand j'envoie une lettre :

- aucune animation pour moi
- verrouillage immédiat (`canSend` passe à `false`)
- message affiché instantanément dans la conversation

Effet côté autre utilisateur :

- verra l'enveloppe vibrer à sa prochaine ouverture de la boîte aux lettres

---

## 11. Conversation

### Format

- messages type "lettre" : carte crème avec bordure, texte en italique
- **pas de chat instantané, pas de bulles type Messenger**
- chaque lettre affiche son auteur en en-tête (`"Ta lettre"` / `"Lettre de Prénom"`)

### Ton attendu de l'utilisateur

- plus long
- plus posé
- plus personnel

---

## 12. Cas vide (aucune lettre)

Si aucun message n'existe encore :

- pas d'animation à l'ouverture
- enveloppe neutre dans la liste (pas de vibration)
- si `canSend = true` → afficher : **"🖊 Tu peux écrire la première lettre"**
- si `canSend = false` → afficher : **"L'autre doit envoyer la première lettre. Tu pourras répondre ensuite."**

---

## 13. États nécessaires (backend → frontend)

Le frontend doit connaître pour chaque match / lettre :

| Champ | Source | Correspondance implémentation |
|---|---|---|
| `canSend` | `MatchDTO` | Autorisation d'écrire (remplace `nextTurnUserId` et `canWriteLetters`) |
| `canSendReason` | `MatchDTO` | Message d'explication à l'utilisateur |
| `initiatorId` | `MatchDTO` | Qui écrit en premier |
| `questionsValidated` | `MatchDTO` | Accès aux lettres débloqué |
| `status` | `MatchDTO` | État du match (ACTIVE requis) |
| `lastLetterBy` | `MatchDTO` | Dernier expéditeur (≈ `lastMessageSenderId`) |
| `readAt` | `LetterDTO` | Détection lettre non lue |
| `toUserId` | `LetterDTO` | Destinataire de la lettre |

> `threadId` n'est pas nécessaire en tant que champ séparé : `match.id` sert d'identifiant de thread.  
> `lastMessageReadByCurrentUser` est déduit via `readAt` sur chaque `LetterDTO`.

---

## 14. Règles strictes

Interdictions :

- pas de double message
- pas de spam
- pas de messages consécutifs du même utilisateur
- pas de chat instantané

Ces règles sont garanties par l'alternance forcée (`canSend` calculé par le backend).

---

## 15. Flow global

```
Match validé (questionsValidated = true)
→ Lettres débloquées
→ Échanges alternés
→ Progression relationnelle (compteur lettres, niveaux)
→ Déblocage photos
```

---

## 16. Objectif produit

Créer :

- attente
- tension positive
- engagement émotionnel

Les lettres doivent donner envie de :

- réfléchir
- écrire
- répondre

---

## 17. Règle fondamentale

Les lettres ne sont pas un chat.

Ce sont des **messages intentionnels**.

---

## 18. Règle UX critique

Une animation ne doit jamais être décorative.

Chaque animation doit correspondre à un état réel :

- nouvelle lettre → vibration de l'enveloppe
- ouverture d'une lettre non lue → grande animation d'enveloppe
- après lecture → disparition de l'animation
