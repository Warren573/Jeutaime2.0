# Confiance et classement — barème, pénalités, niveaux, diversité (PR 2)

**Statut : PROPOSÉ, NON ACTIVÉ.** `RULESET_STATUS = "PROPOSED_NOT_ACTIVE"`. Aucune fonctionnalité de l'application n'appelle
encore le moteur ; aucun ancien mécanisme n'est modifié ; aucune migration (le schéma Prisma est strictement inchangé).
Les valeurs ci-dessous sont celles proposées et sont **toutes à valider** avant toute activation.

## 1. Interrupteurs (tous désactivés par défaut)
| Variable | Valeur par défaut | Effet |
|---|---|---|
| `REPUTATION_RULES_MODE` | `off` | `off` : le moteur ne lit ni n'écrit rien. `shadow` : calcule les décisions **sans aucune écriture** (mesure à blanc). `active` : écrit. |
| `REPUTATION_RULES_EFFECTIVE_FROM` | absente | Date ISO : aucun fait antérieur n'est évalué (jamais rétroactif). |
| `REPUTATION_INACTIVITY_RESET_MONTHS` | absente | Mois calendaires (UTC, fin de mois ramenée au dernier jour). Prioritaire sur `…_DAYS`. Absente = remise à zéro désactivée. |

## 2. Barème (récompenses) — `policies/reputationRules.ts`
Un fait n'est jamais compté deux fois (clé d'idempotence par fait / jour / palier). Aucune règle ne connaît l'abonnement :
**Gratuit et Plus obtiennent exactement le même résultat** (test). Les points ne s'achètent pas et n'écrivent jamais les pièces.

| Règle | Fiabilité | Participation | Plafonds | Fonctionnalité existante |
|---|---:|---:|---|---|
| Sourire réciproque (match) | – | +1 | 1/match, 5/jour | `matches` |
| Trois questions validées | – | +2 | 1/match, 4/jour | `matches/questions` |
| Correspondance engagée | +5 | +2 | 1/match, 4/semaine | lettres |
| Première lettre | – | +2 | 1/correspondance | lettres |
| Réponse à une lettre | +2 | +2 | 6/jour, 7/semaine, 3/semaine/interlocuteur | lettres |
| Correspondance entretenue (palier 1-2) | +5 | +3 | 2 paliers/correspondance, 3/semaine | lettres |
| Réponse à une bouteille | – | +2 | – | bouteilles |
| Bouteille entretenue | +5 | +3 | – | bouteilles |
| Jour actif en salon | – | +2 | 1/jour, 7/semaine | salons |
| Salon mené à terme | +10 | +5 | 1/salon | salons |
| Jour de Refuge honoré | +2 | +2 | 7/semaine | Refuge |
| Aventure Refuge terminée (≥ 6 jours sur 7) | +10 | +5 | 1/aventure | Refuge |
| Duel mené à terme | +3 | +2 | 5/semaine, 1/semaine/adversaire | duels |
| Vote d'élection | – | +1 | **5/jour pour tous** (Plus : plus de votes, mais pas plus de points) | élections |
| Journal général | **indisponible** | **indisponible** | – | **aucune action membre : le Journal est en lecture seule** |

**Plafonds globaux par semaine civile (UTC)** : fiabilité 60, participation 100. Au-delà du plafond, gain partiel (clamp) plutôt
que refus brutal. Les plafonds sont lus **dans le registre, sous le verrou de ligne** de l'état du membre : exacts en concurrence
(test : 20 votes simultanés = exactement 5 points).

**Anti-abus** : empreinte de texte (même message recopié refusé pendant 30 jours), texte substantiel (≥ 40 caractères, ≥ 6 mots,
variété), écart minimal entre messages, jamais d'auto-interaction, plafond par interlocuteur.

## 3. Pénalités exceptionnelles
- Fenêtre glissante de **60 jours** ; **2 incidents gratuits** ; pénalité seulement si **≥ 3 incidents ET proportion
  incidents/(incidents + engagements respectés) ≥ 30 %**.
- Valeurs : rupture après questions −8 ; salon abandonné −4 ; correspondance abandonnée −3 ; bouteille abandonnée −3 ;
  Refuge négligé −3 ; duel abandonné −2. Plafond **12 par famille** et **24 au total** sur la fenêtre.
