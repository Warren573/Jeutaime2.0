# Direction B Refined — Low-Fidelity Mobile Wireframe
**Modern Intimate Mystery | Warm Cream + Burgundy + Discreet Gold**

---

## SCREEN 1: LETTERS LIST

```
┌─────────────────────────────────────┐
│ (Warm cream bg: #FFFBF5)            │
│                                     │
│         correspondances             │ ← Light serif, centered
│      Vos connexions intimes         │ ← Subtitle, gray
│                                     │
├─────────────────────────────────────┤
│                                     │
│  6/10 lettres avec Sophie           │ ← Soft info text
│  ─────────────────────────────────  │ ← Thin divider
│  [████████░░░░░░] 60%               │ ← Thin bar, warm gold fill
│                                     │
├─────────────────────────────────────┤
│                                     │
│  SOPHIE                             │ ← Centered, serif, medium
│  ───────────────────────────────    │ ← Subtle divider
│                                     │
│  "Nouvelle lettre reçue"            │ ← Preview text, italic
│                                     │
│  [Ouvrir correspondance]            │ ← Button: soft cream bg, burgundy text
│  [👤 Profil]                        │ ← Link, small
│                                     │
├─────────────────────────────────────┤
│                                     │
│  MARC                               │ ← Same card structure
│  ───────────────────────────────    │
│                                     │
│  "À vous de répondre"               │
│                                     │
│  [Ouvrir correspondance]            │
│  [👤 Profil]                        │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  LAURA                              │
│  ───────────────────────────────    │
│                                     │
│  "En attente d'acceptation"         │
│                                     │
│  [Accepter] [Voir profil]           │
│                                     │
└─────────────────────────────────────┘

Colors:
- BG: #FFFBF5 (warm cream)
- Text: #3A2818 (dark brown)
- Divider: #D4C4B8 (warm gray)
- Button BG: #FFFBF5 (same as bg, subtle)
- Button Text: #8B3A3A (soft burgundy)
- Bar: #D4A862 (warm gold)

Spacing:
- Top/Bottom: 16px
- Between cards: 12px
- Card padding: 12px
- Line height: 1.6
```

---

## SCREEN 2: OPEN CORRESPONDENCE

```
┌─────────────────────────────────────┐
│ (Warm cream: #FFFBF5)               │
│                                     │
│              SOPHIE                 │ ← Centered, large serif
│          Moment intime              │ ← Subtitle, burgundy accent
│                                     │
│      6/10 lettres échangées         │ ← Progress info
│      [████████░░░░░░] 60%           │ ← Thin gold bar
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Message 1 (received)               │ ← Label, small gray
│                                     │
│  "Coucou! Comment tu vas?           │ ← Natural serif font
│   J'aime beaucoup parler            │ ← Soft line breaks
│   avec toi..."                      │ ← NOT justified
│                          13:42      │ ← Timestamp, right, gray
│                                     │
│                                     │ ← Generous gap (24px)
│                                     │
│  Message 2 (sent)                   │ ← Label, gray
│                                     │
│  "Moi aussi! Continue..."           │ ← Same serif
│                          Toi, 13:00 │ ← Timestamp
│                                     │
│                                     │ ← Generous gap (24px)
│                                     │
│  Message 3 (received)               │
│                                     │
│  "Vraiment? J'en suis très          │
│   heureuse!"                        │
│                           11:30     │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  [👤 Sophie's profile]              │ ← Discreet link, small
│                                     │
├─────────────────────────────────────┤
│                                     │
│  "Write your response..."           │ ← Placeholder, light
│  ───────────────────────────────    │ ← Soft border
│  │                                │ │
│  │ (text input area)              │ │
│  │                                │ │
│  ───────────────────────────────    │
│                                     │
│            [Send]                   │ ← Centered button
│                                     │
└─────────────────────────────────────┘

Colors:
- BG: #FFFBF5 (warm cream)
- Text: #3A2818 (dark brown)
- Subtitle: #8B3A3A (soft burgundy)
- Timestamps: #9A7040 (warm gray)
- Bar: #D4A862 (gold)
- Button: #8B3A3A (burgundy)

Spacing:
- Between messages: 24px (breathing room)
- Message padding: 0px (text only, no cards)
- Line height: 1.7
- Overall: rhythm, not density
```

---

## SCREEN 3: PHOTO REVEAL (State - Level 3)

