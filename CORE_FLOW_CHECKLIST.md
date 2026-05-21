# Core Flow Checklist

**Obligatoire avant chaque merge de PR.**

Chaque PR doit cocher tous ces tests avant approbation.

---

## PR Rules (Non-negotiable)

- [ ] **Une correction fonctionnelle par PR** (pas de cascade)
- [ ] **Max 1-3 fichiers modifiés** (sauf justification explicite)
- [ ] **Aucun redesign**
- [ ] **Aucun refactor**
- [ ] **Aucun ajout de feature non demandé**
- [ ] **Si un fix casse un ancien flow → revert immédiat**

---

## Core Flow Tests (Mandatory)

### 1. Login
- [ ] Compte valide se connecte
- [ ] Page d'accueil affiche sans erreur
- [ ] User est authentifié

### 2. Discovery
- [ ] Profils chargent correctement
- [ ] Au moins 2 profils visibles
- [ ] Statut des profils affichés correctement
- [ ] Navigation entre profils fonctionne

### 3. Smile A→B
- [ ] Compte A envoie un sourire à B
- [ ] Profil B disparaît de la découverte de A
- [ ] Pas d'erreur réseau

### 4. Smile B→A (Mutual)
- [ ] Compte B envoie un sourire à A (mutuel)
- [ ] Match créé (confirmation UI)
- [ ] Profil A disparaît de la découverte de B
- [ ] Pas de doublon de match

### 5. Match Création
- [ ] Match apparaît dans Letters pour A
- [ ] Match apparaît dans Letters pour B
- [ ] Status visible (PENDING ou ACTIVE)
- [ ] Les deux comptes voient le match

### 6. Questions Accessibles
- [ ] Bouton "Jouer aux questions" visible
- [ ] Questions s'ouvrent sans erreur
- [ ] Les 3 questions affichent correctement
- [ ] Réponses se soumettent

### 7. Lettres Accessibles
- [ ] Onglet Lettres fonctionne
- [ ] Conversation visible entre les deux
- [ ] Envoi/réception de lettres fonctionne
- [ ] Statut des lettres correct

### 8. Break Match
- [ ] Bouton "Rompre" accessible
- [ ] Match passe à BROKEN/BROKEN
- [ ] Profil peut réapparaître en découverte
- [ ] Pas d'erreur lors de la rupture

### 9. Relance Match (si applicable)
- [ ] Bouton "Redémarrer" visible si possible
- [ ] Redémarrage fonctionne sans erreur
- [ ] Match redevient ACTIVE

### 10. No Regression
- [ ] Aucun profil matché visible en découverte
- [ ] Aucun message d'erreur en console
- [ ] Pas de crash UI
- [ ] Navigation fluide

---

## Checklist Format for PR

```markdown
## Core Flow Validation

- [ ] Login ✓
- [ ] Discovery ✓
- [ ] Smile A→B ✓
- [ ] Smile B→A (mutual) ✓
- [ ] Match Created ✓
- [ ] Questions Accessible ✓
- [ ] Letters Accessible ✓
- [ ] Break Match ✓
- [ ] No Regressions ✓

**Status:** Ready for merge / Needs fixes
```

---

## What to Do If Tests Fail

1. **Identify which test failed**
2. **Revert the PR immediately** (don't try to patch)
3. **Diagnose root cause offline**
4. **Create new minimal PR** with single fix only
5. **Re-test full checklist**

---

## Never Do

❌ Cascade of fixes  
❌ Multiple unrelated changes in one PR  
❌ Redesign without explicit request  
❌ Refactor "for cleanliness"  
❌ Add features not asked for  
❌ Skip testing before merge  
❌ Assume a fix won't break something

---

## The Rule

**One thing. One PR. Test everything. Ship stable.**
