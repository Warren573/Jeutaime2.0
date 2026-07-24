# Bannières illustrées des cartes « Social »

Même principe que les bannières de salon : une **illustration peinte** sert de
fond aux cartes de l'écran Social (Salons, Adoption, Jeu de Cartes,
Continue l'Histoire, Bouteille à la Mer), avec le texte blanc par-dessus.

## Format conseillé
- **Ratio ~3:1** (carte large et courte), ex. **1200 × 400 px**
- **JPG qualité ~85**, viser **< 400 Ko**
- Côté **gauche** un peu sobre/sombre : titre + description y sont superposés en
  blanc (un léger voile sombre est déjà appliqué par l'app).

## Nommage (selon l'id de la section)
`salons.jpg`, `adoption.jpg`, `cards.jpg`, `story.jpg`, `bottle.jpg`

## Branchement
Une fois les fichiers déposés ici, décommente leur `require()` dans
`src/data/socialCardImages.ts` → `SOCIAL_CARD_IMAGES`.
Tant qu'une bannière manque, la carte utilise automatiquement le dégradé de
repli défini dans `SocialScreen.tsx`.