- Récupération automatique quand les incidents sortent de la fenêtre. Pénalité **contestable** et annulable par événement
  compensatoire (ADMIN/OWNER).
- **Jamais de pénalité** : classification inconnue ou ambiguë, refus, incompatibilité, blocage, simple signalement, vacances,
  sécurité. En cas de doute : rien.
- Les pénalités n'écrivent que la fiabilité.

## 4. Niveaux de fiabilité (points exacts jamais exposés)
Calculés à la demande depuis le registre (aucun champ stocké, aucun cron) : borne basse de Wilson (z = 1,28) sur la proportion
d'engagements respectés des 180 derniers jours, combinée au volume. Sept niveaux : Nouveau membre, Fiabilité à réévaluer,
Fiabilité fragile, Peu fiable, Fiable, Très fiable, Exemplaire. Le service ne renvoie que `{ level, label }`.

## 5. Diversité des rencontres — `policies/reputationDiversity.ts`
- **+5** au premier véritable échange réciproque, **+5** à une poursuite réelle ; **≤ 10 par binôme**, **≤ 30 par semaine** ;
  participation uniquement ; la clé est par **paire de membres** (une relation réinitialisée ne redonne rien).
- Cible éligible (calcul interne, motif jamais stocké ni renvoyé) : membre récent (≤ 30 j), peu sollicité (≤ 2 expéditeurs
  distincts sur 30 j), rarement sélectionné, ou de retour ; exclus : non vérifié, profil incomplet, banni, compte < 24 h.
- Sélection (préparée, **non branchée**) : `rankProfilesForDiscovery` ne permute que des profils **déjà filtrés** (compatibilité,
  blocages, préférences jamais contournés) ; graine déterministe par jour ; une position sur quatre en « voie d'équité » ;
  appréciation lissée bayésienne ; popularité ≠ volume d'interactions.
- Communication : suggestions génériques, rares (≤ 1/semaine), sans badge, pop-up, notification, culpabilisation ni indication
  sur le profil de la personne concernée.

## 6. Inactivité (non activée)
Trois mois **calendaires**, mode vacances inclus. « Activité réelle » = action d'une règle disponible du barème (ni connexion,
ni rafraîchissement de jeton, ni simple consultation). Une seule remise à zéro par période d'inactivité ; au retour :
« Fiabilité à réévaluer » jusqu'à 5 engagements observés. Rien n'est supprimé, les pièces sont intactes.

## 7. Résultats de simulation (PostgreSQL local isolé, horloge injectée)
Voir `docs/reputation-simulation-results.md` (généré par `tests/integration/reputation-simulation.test.ts`).

## 8. Incohérences et risques à décider avant activation
1. **Exemplaire atteint par le volume seul en 3 semaines** (simulation « très actif ») : recommandation : exiger une ancienneté
   d'observation minimale (p. ex. ≥ 8 semaines) pour « Très fiable » et « Exemplaire ». Non implémenté : à valider.
2. **Récupération des niveaux plus lente que celle des points** : après abus, les points redeviennent positifs en ~7 semaines
   mais le niveau « Peu fiable » persiste ~12 semaines (fenêtre de 180 jours). À confirmer (volontaire ?).
3. **Journal général** : aucune action de membre ; règle déclarée indisponible.
4. **Duels** : pas d'état « accepté » ; incident défini a minima (le défieur n'a jamais choisi alors que l'adversaire a choisi).
5. **Ruptures** : aucun motif enregistré → une incompatibilité ne se distingue pas d'un abandon ; recommandation : motif neutre
   optionnel à la rupture. D'ici là, seuls les cas classés explicitement sont pénalisés.
6. **« Plafond par binôme »** : interprété comme 10 points de diversité par paire de membres (pas par match).
7. **Compteur d'expositions** pour la sélection : nécessite une future migration (non incluse ici).
8. Les fenêtres (60 j, 180 j), seuils de niveaux et valeurs ci-dessus sont des **propositions**.

## 9. Ce qui n'est PAS fait
Aucun branchement des fonctionnalités, aucune interface, aucun écran d'accueil, aucune modification des élections ni des
salons, aucune conversion d'anciens scores, aucune règle sur les pièces, aucune migration, aucun déploiement.
Le plan de remplacement des anciens mécanismes est dans `docs/reputation-transition-plan.md`.
