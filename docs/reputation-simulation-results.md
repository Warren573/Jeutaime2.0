# Résultats de simulation — barème v2 (non activé)

Généré par `backend/tests/integration/reputation-simulation.test.ts` sur PostgreSQL local isolé, horloge injectée. Semaines civiles UTC.

### Membre discret et respectueux (≈ 4 actions par semaine)

| Semaine | Fiabilité | Participation | Popularité | Niveau |
|---|---:|---:|---:|---|
| 1 | 24 | 14 | 0 | Nouveau membre |
| 2 | 38 | 23 | 0 | Nouveau membre |
| 3 | 62 | 37 | 0 | Fiable |
| 4 | 76 | 46 | 0 | Fiable |
| 5 | 100 | 60 | 0 | Très fiable |
| 6 | 114 | 69 | 0 | Très fiable |
| 7 | 138 | 83 | 0 | Très fiable |
| 8 | 152 | 92 | 0 | Très fiable |
| 9 | 176 | 106 | 0 | Très fiable |
| 10 | 190 | 115 | 0 | Exemplaire |

### Membre très actif (tente de maximiser chaque jour)

| Semaine | Fiabilité | Participation | Popularité | Niveau |
|---|---:|---:|---:|---|
| 1 | 60 | 100 | 0 | Fiable |
| 2 | 120 | 200 | 0 | Très fiable |
| 3 | 180 | 300 | 0 | Exemplaire |
| 4 | 240 | 400 | 0 | Exemplaire |
| 5 | 300 | 500 | 0 | Exemplaire |
| 6 | 360 | 600 | 0 | Exemplaire |

### Membre populaire (très sollicité, répond peu)

| Semaine | Fiabilité | Participation | Popularité | Niveau |
|---|---:|---:|---:|---|
| 1 | 2 | 2 | 0 | Nouveau membre |
| 2 | 2 | 2 | 0 | Nouveau membre |
| 3 | 4 | 4 | 0 | Nouveau membre |
| 4 | 4 | 4 | 0 | Nouveau membre |
| 5 | 6 | 6 | 0 | Nouveau membre |
| 6 | 6 | 6 | 0 | Nouveau membre |

### Membre peu sollicité (échanges réels avec des membres qui en ont besoin)

| Semaine | Fiabilité | Participation | Popularité | Niveau |
|---|---:|---:|---:|---|
| 1 | 0 | 5 | 0 | Nouveau membre |
| 2 | 0 | 10 | 0 | Nouveau membre |
| 3 | 0 | 15 | 0 | Nouveau membre |
| 4 | 0 | 20 | 0 | Nouveau membre |

Interlocuteur non éligible (compte ancien, déjà très sollicité : 40 expéditeurs distincts) : bonus accordé = 0 (NOT_ELIGIBLE).

### Membre abusif (16 abandons en 4 semaines, puis comportement correct)

| Semaine | Fiabilité | Participation | Popularité | Niveau |
|---|---:|---:|---:|---|
| 1 | 0 | 0 | 0 | Nouveau membre |
| 2 | 0 | 0 | 0 | Fiabilité fragile |
| 3 | -18 | 0 | 0 | Peu fiable |
| 4 | -24 | 0 | 0 | Peu fiable |
| 5 | -14 | 5 | 0 | Peu fiable |
| 6 | -4 | 10 | 0 | Peu fiable |
| 7 | 6 | 15 | 0 | Peu fiable |
| 8 | 16 | 20 | 0 | Peu fiable |
| 9 | 26 | 25 | 0 | Peu fiable |
| 10 | 36 | 30 | 0 | Peu fiable |
| 11 | 46 | 35 | 0 | Peu fiable |
| 12 | 56 | 40 | 0 | Peu fiable |
| 13 | 66 | 45 | 0 | Fiabilité fragile |
| 14 | 76 | 50 | 0 | Fiabilité fragile |

### Ferme de comptes (2 comptes complices, 21 jours, 10 tentatives de réponse par jour)

- Premier message identique répété : 1 accordé sur 21 tentatives.
- Réponses avec le même interlocuteur : points de fiabilité = 18, participation = 20 (plafond : 3 réponses/semaine/interlocuteur).

### Retour après plus de trois mois d'inactivité (semaine 6 → retour → 5 engagements)

| Semaine | Fiabilité | Participation | Popularité | Niveau |
|---|---:|---:|---:|---|
| 6 | 120 | 60 | 0 | Très fiable |
| 0 | 0 | 0 | 0 | Fiabilité à réévaluer |
| 1 | 10 | 10 | 0 | Fiable |
