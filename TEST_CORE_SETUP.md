# JeuTaime TEST — branche test-core

Cette branche est une copie de `main` destinée à valider le moteur de JeuTaime sans travailler le design.

## Isolation

- `main` reste la branche de l'application actuelle.
- `test-core` utilise une identité Expo différente : `JeuTaime TEST`.
- iOS : `com.jeutaime.test`.
- Android : `com.jeutaime.test`.
- Scheme : `jeutaime-test`.
- La version TEST ne doit jamais être connectée à la base de production.

## Base de données

Avant tout test qui écrit des données, créer une base PostgreSQL dédiée et fournir sa propre `DATABASE_URL` au backend TEST. Ne jamais copier le secret de production dans l'environnement TEST.

## Objectif UI

L'écran d'accueil de `test-core` est volontairement basique. Il sert de tableau de diagnostic vers les modules :

1. Découverte / Profils
2. Lettres
3. Salons
4. Bouteille à la mer
5. Refuge
6. Offrandes
7. Profil
8. Paramètres

Le design final n'est pas un objectif de cette branche.

## Méthode de validation

Pour chaque module :

1. reproduire le parcours avec des comptes fictifs ;
2. noter le résultat attendu ;
3. constater le résultat réel ;
4. corriger uniquement sur `test-core` ;
5. re-tester ;
6. ne reporter sur `main` que la correction fonctionnelle validée.

## Interdiction

Aucune fusion globale de `test-core` vers `main`. Les corrections validées doivent être reportées de façon ciblée afin de ne jamais remplacer le design de production par l'interface de test.
