# JeuTaime — économie validée le 13 octobre 2026

> Référence produit. Ne pas modifier les montants sans accord du propriétaire. Cette branche contient une intégration PARTIELLE ; les sections non cochées ne sont pas implémentées.

## Pièces et publicités
- Connexion : +20 pièces une fois par jour, **identique Gratuit / Plus**.
- Publicité imposée : une par jour sur Gratuit, aucune sur Plus ; elle ne rapporte pas de pièces.
- Publicité récompensée : facultative, +10 pièces par visionnage confirmé, cinq par jour et par utilisateur au maximum.
- Pas de bonus de connexion hebdomadaire ni de bonus quotidien universel des mini-jeux.
- Pièces gagnées ou achetées sans expiration.

## Offrandes personnelles
- Boîte de chocolats : 60 pièces.
- Bouquet de fleurs : 80 pièces.
- Rose éternelle : 120 pièces.
- Bouteille de vin : 180 pièces.
- Passeport et deux billets : 300 pièces.
- Débit de l'expéditeur uniquement ; pas de transfert de pièces au destinataire.
- Livraison échouée et confirmée : remboursement automatique et idempotent.

## Offrandes des salons
- Boire : 5 pièces **par offrande**.
- Manger : 10 pièces **par offrande**.
- Préserver catalogues, restrictions et états des consommables existants.

## Magies des salons
- Grenouille, Âne, Poule, Fantôme, Pirate, Statue, Rockstar et Invisibilité : **20 pièces chacune**.
- Préserver durées, effets, antimagies et règles d'annulation existants ; le prix des antimagies elles-mêmes n'a pas été validé ici.

## Refuge
- Partie coopérative de sept jours, une adoption et/ou un animal par personne.
- Récompense **individuelle**, versée uniquement en fin de partie : non-assidu 0, assidu 50, score parfait 100 pièces.
- Les 50 et 100 pièces sont **mutuellement exclusives**.
- Si un participant manque une journée, il devient non assidu et le score parfait collectif n'est plus possible ; son partenaire resté assidu conserve ses 50 pièces.
- Score parfait seulement si les deux remplissent les critères du jeu.

## Élections H/F
- Vote gratuit, lecture de biographie non obligatoire, choix au hasard autorisé.
- +5 pièces par vote valide, **cinq votes rémunérés maximum par utilisateur et par élection hebdomadaire**.
- Profil Homme élu : +50 pièces ; profil Femme élue : +50 pièces, attribuées en fin d'élection.
- Contrôle contre doubles crédits et votes abusifs.

## Jeu de cartes
- Mise : 20 pièces par partie.
- Cœur : +15 aux gains du jeu ; pique : remise à zéro ; trèfle : division par deux ; carreau : indice.
- Pas de limite de nombre de parties ni plafond arbitraire des gains ; portefeuille suffisant requis.
- **Audit préalable impératif** : probabilités, espérance de gain, encaissement, sécurité et conformité des règles des plateformes puisque les pièces peuvent être achetées.

## Packs et abonnement
- 100 pièces : 0,99 € TTC ; 500 pièces : 2,99 € TTC ; 1 000 pièces : 4,99 € TTC.
- **Un seul abonnement payant, Plus : 5,99 € / mois**. Ne pas proposer plusieurs formules payantes.
- Plus : 500 pièces bonus par mois, 20 pièces quotidiennes comme Gratuit, aucune pub imposée, photo visible dès la sélection des profils, 10 correspondances actives contre 5 sur Gratuit, 5 bouteilles simultanées contre 1 sur Gratuit (**envois et réponses confondus**).
- Les pubs récompensées restent facultatives et accessibles aux deux formules.
- En cas de fin d'abonnement : garder toutes les pièces et interactions ouvertes ; empêcher de **nouvelles** ouvertures si le quota gratuit est déjà dépassé, sans effacer d'échange.
- Conserver la mécanique de dévoilement des photos de la formule gratuite.

## Contrôles
- Certification obligatoire par selfie, à concevoir dans le respect du RGPD et de la minimisation des données.
- Soldes, récompenses, paiements, remboursements, plafonds : serveur faisant autorité, transaction atomique, validation anti-rejeu et journal d'audit.
- Ne pas publier de faux paiements : achats intégrés Apple / Google et système web à raccorder à une vérification réelle des encaissements.

## Travail restant
- [x] Constantes backend : +20 pièces quotidiennes pour Gratuit et Plus.
- [x] Constantes backend : limite de 10 correspondances pour Plus.
- [x] Test unitaire adapté pour le montant quotidien égal.
- [ ] Offrandes personnelles : identifier les objets réels et adapter leur catalogue.
- [x] Tarifs boissons/nourritures de salons dans le seed et les données frontend : 5/10 pièces ; **reste à mettre à jour les lignes déjà en base et vérifier les autres surfaces**.
- [x] Huit magies validées : tarifs à 20 pièces dans seed et frontend ; **reste à mettre à jour les lignes déjà en base et vérifier toutes les surfaces**. Les antimagies restent inchangées.
- [ ] Refuge : assiduité individuelle, score parfait collectif, attribution finale idempotente.
- [x] Élections : cinq premiers votes rémunérés par semaine, les suivants restent gratuits (backend + libellés frontend) ; tests à effectuer.
- [ ] Élections : créditer les deux élus de 50 pièces chacun à la clôture, de manière idempotente.
- [ ] Régie publicitaire : pub quotidienne et validation des récompenses (cinq/jour).
- [ ] Abonnement Plus : bonus mensuel 500, suppression des offres historiques, facturation réelle et gestion des droits.
- [ ] Bouteilles : plafonds simultanés 1 / 5 (envois et réponses).
- [ ] Photos de sélection visibles immédiatement pour Plus.
- [ ] Catalogue des trois packs et achats sécurisés.
- [ ] Historique des pièces, remboursement automatique, certification et protections anti-fraude.
- [ ] Auditer jeu de cartes et conformité avant d'activer les mises en production.
- [ ] Vérifier les tests d'intégration, builds web/iOS/Android, puis validation du propriétaire avant fusion.
