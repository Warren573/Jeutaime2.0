# Mode Test JeuTaime

Ce dossier contient uniquement les outils de développement destinés aux tests locaux.

- `TEST_MODE_ENABLED` repose sur `__DEV__`.
- Les composants de test doivent retourner `null` hors développement.
- Les actions destructives ou de simulation doivent également appeler `assertTestMode()` côté client et rester protégées côté backend par l'environnement de développement.
- Aucun secret, token, mot de passe ou donnée réelle ne doit être stocké ici.
