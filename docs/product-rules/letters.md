# Règles produit — Lettres

## Principe général

Les lettres sont privées, alternées, et liées à un match validé après le jeu des 3 questions.

## Conditions d'accès

Un utilisateur peut écrire à l'autre uniquement si :

- match existe avec `status = ACTIVE`
- `questionsValidated = true`
- `canSend = true` (calculé par le backend)

Le champ `canSend` est fourni par le backend dans le DTO `MatchDTO`. Le frontend ne recalcule pas cette logique — il fait confiance au backend.

## Alternance obligatoire

- L'initiateur du match (celui qui a déclenché le sourire mutuel) écrit la première lettre.
- Si A envoie une lettre à B, A ne peut plus écrire tant que B n'a pas répondu.
- Si B répond, c'est à nouveau au tour de A.
- Le champ `canSend` reflète ce tour à tout moment.
- Le frontend affiche clairement : `"✍️ À vous d'écrire..."` ou `"⏳ En attente de réponse..."`.
- Si `canSend = false` et qu'aucune lettre n'existe encore, afficher : `"L'autre doit envoyer la première lettre. Tu pourras répondre ensuite."`

### Raisons `canSendReason` retournées par le backend

| Valeur | Signification |
|---|---|
| `null` | Peut écrire |
| `MATCH_NOT_ACTIVE` | Match pas encore actif |
| `QUESTIONS_NOT_VALIDATED` | Jeu des 3 questions non complété |
| `AWAITING_REPLY` | En attente de la réponse de l'autre (inclut le cas "non-initiateur attend la première lettre") |
| `GHOST_WINDOW_CLOSED` | Fenêtre de relance fantôme expirée |

## Nouvelle lettre reçue

Une "nouvelle lettre" existe uniquement si :

- `toUserId === currentUser.id` (la lettre m'est destinée)
- `readAt === null` (pas encore lue)

Détection côté frontend : `conv.filter(l => l.toUserId === currentUser.id && !l.readAt).length > 0`

## Petite animation dans la boîte aux lettres

Dans la liste des conversations :

- Si une conversation contient une nouvelle lettre reçue non lue → l'enveloppe vibre légèrement (tremblement ±3px translateX, répété toutes les ~4 secondes) et la bordure devient ambrée avec un glow orange
- Cette animation sert uniquement à signaler "tu as reçu une nouvelle lettre"
- Pas d'animation si le dernier message vient de moi
- Pas d'animation si la lettre a déjà été lue (`readAt !== null`)
- Pas d'animation si aucun message n'existe encore dans la conversation

## Grande animation d'ouverture

La grande animation `PremiumLetterAnimation` (enveloppe s'ouvre, lettre monte, ~4 secondes) se joue **uniquement** quand :

- l'utilisateur tape sur une conversation
- ET cette conversation contient au moins une lettre reçue non lue (`unreadLetters.length > 0`)

Après animation (~5100ms) :

- afficher la conversation
- marquer les lettres concernées comme lues via `PATCH /letters/:id/read`
- la vibration de la carte disparaît de la liste
- ne jamais rejouer l'animation pour ces mêmes lettres

## Conversation sans nouvelle lettre

Si l'utilisateur ouvre une conversation sans lettre reçue non lue :

- pas de grande animation
- afficher directement la conversation

## Accès depuis le jeu des questions (succès validé)

Quand le bouton "📬 Écrire une lettre" est tapé après la validation des questions :

- pas de grande animation (l'utilisateur va écrire, pas lire)
- ouvrir directement l'écran de composition
- le `selectedMatch` doit être rechargé depuis le store (`matches.find(m => m.id === qGameMatch.id)`) pour avoir le `canSend` à jour

## Envoi d'une lettre

Quand j'envoie une lettre :

- je ne vois pas d'animation d'ouverture
- mon enveloppe ne vibre pas dans ma liste
- l'autre utilisateur verra l'enveloppe fermée vibrante à sa prochaine ouverture de la boîte aux lettres

## Cas vide (aucun message encore)

Si aucun message n'existe dans la conversation :

- pas de vibration dans la liste
- pas de grande animation à l'ouverture
- si `canSend = true` → afficher l'invite "Commencez la conversation !"
- si `canSend = false` → afficher "L'autre doit envoyer la première lettre. Tu pourras répondre ensuite."

## Champs nécessaires dans le DTO

Le frontend doit pouvoir connaître pour chaque match :

| Champ | Source | Usage |
|---|---|---|
| `canSend` | Backend (`MatchDTO`) | Autorisation d'écrire |
| `canSendReason` | Backend (`MatchDTO`) | Message d'explication à l'utilisateur |
| `initiatorId` | Backend (`MatchDTO`) | Qui écrit en premier |
| `questionsValidated` | Backend (`MatchDTO`) | Accès aux lettres débloqué |
| `status` | Backend (`MatchDTO`) | État du match (ACTIVE requis) |
| `readAt` | Backend (`LetterDTO`) | Détection lettre non lue |
| `toUserId` | Backend (`LetterDTO`) | Destinataire de la lettre |

## Règle importante

Ne jamais utiliser une animation comme simple décoration.
Chaque animation doit correspondre à un état produit réel.
