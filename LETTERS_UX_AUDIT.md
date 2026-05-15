# Audit UX/UI — Écran Lettres JeuTaime
**Date**: 2026-05-15  
**Objectif**: Transformer expérience lettres en moment fort émotionnel  
**Portée**: UI/UX uniquement (zéro code)

---

## 1. PROBLÈMES ACTUELS

### 1.1 Architecture globale
- ❌ **3 onglets web** (Lettres, Journal, Souvenirs) = layout dashboard, pas immersion
- ❌ **Pas de progression visuelle** des niveaux 0-3 dans l'expérience
- ❌ **Photo reveal invisible** dans le flux lettres (déconnecté)
- ❌ **Layout compacte** (info empilée en rows) = feel web/desktop, pas mobile naturel

### 1.2 Vue liste (EnvelopeCard)
- ✅ Animation légère ✓ sur non-lu (tremblant)
- ✅ Couleur papier/brun OK (FEFAF0, B8956A)
- ✅ Petit flap + sceau avec emoji
- ❌ **Carte lisse** → ressemble à une UI compacte, pas enveloppe physique
- ❌ **Info écrasée** (avatar 42px, nom, preview 1 ligne, badge)
- ❌ **Pas de hiérarchie visuelle** clair entre niveaux de relation
- ❌ **Action bar en bas** (2 boutons) = lisible mais impersonnel

### 1.3 Vue correspondance (Modal)
- ✅ Affichage conversation chronologique OK
- ❌ **Lettres affichées comme du chat** (cartes texto, pas récit/carnet)
- ❌ **Aucune ambiance** d'ouverture enveloppe
- ❌ **Input chat standard** en bas (place le focus sur envoi, pas sur relation)
- ❌ **Header foncé** + banners tech (relation level, turn state) = info, pas émotion
- ❌ **Pas de variation visuelle** pour progression levels 0-3
- ❌ **Photo reveal déconnecté** = s'affiche ailleurs, pas dans lettres

### 1.4 Tonalité générale
- ❌ Emojis remplacent la personnalité (⚜️✉️📨🪶) au lieu de la révéler
- ❌ Palette correcte (brun/papier) mais usage plat
- ❌ Zéro animation sauf tremblant/seal
- ❌ Pas de moment "wow" — ni visuellement, ni émotionnellement

---

## 2. DIRECTION VISUELLE RECOMMANDÉE

### 2.1 Principes directeurs
1. **Papier/Carnet** — Sensation de correspondance écrite, pas chat
2. **Progression émotionnelle** — Chaque lettre, chaque niveau compte
3. **Mobile naturel** — Gestes, space, lisibilité avant info
4. **Moments forts** — Enveloppe qui s'ouvre, photo qui se révèle = viscéral
5. **Minimaliste élégant** — Pas de gnangnan, pas d'overdose d'emoji

### 2.2 Ambiance cible
- Carnet/journal intime (Moleskine aesthetic)
- Texte manuscrit ou cursive légère (pour les lettres)
- Filigrane/texture papier subtile
- Transitions fluides (glisser enveloppe, révéler photo)
- Lumière chaleureuse (accent dorée en lieu de rouge)

---

## 3. STRUCTURE D'ÉCRAN PROPOSÉE

### Phase 1: Vue liste (Restructure EnvelopeCard)
```
┌─────────────────────────────┐
│ ✉️ Mes correspondances     │ ← Titre simple, pas "Boîte aux lettres"
│ Trier: Plus récentes       │ ← Optionnel
├─────────────────────────────┤
│                             │
│ [ENVELOPPE AGRANDIE]        │
│ ┌───────────────────────┐   │
│ │ Flap (90px h)         │   │ ← Plus grande que maintenant (54px)
│ │ [Sceau: ⚜️ ou ✉️]     │   │
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ Avatar circulaire (60)│   │ ← Plus grand (vs 42)
│ │ Nom (16px bold)       │   │
│ │ État court (13px)     │   │ ← "À vous de répondre" ou "Nouvelle!"
│ │ Niveau/Stars (12px)   │   │ ← Valorisé: "★★ Niveau 2"
│ │ [Dernier msg date]    │   │
│ └───────────────────────┘   │
│                             │
│ [CLIKABLE ENTIER = ouvrir] │ ← Pas de boutons visibles (geste naturelle)
│                             │
├─────────────────────────────┤
│ [ENVELOPPE 2]               │
│ ...                         │
└─────────────────────────────┘
```

