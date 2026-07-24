# Fond du "bureau d'offrandes"

Image de fond plein écran pour l'écran **Offrandes Reçues**
(`ReceivedOfferingsScreen.tsx`) : un bureau vu du dessus (bois, lampe, pot de
fleur, pot à crayons) sur lequel les offrandes reçues seront posées.

## Nommage
Dépose le fichier ici sous le nom :
`desk-bg.png` (ou `.jpg` si déjà compressé)

## Format conseillé
- Portrait, proche du ratio d'un écran de téléphone (l'image de référence
  fait environ 1024×1536, ratio ~2:3)
- PNG ou JPG. Si PNG et > 500 Ko, je le convertirai en JPG optimisé
  (qualité ~85) avant de le brancher, comme pour les autres fonds.

## Branchement
Une fois le fichier déposé ici, je le référence directement dans
`src/screens/ReceivedOfferingsScreen.tsx` comme fond plein écran (fixed sur
le web / absolute en natif, même technique que `sea-bg` et `letter-bg`).
