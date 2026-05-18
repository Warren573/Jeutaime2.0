# JeuTaime 2.0 — Product Policy & Technical Charter

**Date:** 2026-05-18
**Status:** Active (Gel complet jusqu'à Phase 5)
**Horizon:** Web-first stabilization → Mobile cloud-first (later)

---

## Core Decision

**No mobile migration now.**

We stabilize and complete JeuTaime 2.0 as a cohesive web application (Expo web, staging) before considering any cloud-first mobile architecture.

---

## Execution Order (Strict)

### Phase 1: Security ✅
**Status:** Complete (PR #71 pending review)
- Break match / Rompre relation
- Block user / Bloquer utilisateur  
- Report user / Signaler utilisateur
- Enforce communication block after break/block
- Backend tests: 15/15 constraints verified

**Merge target:** main
**Deploy target:** staging

---

### Phase 2: Core Relation ⏳
**Scope:** User relationship flows
- Discovery / Découverte
- Match creation / Création de match
- Setup questions / Questions de validation
- Letters / Lettres (existing, refine)
- Photo reveal (levels 0-3, existing, refine)

**Gates before Phase 3:**
- All core flows tested end-to-end
- No critical bugs on staging
- Photo reveal verified at all levels
- Questions validation working
- Letter alternation enforced

---

### Phase 3: Economy
**Scope:** Wallet & game mechanics
- Wallet system / Portefeuille
- Coins / Pièces (earn/spend)
- Card game / Jeu des cartes
- Points & progression

**Gates before Phase 4:**
- Wallet balances verified
- Card game balanced
- No exploits (balance validation)
- Earn/spend flows complete

---

### Phase 4: Social
**Scope:** Community features
- Salons / Lounges
- Bouteille à la mer / Message bottle
- User interactions in salons
- Social discovery

**Gates before Phase 5:**
- Salon moderation working
- Spam/abuse controls in place
- Social flows non-blocking to core relation

---

### Phase 5: Notifications & Premium
**Scope:** Engagement & monetization
- Push notifications
- In-app notifications
- Premium tier (locked features)
- Subscription logic

**Final gates:**
- All notifications delivered
- Premium features gated correctly
- No payment/subscription bugs

---

## Forbidden (Until Phase 5 Complete)

🚫 **Design & Architecture**
- Redesign / Refonte UI (no visual changes beyond bug fixes)
- Refonte globale / major structural changes
- New design system / Nouveau système de design
- Component library rewrites

🚫 **Platform & Infrastructure**
- Flutter migration
- React Native mobile toolchain
- EAS / Expo managed services for mobile build
- Cloud-first architecture planning
- Mobile-first strategy or roadmap

🚫 **Scope Expansion**
- New feature ideas outside Phase 1-5
- Bonus mechanics or gamification
- Premium tiers beyond basic monetization
- Community moderation dashboards
- Admin panels

🚫 **Tech Debt (until stable)**
- Major refactoring
- Architecture redesigns
- Pattern migrations
- Test coverage expansions
- Documentation overhauls

---

## Allowed (In Order)

✅ **Bug fixes** — Any phase
✅ **Performance tweaks** — Any phase (if non-blocking)
✅ **Security fixes** — Any phase (critical priority)
✅ **Stability improvements** — Any phase
✅ **Test additions** — Current phase only
✅ **API improvements** — Current phase, if required
✅ **Minimal UI fixes** — Current phase (no redesign)

---

## Platform Target

**Now:** Web (Expo web, staging, browsers)
**Later (Post Phase 5):** Evaluate mobile architecture

**Why now?**
- Faster iteration
- Easier testing
- No mobile toolchain complexity
- Clear web baseline

**Why later?**
- Stable core validates assumptions
- Mobile strategy informed by real usage
- Better UX/DX decisions
- Cleaner migration path

---

## Review & Approval Criteria

### Before Merge
1. Code matches current phase order
2. No feature creep (scope verified)
3. No design changes (unless bug fix)
4. Backend tests pass
5. No new dependencies (unless unavoidable)
6. Documentation updated

### Before Deploy to Staging
1. All tests pass (backend + frontend)
2. Manual QA on target phase
3. No regressions on other phases
4. Performance acceptable

---

## Decision Record

**Why no mobile now?**
- Adds toolchain complexity (EAS, Flutter, etc.)
- Requires platform-specific testing
- Distracts from core stability
- Mobile decisions better informed after validation
- Web allows faster iteration

**Why web-first?**
- Simpler codebase (single platform)
- Faster feedback loops
- Easier debugging
- Clear baseline for mobile port later
- Proven pattern (Twitter, Slack started web)

**Why this order?**
1. Security first = enables other flows safely
2. Core relation = validates core product
3. Economy = proves monetization
4. Social = growth & retention
5. Notifications = engagement loop closes

---

## Enforcement

**Rejected requests** must cite this document:
> Per PRODUCT_POLICY.md Phase X, this request is out of scope until Phase Y is complete.

**Scope creep** discovered during implementation must be escalated immediately (not coded).

**Phase completion** requires explicit approval before Phase N+1 begins.

---

## Appendix: What "Stable" Means

| Phase | Stable = | Verification |
|-------|----------|---------------|
| **1** | Break/block/report + no communication after | Automated tests + manual flow |
| **2** | Discovery→Match→Letters→Photo reveal works end-to-end | Full user journey tested |
| **3** | Wallet balances correct, no exploits | Balance audit, transaction tests |
| **4** | Salons work, moderation enforced | Social flow tests, anti-spam verified |
| **5** | Notifications sent, premium gates enforced | Notification delivery tested, purchase flow verified |

**Staging sign-off before main merge required for each phase.**

---

## Questions?

This policy is binding for all feature development until Phase 5 completion.
Exceptions require product leadership approval (documented in git commit).

Last updated: 2026-05-18
