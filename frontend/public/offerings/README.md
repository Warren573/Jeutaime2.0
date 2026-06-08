# Assets Offrandes - PNG Structure

## Naming Convention

Pour chaque offrande, créer 3 fichiers PNG correspondant aux 3 stages de consommation:

```
/offerings/{offeringId}_stage1.png  (consumptionCount = 0, currentStage = 1)
/offerings/{offeringId}_stage2.png  (consumptionCount = 1, currentStage = 2)
/offerings/{offeringId}_stage3.png  (consumptionCount = 2, currentStage = 3)
```

## MVP Offerings

### Bière (off_biere)
```
/offerings/off_biere_stage1.png    (Bière neuve)
/offerings/off_biere_stage2.png    (Bière entamée)
/offerings/off_biere_stage3.png    (Verre vide)
```

**Propriétés:**
- Emoji fallback: 🍺
- Action: BOIRE
- ConsumptionMode: SHARED (anyone in salon can consume)
- Cost: 30 coins

### Rose (off_rose)
```
/offerings/off_rose_stage1.png     (Rose fraîche)
/offerings/off_rose_stage2.png     (Rose qui se fane)
/offerings/off_rose_stage3.png     (Rose séchée)
```

**Propriétés:**
- Emoji fallback: 🌹
- Action: ADMIRER
- ConsumptionMode: PRIVATE (only recipient can consume)
- Cost: 50 coins

### Hamburger (off_hamburger)
```
/offerings/off_hamburger_stage1.png   (Hamburger entier)
/offerings/off_hamburger_stage2.png   (Hamburger mordillé)
/offerings/off_hamburger_stage3.png   (Assiette vide)
```

**Propriétés:**
- Emoji fallback: 🍔
- Action: MANGER
- ConsumptionMode: SHARED (anyone in salon can consume)
- Cost: 35 coins

## Integration Flow

1. **Frontend** appelle `getSalonOfferings(salonId)`
2. **Backend** retourne liste de `SalonOfferingDTO` avec:
   - `offeringId` (ex: "off_biere")
   - `currentStage` (1, 2, ou 3)
   - `consumptionMode` (PRIVATE ou SHARED)
   - `lastConsumedBy` (userId de dernier consommateur)
3. **OfferingBadge component** cherche:
   - `/offerings/{offeringId}_stage{currentStage}.png`
   - Fallback: emoji si fichier manquant
4. **ConsumptionActionButton** permet consommer si:
   - `isActive` = true
   - `consumptionCount` < 3 (pas disparu)
   - `consumptionMode` = SHARED OU `userId` = `toUserId`

## Future Extensions

Pour ajouter les 54 offrandes, créer 3 fichiers PNG par offrande:

```bash
# Bière déjà existe
/offerings/off_biere_stage1.png
/offerings/off_biere_stage2.png
/offerings/off_biere_stage3.png

# Rose déjà existe
/offerings/off_rose_stage1.png
/offerings/off_rose_stage2.png
/offerings/off_rose_stage3.png

# Hamburger déjà existe
/offerings/off_hamburger_stage1.png
/offerings/off_hamburger_stage2.png
/offerings/off_hamburger_stage3.png

# À ajouter: 51 autres offerings × 3 stages = 153 fichiers
/offerings/off_champagne_stage1.png
/offerings/off_champagne_stage2.png
/offerings/off_champagne_stage3.png
# ... etc
```

## Configuration

Ajouter chaque nouvelle offrande dans `/frontend/src/config/offeringConfig.ts`:

```typescript
export const OFFERING_CONFIG: Record<string, OfferingConfig> = {
  off_biere: {
    id: 'off_biere',
    action: 'BOIRE',
    label: 'Boire',
    consumptionMode: 'SHARED',
  },
  // Nouvelle offrande:
  off_champagne: {
    id: 'off_champagne',
    action: 'DEBOUCHER', // ou autre
    label: 'Déboucher',  // Libellé bouton
    consumptionMode: 'SHARED',
  },
  // ... etc
};
```

## Size Recommendations

- Badge display: 28×28px (recommandé au minimum 64×64px PNG source)
- Modal detail: 128×128px (recommandé au minimum 256×256px PNG source)
- Compression: PNG optimisé (pngquant, oxipng, ou équivalent)

## Fallback Behavior

Si PNG manquant ou erreur de chargement:
1. Affiche emoji correspondant
2. Aucune erreur console
3. Interface reste responsive
4. Bouton action fonctionne normalement
