# Bannières des cartes de salon

Images **larges** utilisées comme fond des **cartes** dans la liste des salons
(distinct des aquarelles portrait qui servent de fond plein écran dans le salon).

## Format conseillé
- **Ratio ~3:1** (la carte est large et courte)
- **Taille : 1200 × 400 px** (net sur écrans 2x/3x ; la carte fait ~360×115 pt)
- **JPG, qualité ~85**, viser **< 400 Ko** par fichier
- Affichage en `cover` → l'image est recadrée pour remplir la carte

## Composition (important)
Du texte blanc est superposé :
- à **gauche** : icône + nom du salon + description
- en **haut à droite** : badge « en ligne »

→ Garde ces zones **lisibles** : évite les détails trop chargés/clairs derrière
le texte à gauche. Un côté gauche un peu plus sobre/sombre aide la lisibilité
(un voile sombre léger est déjà appliqué par l'app).

## Nommage
Un fichier par salon, nommé selon l'`id` du salon :
`piscine.jpg`, `cafe_paris.jpg`, `pirates.jpg`, `theatre.jpg`,
`cocktails.jpg`, `metal.jpg`, `psy.jpg`

## Branchement
Une fois les fichiers déposés ici, ajoute leur `require()` dans
`src/data/salonBackgroundImages.ts` → `SALON_BANNER_IMAGES`.
Tant qu'une bannière n'est pas fournie, la carte utilise automatiquement
l'aquarelle portrait du salon (repli).
