# Règles produit — Aperçu du profil (Preview)

## 1. Principe général

L'utilisateur doit pouvoir voir son profil exactement comme les autres le verront.

Objectif :

- éviter les profils mal construits
- encourager un profil qualitatif
- rendre l'utilisateur acteur

---

## 2. Accès

Depuis l'édition de profil :

- bouton **"🪞 Voir mon profil"** en bas de l'écran, après le bouton Sauvegarder ✓

> Implémentation : `router.push('/profile/${currentUser.id}')` depuis EditProfileScreen.

---

## 3. Contenu du preview

Le preview affiche exactement ce que ProfileDetailScreen affiche :

- avatar ✓
- bio (≥ 50 mots, mise en avant) ✓
- centres d'intérêt ✓
- compétences (3) ✓
- questions (3) ✓
- enfants / préférences ✓
- ordre identique au vrai profil ✓

> Photos : non affichées dans ProfileDetailScreen (barre de progression "Photos cachées").
> §4 / §5 (swipe photos) n'ont pas de gap à combler actuellement.

---

## 4. Photo dans le preview

Cas spécial :

- **Moi → je vois ma photo** (en mode aperçu)
- **Autres → voient avatar tant que non débloqué**

> Non applicable pour l'instant : ProfileDetailScreen n'affiche pas les photos
> individuelles (uniquement barre de progression). À implémenter quand les photos
> seront rendues dans le profil.

---

## 5. Swipe avatar / photos

Dans le preview :

- swipe avatar / photos

> À implémenter quand les photos seront rendues dans le profil (§4).

---

## 6. Mode "vue externe" (aperçu)

Quand on accède à `/profile/:id` avec son propre id :

- bannière **"🪞 Aperçu — c'est comme ça que les autres voient ton profil"** affichée ✓

> Implémentation : détection `isOwnProfile = id === currentUser.id` dans
> ProfileDetailScreen. La bannière est affichée en haut du ScrollView.

Un toggle **"Vue comme un autre utilisateur"** (respect des règles réelles, photo cachée)
est une évolution possible mais non prioritaire.

---

## 7. Mise à jour en temps réel

Pendant l'édition, le preview reflète les données sauvegardées.

> Le preview est une vue distincte (page à part) et non un panneau inline.
> La mise à jour en temps réel s'applique après sauvegarde.

---

## 8. Validation visuelle

Si profil incomplet, la bannière d'avertissement dans EditProfileScreen affiche :

```
⚠️ Profil incomplet — manque : bio (X/50 mots), centres d'intérêt, compétences (X/3), 3 questions
```

✓ Implémenté, calculé à chaque render.

---

## 9. Objectif produit

Créer :

- des profils soignés ✓ (bannière avertissement + accès préview)
- une expérience qualitative ✓
- un sentiment de contrôle ✓

---

## 10. Règle fondamentale

L'utilisateur doit voir ce qu'il construit.

Pas de profil "caché" ou abstrait.

---

## Résumé

| Fonctionnalité | État |
|---|---|
| Bouton "Voir mon profil" dans EditProfile | ✓ |
| Bannière "Aperçu" dans ProfileDetail | ✓ |
| Bannière validation manques (bio, questions…) | ✓ |
| Swipe photos propres (unblurred) | À implémenter quand photos rendues |
| Toggle "vue comme un autre" | Évolution future |