**Changements clés:**
- Enlever action bar (« Lettres » / « Profil ») → clic enveloppe ouvre
- Flap plus grande (90 vs 54)
- Avatar plus grand (60 vs 42)
- Niveau/stars en accent dorée, pas gris
- État lisible (« À répondre » au lieu de emoji + emoji)

---

### Phase 2: Vue correspondance ouverte (Refonte modal)
```
┌─────────────────────────────┐
│ ← Prénom (15px, centré)     │ ← Pas de header complexe
│ Correspondance privée (10px)│ ← Soustitre léger
├─────────────────────────────┤
│ ★★ Niveau 2                 │ ← Accent doré, valorisé
│ 6 lettres échangées         │ ← Pas de "Mes lettres: X"
│ Révélation photo: 40%       │ ← NOUVEAU: Barre progress directe
├─────────────────────────────┤
│                             │
│ [LETTRE TA LETTRE]          │ ← Pas "Ta lettre"
│ ┌─────────────────────────┐ │
│ │ "Coucou, comment ça..." │ │ ← Cursive légère (font-style)
│ │                         │ │
│ │            — Toi, 13:42 │ │ ← Signature mini
│ └─────────────────────────┘ │
│                             │
│ [LETTRE DE SOPHIE]          │ ← "De [Prénom]"
│ ┌─────────────────────────┐ │
│ │ "Hey! Moi aussi j'aime"│ │
│ │                         │ │
│ │       — Sophie, 13:25   │ │
│ └─────────────────────────┘ │
│                             │
│ [Si niveau 3: PHOTO RÉVÉLÉE]│ ← Intégré dans flux = moment!
│ ┌─────────────────────────┐ │
│ │ [Photo original, pas    │ │
│ │  blurred]               │ │
│ │ ★ Sa photo              │ │ ← Label simple
│ └─────────────────────────┘ │
│                             │
│ [INPUT]                     │ ← Ou simplement "Écrire..."
│ "Écrivez votre réponse..."  │
├─────────────────────────────┤
│ [➤ Envoyer] (44h bouton)    │
└─────────────────────────────┘
```

**Changements clés:**
- Enlever header dark + 2 banners (relation + turn) → intégrer smooth dans contexte
- Chaque lettre = card papier avec cursive légère (font-style: italic ou fontFamily cursive)
- Signature mini en bas lettre (pas header)
- **NOUVEAU**: Barre progress révélation photo directe (40% / 100%)
- Photo révélée = intégrée dans conversation, pas séparée
- Input minimaliste (placeholder seulement)

---

### Phase 3: Transformation onglets (Optionnel)
**Problème**: 3 onglets web → structure pas immersive

**Option A** (simple): Enlever onglets
- Vue défaut = Correspondances
- Bouton "+" ouvre menu: Journal / Souvenirs / Plus
- Garder Journal + Souvenirs mais au second plan

**Option B** (minimaliste): Garder onglets mais visuellement subtils
- Bottom tab-bar au lieu de haut
- Onglets petits (12px, pas 14px)
- Icons seulement (pas texte)

**Recommandation**: Option A = plus mobile-first

---

## 4. FICHIERS CONCERNÉS

### Frontend
- **`src/screens/LettersScreen.tsx`** → Refonte structure + styles
  - EnvelopeCard: Augmenter flap, avatar, enlever action bar
  - Modal correspondance: Restructurer header, intégrer progress, afficher photo
  - Styles: palette dorée accent, cursive lettres

