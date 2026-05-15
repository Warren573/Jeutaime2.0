# Wireframe LettersScreen — Proposition Basse Fidélité V2
**Date**: 2026-05-15  
**Objectif**: Améliorer UX sans casser fonctionnalité  
**Approche**: Évolution (pas révolution)

---

## ÉTAT ACTUEL — Ce qui fonctionne ✅

```
┌─────────────────────┐
│ Header + Onglets    │  ← Fonctionne, garder
├─────────────────────┤
│ [Enveloppe card]    │  ← Compact, lisible, clikable
│ - Flap (54px)       │
│ - Avatar (42px)     │
│ - Nom + statut      │
│ - Boutons Lettres/P │  ← UTILE, garder
├─────────────────────┤
│ [Enveloppe 2...]    │
│ [Enveloppe 3...]    │
└─────────────────────┘

Modal ouverture:
├─────────────────────┐
│ Header + Nom        │
│ Banners (relation)  │
│ Messages scrollable │
│ Input + Bouton send │
└─────────────────────┘
```

**Problèmes actuels**:
- Dashboard-like (listes compactes)
- Photo reveal invisible dans flux lettres
- Pas de progression visuelle des niveaux 0-3
- Banners techniques (relation level, turn state) peu utiles

---

## PROPOSITION V2 — Wireframe textuel

### ZONE 1: HEADER (inchangé, concis)
```
┌────────────────────────────────────────┐
│  ← JEUTAIME                            │
│  📬 Mes correspondances                │
│  Correspondances privées               │
└────────────────────────────────────────┘
```
**Changements**: Aucun (fonctionne bien)

---

### ZONE 2: PROGRESSION PHOTO (NOUVEAU — intégré liste)
```
┌────────────────────────────────────────┐
│  Révélation photo progressives         │  ← Label simple
│  ████████░░░░░░ 60%                    │  ← Barre visuelle
│  Niveau 2 — Tendre                     │  ← Sentiment + étape
│                                        │
│  Prochain déverrouillage: 4 lettres   │  ← CTA doux
│  (actuellement: 6 / 10 lettres)       │
└────────────────────────────────────────┘
```

**Détails**:
- Barre progress: width 100%, height 6px, background #E8D9C6, fill color #D4A862
- Texte: taille 12-14px, color #8B6F47
- Visible SEULEMENT dans la liste (pas de modal nécessaire)
- Mis à jour en temps réel à chaque lettre envoyée/reçue

---

### ZONE 3: LISTE ENVELOPPES (légèrement améliorée)

**Structure enveloppe simplifiée:**
```
┌────────────────────────────────────────┐
│ Flap (54px — petit, fonctionnel)       │
│ [Sceau: ⚜️ ou ✉️]                     │
├────────────────────────────────────────┤
│ Avatar (42px)  │ Nom: Sophie           │  ← Hiérarchie claire
│                │ Dernier: "Salut..."   │
│                │ 13:42                 │
│                │ ★ Niveau 2 — Tendre  │  ← Gold, lisible
│                │                       │
│ [Non-lu: badge 20px, gold]  →          │  ← Accent doré
├────────────────────────────────────────┤
│ [📬 Ouvrir]  [👤 Profil] [⋮ Plus]     │  ← Actions simples
└────────────────────────────────────────┘

Espacements:
- Entre enveloppes: 12px (compact mais aéré)
- Padding interne: 12px (garder)
- Gap info: 10px (garder)
```

