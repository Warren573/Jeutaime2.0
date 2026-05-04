# Règles produit — Salons

## 1. Principe général

Les salons sont des **espaces sociaux thématiques**.

Objectif :

- créer du fun
- permettre des interactions légères
- compléter les lettres (qui sont plus sérieuses)
- donner une vie à l'app même sans match

Les salons ne remplacent pas les lettres.
Ils sont un **complément social**.

---

## 2. Format des salons

Un salon est :

- thématique (ex : Métal, Café, Piscine, Pirates…)
- limité en participants — **à implémenter** (voir §3)
- temporaire — **à implémenter** (voir §4)

> Implémentation actuelle : les salons sont des **espaces permanents** (isActive = true),
> sans limite de participants ni expiration. L'architecture de sessions temporaires
> est une évolution produit à décider.

---

## 3. Participants

### Format cible

- 4 personnes par salon
- idéalement 2 hommes / 2 femmes

### État actuel

- pas de `maxParticipants` dans le modèle Salon
- les participants sont trackés localement à partir des messages API
- pas d'assignation automatique ni de contrainte de genre

> À décider : session temporaire avec assignation auto, ou salon permanent ouvert ?

---

## 4. Durée de vie

### Cible produit

Un salon dure ~7 jours, puis expire.

### État actuel

- pas de champ `expiresAt` dans le modèle `Salon`
- les salons sont actifs tant que `isActive = true` (géré par l'admin)

> À implémenter si sessions temporaires validées : ajouter `expiresAt` au schéma,
> logique d'expiration côté backend.

---

## 5. Accès

Un utilisateur peut :

- rejoindre un salon depuis la liste ✓
- être assigné automatiquement — **à implémenter**
- changer de salon — **à décider**

### Gate

Si `canEnterSalon = false` (profil incomplet) :

- banner visible dans la liste ✓
- Alert au tap avec lien vers la complétion du profil ✓

---

## 6. Interface

### Mode vertical (principal)

- avatars des participants visibles en haut ✓
- feed de messages au centre ✓
- interactions autour des avatars ✓

### Mode horizontal (optionnel)

- focus avatars + effets uniquement ✓
- pas de chat visible ✓

---

## 7. Communication

Dans un salon :

- messages courts ✓
- ton léger ✓
- discussion libre, pas d'alternance ✓

Contrairement aux lettres :

- pas de tour à respecter
- ouvert à tous les participants du salon

---

## 8. Offrandes 🎁

Les utilisateurs peuvent envoyer des offrandes à un participant.

Exemples :

- boissons (bière, mojito, café…)
- nourriture (burger, sushi…)
- objets symboliques (rose, cœur…)

### État actuel ✓

- catalogue d'offrandes backend (`GET /offerings/catalog`)
- envoi via `POST /offerings/send`
- badges visuels autour de l'avatar du destinataire
- polling toutes les 15s pour les offrandes reçues

---

## 9. Magie ✨

Les utilisateurs peuvent lancer des sorts sur un autre participant.

Exemples :

- transformation (chat, fantôme, pirate…)
- aura, effets visuels
- invisibilité

### Règles

- effet temporaire (durée en secondes, stockée en `expiresAt`) ✓
- visible par tous les participants ✓
- peut être annulé via un anti-sort (`breakCondition` → sort opposé) ✓

### État actuel ✓

- catalogue de magies backend (`GET /magies/catalog`)
- `POST /magies/cast` avec cible et salon
- transformations trackées dans `salonMagies`, polling 15s
- animation "poof" à l'apparition d'une transformation

---

## 10. Interactions fun

### Implémenté ✓

- offrandes (§8)
- magies / transformations (§9)
- interactions visuelles inter-avatars

### À implémenter

- mini-jeux (continuer une histoire, duel pierre/feuille/ciseaux)
- défis collectifs
- réactions rapides

---

## 11. Thématisation

Chaque salon a :

- un thème visuel (`backgroundImage`, `primaryColor`, `backgroundType`) ✓
- un nom et une description ✓
- une `magicAction` optionnelle ✓
- offrandes et magies spécifiques au salon — **à décider** (actuellement catalogue global)

### Thèmes existants

| Kind | Salon |
|---|---|
| `PISCINE` | Piscine |
| `CAFE_DE_PARIS` | Café de Paris |
| `ILE_PIRATES` | Île des Pirates |
| `THEATRE` | Théâtre |
| `BAR_COCKTAILS` | Bar à Cocktails |
| `METAL` | Métal |

---

## 12. Objectif produit

Créer :

- fun immédiat
- interactions spontanées
- attachement à l'app
- moments mémorables

---

## 13. Différence avec lettres

```
Salons → fun, collectif, rapide
Lettres → privé, lent, émotionnel
```

---

## 14. Règles importantes

- pas de spam
- pas de domination d'un utilisateur
- équilibre entre participants
- interactions visibles et compréhensibles

---

## 15. Données nécessaires

| Champ | État |
|---|---|
| `salonId` | ✓ |
| `participants[]` | ✓ (trackés localement depuis messages + API) |
| `messages[]` | ✓ (`GET /salons/:id/messages`) |
| `activeEffects[]` | ✓ (`salonMagies`, polling 15s) |
| `expiresAt` | ✗ non implémenté (salon permanent) |

---

## 16. Expiration

### Cible produit

Quand un salon expire :

- fin des interactions
- archivage possible
- nouveau salon proposé

### État actuel

Les salons n'expirent pas. Ils sont désactivés manuellement par l'admin (`isActive = false`).

> À implémenter si sessions temporaires validées.

---

## 17. Règle fondamentale

Un salon doit être :

- vivant
- fun
- lisible

Pas un chat vide.

---

## Résumé

Les salons sont le **terrain de jeu social** de l'app.

Ils doivent donner envie de :

- revenir
- interagir
- s'amuser

### Points décidés / implémentés ✓

- thèmes visuels (6 salons)
- offrandes et magies avec effets temporaires
- interface verticale (avatars + chat) et horizontale (avatars seuls)
- gate profil incomplet

### Points ouverts à décider

- sessions temporaires de 7 jours (vs salons permanents)
- limite de 4 participants assignés automatiquement
- mini-jeux intégrés
- offrandes/magies spécifiques par salon
