# Documents légaux JeuTaime — projets

**Ces textes sont des projets. Ils ne constituent pas un avis juridique et doivent être validés par
un professionnel du droit avant toute publication.** Aucun n'est intégré à l'application.

Les passages entre crochets `[À FOURNIR : …]` attendent une information que vous seul détenez.
Aucune identité, adresse ou immatriculation n'a été inventée.

## 1. État des lieux

| N° | Document | Existant dans l'application | Projet dans ce dossier |
|---|---|---|---|
| 1 | Conditions générales d'utilisation | oui, 10 articles (`LegalDocumentScreen`, mode `terms`) ; article 10 à compléter | compléments : `cgu-complements.md` |
| 2 | Conditions générales de vente | **non** | `cgv.md` |
| 3 | Politique de confidentialité | oui, 10 articles ; sous-traitants et durées « à compléter » | compléments : `confidentialite-complements.md` |
| 4 | Mentions légales | écran présent, **entièrement à compléter** | `mentions-legales.md` |
| 5 | Règlement communautaire | écran « Règles de la communauté » | `reglement-communautaire.md` |
| 6 | Politique de modération | **non** | `politique-moderation.md` |
| 7 | Suppression des comptes | fonction en place, page web de demande en place | `confidentialite-complements.md` § 3 |
| 8 | Conservation des données | « à compléter » | `confidentialite-complements.md` § 2 |
| 9 | Informations sur les abonnements | **non** | `cgv.md` § 4 |
| 10 | Pièces virtuelles | un paragraphe dans les CGU | `cgv.md` § 3 |
| 11 | Remboursement et rétractation | **non** | `cgv.md` § 6 |
| 12 | Consentement publicitaire | **non** | `confidentialite-complements.md` § 4 |
| 13 | Notifications et communications | **non** | `confidentialite-complements.md` § 5 |
| 14 | Exercice des droits RGPD | un article général | `confidentialite-complements.md` § 6 |

## 2. Informations que vous devrez fournir

| Information | Utilisée dans |
|---|---|
| Nom et prénom, ou dénomination ; statut (par exemple entrepreneur individuel) | mentions légales, CGU, CGV, confidentialité |
| Adresse postale professionnelle | idem |
| Numéro SIREN/SIRET ; numéro de TVA ou mention de franchise | mentions légales, CGV |
| Adresse e-mail de contact, sur un nom de domaine que vous contrôlez | tous |
| Nom du directeur de la publication | mentions légales |
| Hébergeurs effectifs (API, base de données, site web, stockage des photos) : nom, adresse, pays | mentions légales, confidentialité |
| Liste des sous-traitants et pays de traitement (hébergement, notifications, publicité, paiement, e-mails) | confidentialité |
| Médiateur de la consommation choisi | CGV |
| Durées de conservation retenues | confidentialité |
| Adresse du point de contact pour les autorités et les signalements | modération |

## 3. Points de droit à faire trancher par votre conseil

| Sujet | Pourquoi |
|---|---|
| **Statut de professionnel** | Vendre des pièces et un abonnement fait de l'éditeur un professionnel : l'identification complète est due, l'anonymat ouvert aux éditeurs non professionnels ne s'applique pas. Un développeur individuel doit donc disposer d'une immatriculation avant la vente |
| **Données sensibles** | Une application de rencontre traite des données révélant l'orientation sexuelle (genre recherché). Base légale à sécuriser (consentement explicite) et analyse d'impact à envisager |
| **Droit de rétractation** | Contenu numérique fourni immédiatement : la renonciation exige un accord exprès préalable et la reconnaissance de la perte du droit. La formulation à l'achat doit être validée |
| **Rôle des stores** | Apple et Google encaissent et traitent les remboursements : articulation avec vos CGV à valider |
| **Règlement européen sur les services numériques (DSA)** | JeuTaime héberge des contenus d'utilisateurs. Les très petites entreprises sont dispensées d'une partie des obligations des plateformes, pas des obligations de base : point de contact, conditions décrivant la modération, mécanisme de notification, motivation des décisions |
| **Médiation de la consommation** | Adhésion à un médiateur obligatoire pour vendre à des consommateurs en France |
| **Publicité** | Consentement préalable aux traceurs publicitaires ; articulation avec la demande de suivi d'Apple |
| **Majorité** | Âge déclaratif aujourd'hui : niveau de vérification attendu à apprécier |

## 4. Exigences des stores relevées

| Exigence | État |
|---|---|
| Suppression du compte dans l'application, et par une page web | en place |
| Signalement et blocage d'utilisateurs | en place |
| Filtrage des contenus répréhensibles | **absent** |
| Coordonnées de contact publiées | **à compléter** |
| Achats de biens numériques par le système d'achat du store | **non développé** |
| Écran d'abonnement : prix, durée, renouvellement, liens vers conditions et confidentialité | **à faire** avec l'intégration des achats |
| Crédits achetés sans expiration | conforme (les pièces n'expirent pas) |
| Application réservée aux adultes, classification déclarée en conséquence | à déclarer dans les consoles |
| Normes publiées contre l'exploitation des mineurs, signalement dans l'application, contact désigné (Google Play, applications de rencontre) | **à faire** — texte dans `politique-moderation.md` § 6 |
| Fiche de confidentialité (Apple) et section « Sécurité des données » (Google) | à remplir, puis à mettre à jour avec la publicité |