**Changements subtils**:
- Preview texte: 2 lignes au lieu de 1 → plus de contexte
- Niveau/stars: Gold accent (#D4A862) au lieu de gris
- Badges non-lu: Gold au lieu de rouge (moins agressif)
- Avatar: 42px (garder, pas d'agrandissement)
- Action bar: Garder complète (3 boutons simples: Ouvrir, Profil, Menu)

---

### ZONE 4: ACTIONS (inchangées, clarifiées)

```
┌────────────────────────────────────────┐
│ [📬 Ouvrir lettres]  [👤 Profil]      │
│                      [⋮ Menu]          │
│                                        │
│ Actions claires et espacées             │
│ Boutons: 44px min (touch-friendly)      │
│ Labels: 13px, contraste OK              │
└────────────────────────────────────────┘
```

**Changements**:
- Garder les 3 actions
- Améliorer spacing entre eux (gap: 8px)
- Icons + texte (clair, pas ambigus)
- Menu (⋮) pour actions secondaires si besoin

---

### ZONE 5: MODAL — Ouverture lettre (amélioration claire)

**Actuellement**:
```
┌─────────────────────────┐
│ Header (dark)           │
│ Banners (relation)      │  ← Techniques, peu utiles
│ Messages               │
│ Input                 │
└─────────────────────────┘
```

**Proposé — Toujours modal, mais plus clair**:
```
┌─────────────────────────┐
│ ← Prénom                │  ← Simple, centré
│ Niveau 2 — Tendre  ★★  │  ← Gold, valorisé
├─────────────────────────┤
│ [PROGRESSION PHOTO]     │  ← Barre visuelle
│ ████████░░ 60% → +4    │
│                        │
│ [Photo RÉVÉLÉE si L3]   │  ← SI niveau 3, afficher
│ [La photo de Sophie]    │
├─────────────────────────┤
│ Message 1               │
│ "Coucou Sophie..."      │
│                        │
│ Message 2               │
│ "Salut! Comment ça?"    │
│                        │
│ Message 3 (si nouveau)  │
│ [Nouvelle lettre reçue] │
├─────────────────────────┤
│ Input: "Écrivez..."     │
│ [➤ Envoyer]            │  ← Gold button
└─────────────────────────┘
```

**Changements clés**:
- Enlever banners techniques (relation level, turn state)
- Ajouter barre progress photo (visuelle, claire)
- Intégrer photo révélée directement dans modal
- Photos: Si niveau 3 → image originale, sinon blurred
- Couleurs: Gold accents au lieu de rouge
- Typography: Progression lisible (Niveau X — Sentiment)

---

## COMPARAISON — Avant vs Après

| Aspect | Avant | Après | Impact |
|--------|-------|-------|--------|
| **Enveloppe** | 54px, compact | 54px, même | ✅ Pas de changement |
| **Avatar** | 42px | 42px | ✅ Inchangé |
| **Actions** | Lettres/Profil | Lettres/Profil/Menu | ✅ Amélioré, plus clair |
| **Photo reveal** | Invisible dans liste | Barre progress visible | ✅ Plus transparente |
| **Couleurs** | Rouge #8B2E3C | Gold #D4A862 | ✅ Plus doux |
| **Hiérarchie** | Compacte | Plus espacée | ✅ Plus lisible |
| **Dashboard feel** | Listé dense | Respiration ajoutée | ✅ Plus humain |

---

## STRUCTURE FICHIER — Zones à modifier

### Frontend
**`src/screens/LettersScreen.tsx`**:
1. **Enveloppe card** → styles inchangés (shape OK)
2. **Liste** → Ajouter barre progress révélation photo AVANT les enveloppes
3. **Colors** → Accent: Red (#8B2E3C) → Gold (#D4A862) [subtle]
4. **Modal** → Enlever banners, ajouter photo intégrée
5. **Actions bar** → Clarifier layout (pas de suppression)

### Assets
- Texture papier (optionnel)
- Barre progress SVG (simple, 6px)

---

## AVANTAGES V2

✅ **Fonctionnalité préservée**:
- Profil: accessible (bouton clair)
- Lettres: ouverture directe (bouton clair)
- Actions: visibles et utiles

✅ **Ambiance améliorée**:
- Gold au lieu de rouge: plus intime
- Progression visible: sens d'accomplissement
- Photo intégrée: moins déconnecté

✅ **Mobile-friendly**:
- Pas d'enveloppe géante
- Espacement respire
- Touch targets clairs (44px min)
- Scroll vertical naturel

✅ **Pas de rupture**:
- API: inchangée
- Logic: inchangée
- Backend: inchangé

---

## RISQUES — Minimal

| Risque | Mitigation |
|--------|-----------|
| Barre progress non mise à jour en real-time | StateStore watch + refresh |
| Photo intégrée = double affichage | Check if RelationEngine level >= 3 |
| Spacing changes = layout shift | Tested locally avant deploy |

---

## IMPLÉMENTATION SÉQUENCE

### Phase A: Barre progress (non-urgent)
1. Ajouter composant `ProgressBar.tsx` (simple)
2. Calculer progress: (totalLetters / nextLevelThreshold) * 100
3. Afficher avant liste enveloppes
4. Couleur: #D4A862

### Phase B: Couleurs et accents (simple)
1. Badge: #8B2E3C → #D4A862
2. Level text: #B87333 → #D4A862
3. Button: #8B2E3C → #D4A862

### Phase C: Modal améliorée (optionnel)
1. Enlever relationBanner + turnBanner
2. Ajouter photo directement après messages (if level >= 3)
3. Ajouter progress bar dans modal

---

## RÉSUMÉ VISUEL

**Actuellement**: Dashboard dense, fonctionnel mais froid
**Avec V2**: Même structure, mais respire + progression claire + photo intégrée = intime sans casser

**Métaphore**: 
- Avant: Excel sheet de correspondances
- Après: Carnet privé avec lettres et photos révélées progressivement

