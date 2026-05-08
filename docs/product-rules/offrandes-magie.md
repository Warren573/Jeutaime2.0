# Règles produit — Offrandes & Magie

## 1. Principe général

Les Offrandes et la Magie sont des interactions fun, visibles et simples.

Objectif :

- créer du jeu
- renforcer les interactions dans les salons
- apporter du fun sans complexité technique

---

## 2. Distinction claire

### Offrandes 🎁

- objets envoyés (boisson, nourriture, symbole)
- visibles autour de l'avatar du destinataire
- interaction légère

### Magie ✨

- transformation de l'utilisateur
- remplace visuellement son avatar
- effet temporaire

---

## 3. Choix produit important

**Pas d'effets visuels complexes :**

- ❌ pas d'aura dynamique
- ❌ pas de particules
- ❌ pas de météo
- ❌ pas d'animations lourdes

> Note implémentation : `AvatarEffectLayer` existe avec des effets d'ambiance
> (`pulseGlow`, `rainFall`, `ghostFloat`) — à reconsidérer au vu de cette règle.
> Ces animations sont légères (SVG + opacity/translateY), mais le principe
> "Simple > spectaculaire" (§13) doit guider les évolutions futures.

---

## 4. Offrandes

### Fonctionnement

Quand A envoie une offrande à B :

- l'objet apparaît à côté de l'avatar ✓
- animation simple (pop + léger mouvement) ✓ (spring `poofScale` + fade)
- reste visible jusqu'à expiration (`expiresAt`) ✓

### États

- actif (`expiresAt > now` ou `expiresAt = null`) ✓
- expiré — filtré côté frontend et backend ✓
- états "plein / entamé / fini" — **à décider** (non implémenté, simplifiable)

### Rôle

Les offrandes servent à :

- interagir avec un participant ✓
- faire plaisir ✓
- déclencher des petits événements fun ✓

### Implémentation ✓

- `GET /offerings/catalog` — catalogue d'offrandes (emoji, nom, coût, durée)
- `POST /offerings/send` — envoi avec débit wallet atomique
- `GET /offerings/salon/:salonId` — offrandes actives du salon (24h, max 100)
- badges emoji affichés autour de l'avatar du destinataire

---

## 5. Magie

### Principe

La magie transforme l'avatar du joueur ciblé.

> Cible produit : remplace **directement** l'avatar par une image (chat, pirate, statue…).  
> État actuel : overlay semi-opaque sur l'avatar (pirate = chapeau sur la tête,
> fantôme = fondu opaque, grenouille = overshoot spring). L'avatar reste
> partiellement visible. Évolution vers remplacement total = simplification possible.

### Exemples

- chat 🐱, fantôme 👻, pirate 🏴‍☠️, grenouille 🐸, statue 🗿

### Règles

- une seule transformation active à la fois ✓ (`topCast = activeMagiesOnMe[0]`)
- visible par tous les participants ✓ (polling 15s `salonMagies`)
- remplace/superpose l'avatar ✓

### Avantage actuel

- système d'assets SVG existant (transformationRegistry)
- animationKey par transformation (popOnHead, fadeOverlay, stoneFade, poofTransform)
- lisible et cohérent avec le reste du système avatar

### Implémentation ✓

- `GET /magies/catalog` — sorts + anti-sorts (emoji, nom, coût, durée, breakConditionId)
- `POST /magies/cast` — lance un sort (avec débit wallet, `expiresAt`)
- `POST /magies/break/:castId` — casse un sort (anti-sort)
- `GET /magies/salon/:salonId` — sorts actifs dans le salon (polling)
- `GET /magies/me/active` — sorts ciblant l'utilisateur courant

---

## 6. Durée

- `durationSec` dans le catalogue des magies ✓
- `durationMs` dans le catalogue des offrandes ✓
- facilement modifiable via l'admin (seed ou CRUD admin) ✓

---

## 7. Annulation

- annulée automatiquement à expiration (`expiresAt`) ✓
- annulée par un anti-sort (`breakConditionId` + sort opposé) ✓
- remplacée par une nouvelle transformation (seul le sort le plus récent s'affiche) ✓

---

## 8. Salons

- offrandes → badges emoji autour de l'avatar du destinataire ✓
- magies → transformation visible de l'avatar ✓
- visible par tous les participants (polling 15s) ✓

---

## 9. Limites

- pas de spam : le coût en coins régule la fréquence ✓
- une seule transformation visible à la fois ✓
- lisibilité : assets SVG simples, pas d'effets de particules ✓

---

## 10. Économie

| Type | Champ |
|---|---|
| Offrandes | `cost` dans `OfferingCatalog` ✓ |
| Magie | `cost` dans `MagieCatalog` ✓ |

> Équilibre à ajuster via l'admin — ne bloque pas le développement.

---

## 11. Données nécessaires

| Champ | Offrande | Magie |
|---|---|---|
| `type` | `OfferingCatalog.category` ✓ | `MagieCatalog.type` ✓ |
| `senderId` | `fromUserId` ✓ | `fromUserId` ✓ |
| `targetId` | `toUserId` ✓ | `toUserId` ✓ |
| `salonId` | ✓ | ✓ |
| `duration` | `durationMs` ✓ | `durationSec` ✓ |
| `createdAt` | ✓ | `castAt` ✓ |

---

## 12. Objectif produit

Créer :

- fun immédiat ✓
- interactions visibles ✓
- moments mémorables ✓

Sans :

- complexité inutile
- effets lourds
- confusion visuelle

---

## 13. Règle fondamentale

```
Simple > spectaculaire
Lisible > complexe
Fun > technique
```

---

## Résumé

```
Offrandes → objets autour de l'avatar (badges emoji, expirables)
Magie → overlay/remplacement de l'avatar (transformation temporaire)
```

Le système doit être :

- simple ✓
- fun ✓
- immédiat ✓
