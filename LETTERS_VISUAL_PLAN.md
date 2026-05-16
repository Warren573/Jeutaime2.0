# LettersScreen — Plan Visuel Simple
**Mobile-first | 375px width**

---

## ZONE 1: HEADER
```
┌─────────────────────────────┐
│ JEUTAIME                    │
│ 📬 Mes correspondances      │
│ Correspondances privées     │
└─────────────────────────────┘
(Inchangé)
```

---

## ZONE 2: PROGRESSION RÉVÉLATION PHOTO
```
┌─────────────────────────────┐
│ Révélation photo            │
│ ████████░░░░░░ 60%          │ ← Barre visuelle
│ Niveau 2 — Tendre           │ ← Label + sentiment
│ +4 lettres pour suivant     │ ← Info claire
└─────────────────────────────┘
(NOUVELLE — Intégrée dans liste)
```

---

## ZONE 3: LISTE LETTRES
```
┌─────────────────────────────┐
│ ┌──────────────────────────┐│
│ │ Flap (54px)              ││
│ │   [⚜️ Sceau]             ││
│ ├──────────────────────────┤│
│ │ [Avatar] Sophie       ①  ││
│ │  Nouvelle lettre reçue   ││
│ │  13:42                   ││
│ │  ★★ Niveau 2 — Tendre   ││
│ └──────────────────────────┘│
│                             │
│ ┌──────────────────────────┐│
│ │ Flap (54px)              ││
│ │   [✉️ Sceau]             ││
│ ├──────────────────────────┤│
│ │ [Avatar] Marc            ││
│ │  À vous de répondre      ││
│ │  2j                      ││
│ │  ★ Niveau 1 — Intéressé ││
│ └──────────────────────────┘│
└─────────────────────────────┘
(Unchanged layout, +gold accents)
```

---

## ZONE 4: ACTIONS
```
┌─────────────────────────────┐
│ [📬 Ouvrir] [👤 Profil]    │
│                             │
│ Boutons clairs, tactiles    │
└─────────────────────────────┘
(Inchangé)
```

---

## ZONE 5: COMPOSER RÉPONSE (Modal)
```
┌─────────────────────────────┐
│ ← Sophie                    │ ← Simple, nom seulement
│ ★★ Niveau 2 — Tendre       │ ← Gold accent
├─────────────────────────────┤
│ ████████░░ 60% → +4 lettres │ ← Progress bar
├─────────────────────────────┤
│ [SI LEVEL 3: PHOTO]         │ ← Integrated if unlocked
│                             │
│ Messages (scroll)           │
│ - Reçu: "Coucou!"          │
│ - Envoyé: "Salut!"         │
│                             │
├─────────────────────────────┤
│ [Input: Écrivez...]         │
│ [➤ Envoyer] (gold button)   │
└─────────────────────────────┘
(Streamlined: no tech banners)
```

---

## SCHÉMA GLOBAL

```
╔═════════════════════════════════╗
║ ZONE 1: Header                  ║
╠═════════════════════════════════╣
║ ZONE 2: Progress bar photo      ║ ← NEW
╠═════════════════════════════════╣
║ ZONE 3: Liste lettres           ║ ← Scroll
║         (enveloppes 54px)       ║
╠═════════════════════════════════╣
║ ZONE 4: Boutons actions         ║
╠═════════════════════════════════╣
║ ZONE 5: Modal (on tap)          ║
║ - Progress bar                  ║ ← NEW
║ - Messages                      ║
║ - Photo si level 3              ║ ← NEW (integrated)
║ - Input composer                ║
╚═════════════════════════════════╝
```

---

## CHANGEMENTS MINIMES

| Quoi | Avant | Après |
|------|-------|-------|
| Enveloppe | 54px | 54px (inchangé) |
| Avatar | 42px | 42px (inchangé) |
| Actions | 2 boutons | 2 boutons (inchangé) |
| Progress | Invisible | Barre visible |
| Photo reveal | Séparée | Intégrée modal |
| Accent | Rouge | Or (doux) |
| Hiérarchie | Dense | Espacée |

---

## MOBILE FIRST ✓

- 375px portrait = tout visible
- Pas d'enveloppe géante
- Scroll vertical naturel
- Touch targets 44px
- Respiration: spacing + progress bar

---

## FONCTIONNALITÉ PRÉSERVÉE ✓

- ✓ Profil: accès bouton
- ✓ Lettres: ouverture directe
- ✓ Actions: visibles et claires
- ✓ API/Backend: inchangés
- ✓ Logic: inchangée
- ✓ Photo reveal: même système

