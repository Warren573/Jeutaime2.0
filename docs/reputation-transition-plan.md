# Plan de transition vers le nouveau système (préparation — rien n'est modifié)

Les mécanismes historiques restent **actifs et inchangés** tant qu'une bascule séparée n'a pas été validée.

| Mécanisme actuel | Remplacé par | Condition de retrait |
|---|---|---|
| `discoveryActivityScore` | Participation (barème v2) + diversité | Mesure à blanc concluante (mode `shadow`) puis sélection branchée |
| Pénalité −40 (rupture < 5 min après activation) | Famille « rupture après questions » (−8, répétition + proportion) | Champ `breakKind` renseigné en production, contestation disponible |
| 3 triggers SQL (migration 20261026193000) | Événements écrits par le service | Équivalence vérifiée en `shadow`, puis migration dédiée |
| −5/jour d'absence au Refuge | « Refuge négligé » (−3, répétition) | Idem |
| XP (`Profile.points`) et niveaux | Conservés tels quels (autre usage : progression) | Décision produit séparée |
| Pièces | **Aucun changement** | – |

## Ordre de bascule proposé
1. Merge de la PR 2 (rien d'actif). 2. Branchement des fonctionnalités avec `REPUTATION_RULES_MODE=shadow` : décisions
calculées, comparées aux anciens scores, aucune écriture. 3. Choix de `REPUTATION_RULES_EFFECTIVE_FROM`, passage en `active`.
4. Retrait des anciens mécanismes un par un, chacun dans sa PR. 5. Remise à zéro après inactivité en dernier.

## Retour arrière
Remettre `REPUTATION_RULES_MODE=off` suffit à neutraliser le moteur (aucune lecture, aucune écriture). Les événements déjà
écrits restent dans le registre (append-only) et peuvent être annulés par événements compensatoires. Aucune conversion
d'ancien score n'ayant lieu, rien n'est à restaurer.