```
┌─────────────────────────────────────┐
│ (Same as Screen 2, but showing...)  │
│                                     │
│              SOPHIE                 │
│          Révélation complète        │ ← Updated subtitle
│                                     │
│      10/10 lettres échangées ✨    │ ← Updated, with sparkle
│      [██████████] 100%              │ ← Full bar
│                                     │
├─────────────────────────────────────┤
│                                     │
│  [Previous messages scroll above]   │
│                                     │
│                                     │
│                                     │
│  ═════════════════════════════     │ ← Subtle divider before photo
│        (Photo appear here)          │
│                                     │
│      [Clear photo - original]       │ ← No blur, no filter
│      [Not oversized, natural]       │
│      [Width: ~90% of screen]        │ ← Responsive
│                                     │
│          Sophie's photo             │ ← Caption, small, centered
│       (Moment révélé)               │ ← Emotional label, italic
│                                     │
│  ═════════════════════════════     │ ← Subtle divider after photo
│                                     │
├─────────────────────────────────────┤
│                                     │
│  (Input area below, same as before) │
│                                     │
│  "Write your response..."           │
│  ───────────────────────────────    │
│  │ message input                   │
│  ───────────────────────────────    │
│            [Send]                   │
│                                     │
└─────────────────────────────────────┘

Photo Integration:
- Appears naturally between messages and input
- No frame, no border, no glow
- Subtle dividers (═══) above/below
- Caption underneath (descriptive, not technical)
- Responsive: scales to 90% width
- Soft shadow: subtle depth (not dramatic)
- Color: natural (no sepia, no filter)

Updated Elements:
- Subtitle: Changes from "Moment intime" to "Révélation complète"
- Progress: Shows 100%, full bar
- Label: "10/10 lettres" + sparkle emoji (✨)
- Emotional text: "Moment révélé" beneath photo
```

---

## HIERARCHY & SPACING REFERENCE

### Screen 1 (List)
```
Header (16px padding)
      ↓ (8px gap)
Progress area (12px padding)
      ↓ (12px gap)
Card 1
      ↓ (12px gap)
Card 2
      ↓ (12px gap)
Card 3
```

### Screen 2 (Correspondence)
```
Header (16px padding)
      ↓ (8px gap)
Progress area (12px padding)
      ↓ (16px gap)
Messages (24px between each)
      ↓ (16px gap)
Link area (profile)
      ↓ (16px gap)
Input area (12px padding)
```

### Screen 3 (Photo Reveal)
```
[Messages as above]
      ↓ (16px gap)
Divider ═════════════
      ↓ (12px gap)
PHOTO (natural sizing)
      ↓ (4px gap)
Caption (small)
      ↓ (12px gap)
Divider ═════════════
      ↓ (16px gap)
Input area
```

---

## TYPOGRAPHY REFERENCE

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Page title | Serif | 24px | Regular | #3A2818 |
| Subtitle | Serif | 12px | Regular | #8B3A3A |
| Message text | Serif | 16px | Regular | #3A2818 |
| Timestamp | Sans | 11px | Regular | #9A7040 |
| Label | Sans | 12px | Regular | #8B6F47 |
| Button | Sans | 14px | Medium | #FFFBF5 on #8B3A3A |
| Progress info | Sans | 12px | Regular | #8B6F47 |

---

## COLOR PALETTE

```
Primary BG:     #FFFBF5  ← Warm cream (very soft)
Text Primary:   #3A2818  ← Dark brown (readable)
Text Secondary: #8B6F47  ← Warm gray

Accent Burgundy: #8B3A3A  ← Soft burgundy (not harsh)
Accent Gold:     #D4A862  ← Warm gold (discreet)

Borders:        #D4C4B8  ← Warm light gray
Dividers:       #E8DDD1  ← Very subtle
```

---

## MOBILE USABILITY CHECKLIST

✅ **Touch targets:**
- Buttons: 44px minimum height
- Links: 40px minimum height
- Tap area comfortable for thumb

✅ **Readability:**
- Font size: 16px minimum for body text
- Line height: 1.6-1.7 (not cramped)
- Line length: ~60 chars (natural reading)

✅ **Spacing:**
- Generous gaps between messages (24px)
- Breathing room at top/bottom
- No cramping or density

✅ **Navigation:**
- Profile link always visible (Screen 2)
- Back gesture supported
- Input always at bottom (sticky area)

✅ **Visual hierarchy:**
- Clear separation between messages
- Progress bar visible, not intrusive
- Photo focal point (not oversized)

---

## MODERN INTIMATE MYSTERY TONE

**What this achieves:**
- ✨ Warm and inviting (cream + burgundy = cozy)
- 🔍 Mysterious but not dark (soft colors, gentle reveals)
- 📝 Written word is centerpiece (generous spacing)
- 📷 Photo reveal is natural, not theatrical
- 💌 Intimate without being cheesy (no excessive decoration)
- 🎯 Modern (clean fonts, clear structure)

**What it avoids:**
- ❌ Fantasy (no gold glow, no dramatic shadows)
- ❌ Gothic (no dark reds, no ornate details)
- ❌ Luxury casino (no glitz, no excessive styling)
- ❌ Dashboard (no compact tables, no density)
- ❌ Chat app (no message bubbles, no timestamp spam)

---

## IMPLEMENTATION NOTES

**Existing backend preserved:**
- ✅ API calls unchanged
- ✅ Photo reveal logic unchanged (levels 0-3)
- ✅ Letter alternation unchanged
- ✅ Profile link functional

**Design system ready:**
- ✅ Color palette defined
- ✅ Typography specified
- ✅ Spacing rules clear
- ✅ Mobile breakpoints noted (375px minimum)

**Next phase:**
- Visual mockup (Figma/Adobe)
- or CSS implementation
- Photo component integration
- Touch interactions refinement