- **`app/(tabs)/letters.tsx`** → Wrapper (inchangé si enveloppe reste liste)

- **`src/components/PremiumLetterAnimation.tsx`** → Animation enveloppe (amélioration)

- **`src/logic/letterLogic.ts`** → Logique métier (INCHANGÉ)

### Backend
- ✅ **Zéro changement** (API lettres fonctionnelle)

### Assets
- Texture papier filigrane (optionnel, SVG léger)
- Font cursive (Playfair Display ou Caveat, déjà dispo Expo/Web)

---

## 5. PLAN D'IMPLÉMENTATION MINIMAL

### Étape 1 (Jour 1) — Refonte liste
1. EnvelopeCard: hauteur flap 90 → 54 (augmenter)
2. Avatar 60 ← 42
3. Enlever action bar (`actionBar`, `actionLeft`, `actionRight` styles)
4. Rendre enveloppe entière cliquable (TouchableOpacity wrapping)
5. Niveau/stars: couleur dorée (#D4A862 ← #B87333)
6. État: texte simple au lieu de emojis multiples

**Temps**: 1-2h

### Étape 2 (Jour 2) — Refonte correspondance
1. Header modal: simplifier (juste prénom + "Correspondance privée")
2. Enlever relationBanner + turnBanner
3. LetterCard: ajouter cursive (fontStyle: 'italic', fontFamily cursive optionnel)
4. LetterCard: signature mini en bas (pas header)
5. NOUVEAU: Barre progress révélation photo (40% / 100%) — SimpleBar
6. Photo révélée: intégrer après dernière lettre (pas modal séparé)

**Temps**: 2-3h

### Étape 3 (Optionnel, Jour 3) — Animations
1. Glisser enveloppe ouverture (Animated.View, translateX)
2. Fade-in photo révélation
3. Pulse effect sur sceau non-lu

**Temps**: 1h

---

## 6. RISQUES & MITIGATIONS

| Risque | Probabilité | Mitigation |
|--------|------------|-----------|
| **Espace insuffisant** pour 60px avatar + nom + level | Medium | Layout vertical au lieu horizontal (lisible mobile) |
| **Cursive lettres** = illisibilité | Low | Font-style: italic seulement (pas font change) |
| **Photo révélée** double affichage (ailleurs + ici) | Medium | Vérifier logique RelationEngine + photo API |
| **Onglets** confusion après enlèvement | Low | Garder bottom nav ou drawer menu |
| **Performance** scroll long liste enveloppes | Low | Déjà optimisé (FlatList ready) |
| **Mobile vs Desktop** layout différent | Low | Prioriser mobile (max-width breakpoint optionnel) |

---

## 7. CE QUI RESTE INCHANGÉ

✅ **Backend API** — Zéro changement  
✅ **Logique d'envoi lettres** (alternance A ↔ B)  
✅ **Système photo reveal** (niveaux 0-3)  
✅ **Store Zustand** (lettres, matches)  
✅ **Jeu des 3 questions** (modal séparé OK)  
✅ **Journal + Souvenirs** (feature moins importante)  

---

## 8. RÉSUMÉ POUR DÉVELOPPEMENT

### UX = Moins web, plus intime
- Enlever UI compacte → espace respiration
- Enlever banners tech → contexte émotionnel
- Ajouter progression visuelle → sens accomplissement

### UI = Papier + Cursive + Dorée
- Agrandir enveloppe/avatar
- Cursive légère pour lettres
- Accent dorée pour niveaux
- Intégrer photo révélée dans flux

### Mobile-first
- Geste naturelle (clic = ouvre)
- Pas d'affordances confuses (action bar)
- Scroll vertical privilégié

---

**Prochaine étape**: Valider direction → Commencer Étape 1 (Jour 1)

