# Politique de confidentialité — compléments — PROJET

> Projet à faire valider. Non publié. Complète les dix articles déjà présents dans l'application,
> dont les articles 5 (sous-traitants) et 6 (durées) portent encore « à compléter ».

## 1. Sous-traitants et destinataires (article 5)

À compléter avec les prestataires **réellement utilisés**. D'après le code du projet :

| Fonction | Prestataire constaté dans le code | À confirmer |
|---|---|---|
| Hébergement de l'API | Render | région, contrat |
| Base de données | PostgreSQL (Neon possible) | prestataire effectif, région |
| Site web | Vercel | région |
| Notifications push | service de notifications d'Expo, puis Apple et Google | — |
| Mises à jour de l'application | Expo (EAS Update) | — |
| Stockage des photos | disque du serveur d'API | à confirmer |
| Publicité | aucun aujourd'hui ; Google AdMob si activé | à ajouter le jour de l'activation |
| Paiement | aucun aujourd'hui ; Apple et Google si activé | à ajouter |
| E-mails | aucun aujourd'hui | à ajouter si un service est choisi |

Plusieurs de ces prestataires sont établis hors de l'Union européenne : [À VALIDER : garanties de
transfert applicables].

## 2. Durées de conservation (article 6) — proposition à valider

| Données | Durée proposée | Justification |
|---|---|---|
| Compte, profil, photos, lettres, messages | tant que le compte existe | exécution du service |
| Compte désactivé | [À FIXER : par exemple 12 ou 24 mois], puis suppression après préavis | minimisation |
| Compte supprimé | suppression immédiate des données du compte ; sauvegardes écrasées sous [À FOURNIR : durée de rétention des sauvegardes] | — |
| Journal des connexions | [À FIXER : 6 à 12 mois] | sécurité |
| Signalements et décisions de modération | [À FIXER] après clôture | défense des droits, obligations de plateforme |
| Historique des pièces sans achat | tant que le compte existe | service |
| Justificatifs d'achats | 10 ans | obligation comptable — [À VALIDER] |
| Tickets de support | [À FIXER : 3 ans après clôture] | — |
| Jetons de notification | jusqu'à désinscription ou invalidité | — |

**Écart constaté** : à la suppression d'un compte, le code efface aussi les signalements dont ce
compte était la cible et les lignes du journal d'audit qui le visent
(`accountDeletion.service.ts`). C'est favorable à l'effacement, mais contradictoire avec une
conservation des décisions de modération : à trancher.

## 3. Suppression du compte

- Dans l'application : Réglages → Supprimer mon compte. Le mot de passe et la saisie du mot
  « SUPPRIMER » sont demandés. La suppression est immédiate et définitive.
- Sans l'application : page web de demande de suppression [À FOURNIR : adresse publique], comme
  l'exige Google Play.
- Sont supprimés : profil, photos (fichiers compris), lettres envoyées et reçues, matchs, offrandes,
  portefeuille et historique, réglages, jetons de notification, bouteilles, participations.
- Conséquence pour les autres : les lettres échangées avec la personne disparaissent aussi de la
  boîte de ses correspondants.
- Alternative réversible : la désactivation (le compte est masqué et se réactive à la reconnexion).
- Les pièces non utilisées et l'abonnement en cours ne sont pas remboursés par la suppression ;
  l'abonnement doit être résilié auprès du store.

## 4. Publicité et consentement

À publier seulement si la publicité est activée.

- JeuTaime peut afficher des publicités fournies par [réseau publicitaire].
- Au premier lancement, un écran recueille ton choix : publicités personnalisées, non
  personnalisées, ou refus des traceurs publicitaires. Ton choix est modifiable à tout moment dans
  Réglages → Confidentialité → Choix publicitaires.
- Sur iPhone, une autorisation de suivi distincte est demandée par le système.
- Refuser n'empêche pas d'utiliser JeuTaime.
- Les publicités récompensées sont facultatives. Lorsqu'une publicité est regardée jusqu'au bout,
  le réseau publicitaire confirme le visionnage à JeuTaime avec ton identifiant de compte, sans
  autre donnée de profil.
- JeuTaime ne transmet au réseau publicitaire ni tes lettres, ni tes messages, ni tes préférences
  de rencontre.
- Base légale : consentement pour les traceurs et la personnalisation.

## 5. Notifications et communications

- Notifications push : envoyées seulement si tu les as autorisées sur ton téléphone. Réglables par
  catégorie dans Réglages → Notifications, et désactivables entièrement.
- Leur texte reste volontairement générique (« Tu as reçu une nouvelle lettre ») : ni le nom de
  l'expéditeur ni le contenu n'apparaissent sur l'écran verrouillé.
- JeuTaime n'envoie pas de communication commerciale par notification sans ton accord.
- Les messages de service indispensables (sécurité du compte, décision de modération, modification
  des conditions) peuvent être envoyés quel que soit ce réglage. [À VALIDER]
- E-mails : aucun envoi aujourd'hui. [À COMPLÉTER si un service d'e-mails est mis en place]

## 6. Exercer tes droits

| Droit | Comment |
|---|---|
| Accès et portabilité | Réglages → Mes données personnelles : export immédiat |
| Rectification | Réglages → Modifier mon profil, E-mail |
| Effacement | Réglages → Supprimer mon compte, ou page web de demande |
| Opposition, limitation, retrait du consentement | Réglages → Confidentialité et Notifications ; ou demande écrite |
| Toute autre demande | [À FOURNIR : adresse e-mail dédiée] |

- Réponse sous un mois ; une pièce justifiant l'identité ne peut être demandée qu'en cas de doute
  raisonnable.
- Réclamation possible auprès de la CNIL (cnil.fr).
- [À VALIDER : désignation d'un délégué à la protection des données ; analyse d'impact, compte tenu
  de données pouvant révéler l'orientation sexuelle]

## 7. Données particulières

Le genre et les préférences de rencontre peuvent révéler l'orientation sexuelle. Proposition : les
traiter sur la base du **consentement explicite**, recueilli à la création du profil par une case
distincte, et ne jamais les utiliser à des fins publicitaires. [À VALIDER — aucun recueil distinct
n'existe aujourd'hui dans l'application]
